import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  BarChart3, Users, Building2, Star, TrendingUp, RefreshCw,
  Search, Filter, Calendar, ChevronLeft, ChevronRight,
  Award, Clock, Activity, Zap, Medal, Crown
} from 'lucide-react';
import { adminApi } from '../api/adminApi';
import { formatDistanceToNow, format } from 'date-fns';

// ── Helpers ────────────────────────────────────────────────────────────────────

const RANK_STYLES = [
  { badge: '🥇', bg: 'from-yellow-50 to-amber-50', border: 'border-yellow-200', text: 'text-yellow-700', num: 'bg-yellow-400 text-yellow-900' },
  { badge: '🥈', bg: 'from-gray-50 to-slate-50',   border: 'border-gray-200',   text: 'text-gray-600',   num: 'bg-gray-400 text-gray-900' },
  { badge: '🥉', bg: 'from-orange-50 to-amber-50', border: 'border-orange-200', text: 'text-orange-700', num: 'bg-orange-400 text-orange-900' },
];

const SORT_OPTIONS = [
  { value: 'reviewCount',  label: 'Most Reviews' },
  { value: 'lastActivity', label: 'Recent Activity' },
  { value: 'businessName', label: 'Business Name A–Z' },
];

// ── Animated counter ───────────────────────────────────────────────────────────
function useCountUp(target, duration = 800) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!target) { setCount(0); return; }
    let start = 0;
    const step = Math.ceil(target / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(start);
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return count;
}

// ── Skeleton ───────────────────────────────────────────────────────────────────
function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      {[1,2,3].map(i => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-2.5 w-1/3" />
          </div>
          <Skeleton className="h-6 w-12 rounded-full" />
        </div>
      ))}
    </div>
  );
}

// ── Stat Card ──────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, loading }) {
  const animated = useCountUp(loading ? 0 : value);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
        {loading
          ? <Skeleton className="h-7 w-16 mt-1" />
          : <p className="text-2xl font-bold text-gray-900">{animated.toLocaleString()}</p>
        }
      </div>
    </div>
  );
}

// ── Activity Indicator ─────────────────────────────────────────────────────────
function ActivityDot({ lastReviewAt }) {
  const daysAgo = lastReviewAt
    ? (Date.now() - new Date(lastReviewAt).getTime()) / (1000 * 60 * 60 * 24)
    : 999;
  if (daysAgo <= 7)  return <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" title="Active in last 7 days" />;
  if (daysAgo <= 30) return <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" title="Active in last 30 days" />;
  return <span className="w-2 h-2 rounded-full bg-gray-300 inline-block" title="Inactive" />;
}

// ── Reviewer Row ───────────────────────────────────────────────────────────────
function ReviewerRow({ reviewer, rank }) {
  const style = RANK_STYLES[rank] || null;
  const initials = (reviewer.name || '?').charAt(0).toUpperCase();

  return (
    <div className={`flex items-center gap-3 py-2.5 px-3 rounded-xl transition-all
      ${style ? `bg-gradient-to-r ${style.bg} border ${style.border}` : 'hover:bg-gray-50'}`}
    >
      {/* Rank badge */}
      <div className="w-7 flex items-center justify-center flex-shrink-0">
        {rank < 3
          ? <span className="text-lg leading-none">{style.badge}</span>
          : <span className="text-xs font-bold text-gray-400">#{rank + 1}</span>
        }
      </div>

      {/* Avatar */}
      <div className="relative flex-shrink-0">
        {reviewer.avatar
          ? <img src={reviewer.avatar} alt={reviewer.name} className="w-8 h-8 rounded-full object-cover border border-gray-200" />
          : (
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
              style={{ background: `hsl(${(reviewer.name?.charCodeAt(0) || 65) * 5 % 360}, 60%, 55%)` }}>
              {initials}
            </div>
          )
        }
        <ActivityDot lastReviewAt={reviewer.lastReviewAt} />
      </div>

      {/* Name + last reviewed */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{reviewer.name}</p>
        {reviewer.lastReviewAt && (
          <p className="text-xs text-gray-400 truncate">
            {formatDistanceToNow(new Date(reviewer.lastReviewAt), { addSuffix: true })}
          </p>
        )}
      </div>

      {/* Review count badge */}
      <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex-shrink-0
        ${rank === 0 ? 'bg-yellow-100 text-yellow-800' : rank === 1 ? 'bg-gray-100 text-gray-700' : rank === 2 ? 'bg-orange-100 text-orange-700' : 'bg-indigo-50 text-indigo-700'}`}>
        {reviewer.reviewCount} {reviewer.reviewCount === 1 ? 'review' : 'reviews'}
      </span>
    </div>
  );
}

// ── Business Leaderboard Card ──────────────────────────────────────────────────
function BusinessCard({ business, style, delay = 0 }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  const isRecentlyActive = business.lastActivityAt &&
    (Date.now() - new Date(business.lastActivityAt).getTime()) < 7 * 24 * 60 * 60 * 1000;

  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden
      transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>

      {/* Card header */}
      <div className="bg-gradient-to-r from-slate-50 to-indigo-50 border-b border-gray-100 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Business logo / initial */}
            {business.businessLogo?.url
              ? <img src={business.businessLogo.url} alt={business.businessName}
                  className="w-10 h-10 rounded-xl object-cover border border-white shadow-sm flex-shrink-0" />
              : (
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                  style={{ background: `hsl(${(business.businessName?.charCodeAt(0) || 65) * 7 % 360}, 55%, 50%)` }}>
                  {business.businessName?.charAt(0) || '?'}
                </div>
              )
            }
            <div className="min-w-0">
              <h3 className="font-bold text-gray-900 truncate text-sm">{business.businessName}</h3>
              {business.businessCategory && (
                <p className="text-xs text-gray-500 truncate capitalize">{business.businessCategory}</p>
              )}
            </div>
          </div>

          {/* Stats pills */}
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span className="px-2.5 py-1 bg-indigo-600 text-white text-xs font-bold rounded-full">
              {business.totalReviews} total
            </span>
            {isRecentlyActive && (
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                Active
              </span>
            )}
          </div>
        </div>

        {/* Sub-stats */}
        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Users size={12} />
            {business.uniqueReviewers} reviewer{business.uniqueReviewers !== 1 ? 's' : ''}
          </span>
          {business.lastActivityAt && (
            <span className="flex items-center gap-1">
              <Clock size={12} />
              Last: {formatDistanceToNow(new Date(business.lastActivityAt), { addSuffix: true })}
            </span>
          )}
        </div>
      </div>

      {/* Reviewer leaderboard */}
      <div className="p-3 space-y-1">
        {business.reviewers?.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No reviewers found</p>
        ) : (
          business.reviewers.map((reviewer, i) => (
            <ReviewerRow key={reviewer.userId?.toString() || i} reviewer={reviewer} rank={i} />
          ))
        )}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
const ReviewAnalytics = () => {
  const [data, setData]               = useState(null);
  const [businesses, setBusinesses]   = useState([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [secondsAgo, setSecondsAgo]   = useState(0);
  const [page, setPage]               = useState(1);

  // Filters
  const [businessFilter, setBusinessFilter] = useState('');
  const [dateFrom, setDateFrom]             = useState('');
  const [dateTo, setDateTo]                 = useState('');
  const [minReviews, setMinReviews]         = useState(1);
  const [sortBy, setSortBy]                 = useState('reviewCount');
  const [userSearch, setUserSearch]         = useState('');

  const pollRef = useRef(null);

  // ── Fetch analytics ──────────────────────────────────────────────────────────
  const fetchAnalytics = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else if (!data) setLoading(true);

    try {
      const params = {
        page, limit: 20, leaderboardLimit: 10,
        sortBy, minReviews,
        ...(businessFilter && { businessId: businessFilter }),
        ...(dateFrom && { dateFrom }),
        ...(dateTo   && { dateTo }),
        ...(isManual && { forceRefresh: true }),
      };

      const res = await adminApi.getReviewAnalytics(params);
      setData(res.data);
      setLastUpdated(Date.now());
      setSecondsAgo(0);
    } catch (err) {
      console.error('Analytics fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, sortBy, minReviews, businessFilter, dateFrom, dateTo, data]);

  // ── Fetch businesses for dropdown ────────────────────────────────────────────
  useEffect(() => {
    adminApi.getAllBusinesses({ limit: 1000 })
      .then(r => setBusinesses(r.data?.businesses || []))
      .catch(() => {});
  }, []);

  // ── Initial fetch + re-fetch on filter/page change ───────────────────────────
  useEffect(() => {
    fetchAnalytics();
  }, [page, sortBy, minReviews, businessFilter, dateFrom, dateTo]);

  // ── 30-second auto-refresh ───────────────────────────────────────────────────
  useEffect(() => {
    pollRef.current = setInterval(() => fetchAnalytics(), 30000);
    return () => clearInterval(pollRef.current);
  }, [fetchAnalytics]);

  // ── "Updated X seconds ago" ticker ──────────────────────────────────────────
  useEffect(() => {
    const tick = setInterval(() => {
      if (lastUpdated) setSecondsAgo(Math.floor((Date.now() - lastUpdated) / 1000));
    }, 1000);
    return () => clearInterval(tick);
  }, [lastUpdated]);

  // ── Client-side user name search filter ─────────────────────────────────────
  const filteredBusinesses = (data?.businesses || []).filter(biz => {
    if (!userSearch.trim()) return true;
    const q = userSearch.toLowerCase();
    return biz.reviewers?.some(r => r.name?.toLowerCase().includes(q));
  });

  const handleFilterChange = (setter) => (val) => {
    setter(val);
    setPage(1);
  };

  const summary = data?.summary || {};

  return (
    <div className="space-y-6 pb-10">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-600 rounded-xl">
              <BarChart3 size={20} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Review Analytics</h1>
          </div>
          <p className="text-gray-500 mt-1 text-sm">
            Per-business reviewer leaderboards · Approved &amp; active reviews only
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Live indicator */}
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-500 shadow-sm">
            <span className={`w-2 h-2 rounded-full ${secondsAgo < 35 ? 'bg-emerald-400 animate-pulse' : 'bg-gray-300'}`} />
            {lastUpdated
              ? `Updated ${secondsAgo}s ago`
              : 'Loading...'
            }
          </div>

          {/* Manual refresh */}
          <button
            onClick={() => fetchAnalytics(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl shadow-sm transition disabled:opacity-60"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Star}      label="Total Reviews"     value={summary.totalReviews}       color="bg-indigo-500"  loading={loading} />
        <StatCard icon={Users}     label="Unique Reviewers"  value={summary.uniqueUserCount}    color="bg-violet-500"  loading={loading} />
        <StatCard icon={Building2} label="Businesses"        value={summary.uniqueBusinessCount} color="bg-sky-500"    loading={loading} />
        <StatCard icon={Activity}  label="Cards Loaded"      value={filteredBusinesses.length}  color="bg-emerald-500" loading={loading} />
      </div>

      {/* ── Filters ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={16} className="text-indigo-600" />
          <h2 className="text-sm font-semibold text-gray-700">Filters</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {/* Business */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Business</label>
            <select
              value={businessFilter}
              onChange={e => handleFilterChange(setBusinessFilter)(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none bg-gray-50"
            >
              <option value="">All Businesses</option>
              {businesses.map(b => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* User search */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Search Reviewer</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Name…"
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none bg-gray-50"
              />
            </div>
          </div>

          {/* Date from */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => handleFilterChange(setDateFrom)(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none bg-gray-50"
            />
          </div>

          {/* Date to */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => handleFilterChange(setDateTo)(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none bg-gray-50"
            />
          </div>

          {/* Sort by + Min reviews row */}
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Sort By</label>
              <select
                value={sortBy}
                onChange={e => handleFilterChange(setSortBy)(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none bg-gray-50"
              >
                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Min Reviews: <span className="font-bold text-indigo-600">{minReviews}</span>
              </label>
              <input
                type="range" min="1" max="20" value={minReviews}
                onChange={e => handleFilterChange(setMinReviews)(parseInt(e.target.value))}
                className="w-full accent-indigo-600"
              />
            </div>
          </div>
        </div>

        {/* Active filter chips */}
        {(businessFilter || dateFrom || dateTo || minReviews > 1 || userSearch) && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
            {businessFilter && (
              <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full flex items-center gap-1">
                📍 {businesses.find(b => b._id === businessFilter)?.name || 'Business'}
                <button onClick={() => handleFilterChange(setBusinessFilter)('')} className="ml-1 hover:text-indigo-900">×</button>
              </span>
            )}
            {userSearch && (
              <span className="px-3 py-1 bg-violet-50 text-violet-700 text-xs font-medium rounded-full flex items-center gap-1">
                👤 "{userSearch}"
                <button onClick={() => setUserSearch('')} className="ml-1 hover:text-violet-900">×</button>
              </span>
            )}
            {(dateFrom || dateTo) && (
              <span className="px-3 py-1 bg-sky-50 text-sky-700 text-xs font-medium rounded-full flex items-center gap-1">
                📅 {dateFrom || '…'} → {dateTo || '…'}
                <button onClick={() => { handleFilterChange(setDateFrom)(''); handleFilterChange(setDateTo)(''); }} className="ml-1 hover:text-sky-900">×</button>
              </span>
            )}
            {minReviews > 1 && (
              <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full flex items-center gap-1">
                ⭐ Min {minReviews} reviews
                <button onClick={() => handleFilterChange(setMinReviews)(1)} className="ml-1 hover:text-emerald-900">×</button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Leaderboard Grid ── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : filteredBusinesses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <BarChart3 size={32} className="text-gray-300" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No data found</h3>
          <p className="text-gray-400 text-sm max-w-xs mx-auto">
            {userSearch
              ? `No reviewer named "${userSearch}" found. Try a different search.`
              : 'No approved reviews match the current filters. Adjust your filters or check back later.'
            }
          </p>
        </div>
      ) : (
        <>
          {/* Result count */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing <span className="font-semibold text-gray-800">{filteredBusinesses.length}</span> business{filteredBusinesses.length !== 1 ? 'es' : ''}
              {data?.total > filteredBusinesses.length && ` of ${data.total}`}
            </p>
            {refreshing && (
              <span className="text-xs text-indigo-600 flex items-center gap-1 animate-pulse">
                <RefreshCw size={12} className="animate-spin" /> Refreshing…
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredBusinesses.map((biz, i) => (
              <BusinessCard key={biz.businessId?.toString() || i} business={biz} delay={i * 60} />
            ))}
          </div>

          {/* ── Pagination ── */}
          {data?.pages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-4">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft size={16} /> Prev
              </button>
              <span className="text-sm text-gray-600">
                Page <span className="font-bold">{page}</span> of <span className="font-bold">{data.pages}</span>
              </span>
              <button
                onClick={() => setPage(p => Math.min(data.pages, p + 1))}
                disabled={page === data.pages}
                className="flex items-center gap-1 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ReviewAnalytics;
