import React, { useState, useEffect } from 'react';
import {
    CheckCircle, XCircle, Clock, Eye, FileText, User,
    Mail, Phone, AlertTriangle, ChevronDown
} from 'lucide-react';
import { adminApi } from '../api/adminApi';

const formatDate = (d) => {
    if (!d) return '—';
    const dt = new Date(d);
    return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        + ', ' + dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

const STATUS_CONFIG = {
    pending: { label: 'Pending', color: 'bg-amber-100 text-amber-800', icon: Clock },
    approved: { label: 'Approved', color: 'bg-green-100 text-green-800', icon: CheckCircle },
    rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800', icon: XCircle },
};

// ── Reject reason modal ───────────────────────────────────────────────────────
const RejectModal = ({ claim, onConfirm, onClose }) => {
    const [reason, setReason] = useState('');
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-red-100 p-2 rounded-full">
                        <XCircle className="text-red-600" size={22} />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900">Reject Claim</h3>
                        <p className="text-sm text-gray-500">{claim?.name}</p>
                    </div>
                </div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Rejection reason <span className="text-gray-400">(shown to the claimant)</span>
                </label>
                <textarea
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    rows={3}
                    placeholder="e.g. Identity documents could not be verified."
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-red-300 focus:outline-none resize-none"
                />
                <div className="flex gap-3 mt-4">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onConfirm(reason || 'Your claim could not be verified.')}
                        className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700"
                    >
                        Reject Claim
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Document viewer modal ─────────────────────────────────────────────────────
const DocModal = ({ doc, onClose }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
        <div className="relative max-w-3xl w-full" onClick={e => e.stopPropagation()}>
            <button
                onClick={onClose}
                className="absolute -top-10 right-0 text-white text-2xl font-bold"
            >&times;</button>
            <img src={doc.url} alt={doc.label} className="w-full rounded-2xl shadow-2xl object-contain max-h-[80vh]" />
            <p className="text-center text-white mt-3 text-sm font-medium">{doc.label}</p>
        </div>
    </div>
);

// ── Claim card ────────────────────────────────────────────────────────────────
const ClaimCard = ({ claim, onApprove, onReject }) => {
    const [expanded, setExpanded] = useState(false);
    const [docModal, setDocModal] = useState(null);

    const status = claim.claimRequest?.status || 'pending';
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    const Ic = cfg.icon;
    const cr = claim.claimRequest;
    const requester = cr?.requestedBy;
    const docs = claim.documents || {};
    const hasDocs = docs.ownerIdProof?.url || docs.selfie?.url;

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-start justify-between p-5">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    {claim.logo?.url ? (
                        <img src={claim.logo.url} alt="" className="w-12 h-12 rounded-xl object-cover border border-gray-100 flex-shrink-0" />
                    ) : (
                        <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-indigo-600 font-bold text-lg">{claim.name?.[0]}</span>
                        </div>
                    )}
                    <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{claim.name}</h3>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{claim.address?.street}, {claim.address?.city}</p>
                        <p className="text-xs text-gray-400 mt-0.5 capitalize">{claim.category}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                    <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.color}`}>
                        <Ic size={12} />
                        {cfg.label}
                    </span>
                    <button
                        onClick={() => setExpanded(v => !v)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        <ChevronDown size={16} className={`text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Expanded details */}
            {expanded && (
                <div className="px-5 pb-5 border-t border-gray-50 pt-4 space-y-4">
                    {/* Claimant */}
                    <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Claimant Details</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="flex items-center gap-2">
                                <User size={14} className="text-gray-400 flex-shrink-0" />
                                <span className="text-sm text-gray-700">{requester?.name || '—'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Mail size={14} className="text-gray-400 flex-shrink-0" />
                                <span className="text-sm text-gray-700 truncate">{requester?.email || '—'}</span>
                            </div>
                            {requester?.phone && (
                                <div className="flex items-center gap-2">
                                    <Phone size={14} className="text-gray-400 flex-shrink-0" />
                                    <span className="text-sm text-gray-700">{requester.phone}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                <FileText size={14} className="text-gray-400 flex-shrink-0" />
                                <span className="text-sm text-gray-700 capitalize">Role: {cr?.role || '—'}</span>
                            </div>
                        </div>
                        {cr?.businessEmail && (
                            <p className="mt-2 text-xs text-gray-500">
                                Business email: <span className="font-medium text-gray-700">{cr.businessEmail}</span>
                            </p>
                        )}
                        {cr?.requestedAt && (
                            <p className="mt-1 text-xs text-gray-400">
                                Submitted: {formatDate(cr.requestedAt)}
                            </p>
                        )}
                    </div>

                    {/* Verification method */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Verification:</span>
                        {cr?.verificationMethod === 'phone' ? (
                            <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full font-medium">
                                📱 Phone OTP {cr.phoneVerified ? '(Verified ✓)' : '(Pending)'}
                            </span>
                        ) : cr?.verificationMethod === 'document' ? (
                            <span className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full font-medium">
                                🪪 Document Upload
                            </span>
                        ) : (
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Not yet verified</span>
                        )}
                    </div>

                    {/* Identity documents */}
                    {hasDocs && (
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Identity Documents</p>
                            <div className="flex gap-3">
                                {docs.ownerIdProof?.url && (
                                    <button
                                        onClick={() => setDocModal({ url: docs.ownerIdProof.url, label: 'Photo ID' })}
                                        className="flex flex-col items-center gap-1 group"
                                    >
                                        <div className="w-24 h-20 rounded-xl overflow-hidden border-2 border-gray-200 group-hover:border-indigo-400 transition-colors">
                                            <img src={docs.ownerIdProof.url} alt="Photo ID" className="w-full h-full object-cover" />
                                        </div>
                                        <span className="text-[10px] text-gray-500 font-medium flex items-center gap-1">
                                            <Eye size={10} /> Photo ID
                                        </span>
                                    </button>
                                )}
                                {docs.selfie?.url && (
                                    <button
                                        onClick={() => setDocModal({ url: docs.selfie.url, label: 'Selfie' })}
                                        className="flex flex-col items-center gap-1 group"
                                    >
                                        <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200 group-hover:border-indigo-400 transition-colors">
                                            <img src={docs.selfie.url} alt="Selfie" className="w-full h-full object-cover" />
                                        </div>
                                        <span className="text-[10px] text-gray-500 font-medium flex items-center gap-1">
                                            <Eye size={10} /> Selfie
                                        </span>
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Rejection reason (if applicable) */}
                    {status === 'rejected' && cr?.rejectionReason && (
                        <div className="flex items-start gap-2 bg-red-50 rounded-xl p-3 border border-red-100">
                            <AlertTriangle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-red-700">
                                <span className="font-bold">Rejection reason: </span>{cr.rejectionReason}
                            </p>
                        </div>
                    )}

                    {/* Actions — only for pending claims */}
                    {status === 'pending' && (
                        <div className="flex gap-3 pt-1">
                            <button
                                onClick={() => onApprove(claim._id)}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-green-600 rounded-xl hover:bg-green-700 transition-colors"
                            >
                                <CheckCircle size={16} /> Approve
                            </button>
                            <button
                                onClick={() => onReject(claim)}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors"
                            >
                                <XCircle size={16} /> Reject
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Doc viewer Modal */}
            {docModal && <DocModal doc={docModal} onClose={() => setDocModal(null)} />}
        </div>
    );
};

// ── Main page ─────────────────────────────────────────────────────────────────
export default function BusinessClaims() {
    const [claims, setClaims] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusTab, setStatusTab] = useState('pending');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [toast, setToast] = useState(null);

    // Reject modal state
    const [rejectTarget, setRejectTarget] = useState(null);

    const limit = 20;

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchClaims = async () => {
        setLoading(true);
        try {
            const res = await adminApi.getBusinessClaims({ status: statusTab, page, limit });
            setClaims(res.data.data || []);
            setTotal(res.data.total || 0);
        } catch (e) {
            console.error(e);
            showToast('Could not load claims.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchClaims(); }, [statusTab, page]);

    const handleApprove = async (businessId) => {
        try {
            await adminApi.reviewBusinessClaim(businessId, 'approved');
            showToast('Claim approved! User has been notified.');
            fetchClaims();
        } catch (e) {
            showToast(e?.response?.data?.message || 'Failed to approve claim.', 'error');
        }
    };

    const handleReject = async (reason) => {
        try {
            await adminApi.reviewBusinessClaim(rejectTarget._id, 'rejected', reason);
            setRejectTarget(null);
            showToast('Claim rejected. User has been notified.');
            fetchClaims();
        } catch (e) {
            showToast(e?.response?.data?.message || 'Failed to reject claim.', 'error');
        }
    };

    const tabs = ['pending', 'approved', 'rejected'];

    return (
        <div className="space-y-6">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white transition-all ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'
                    }`}>
                    {toast.type === 'error' ? <XCircle size={16} /> : <CheckCircle size={16} />}
                    {toast.msg}
                </div>
            )}

            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Business Claims</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Review identity-verified claim requests from users who want to manage a business listing.
                </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
                {tabs.map(t => (
                    <button
                        key={t}
                        onClick={() => { setStatusTab(t); setPage(1); }}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${statusTab === t
                            ? 'bg-white shadow text-gray-900'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        {t}
                    </button>
                ))}
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center h-48">
                    <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : claims.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                    <FileText size={40} className="mb-3 opacity-40" />
                    <p className="font-medium">No {statusTab} claims</p>
                    <p className="text-sm mt-1">Nothing to review right now.</p>
                </div>
            ) : (
                <>
                    <p className="text-sm text-gray-500">{total} claim{total !== 1 ? 's' : ''} found</p>
                    <div className="grid gap-4">
                        {claims.map(claim => (
                            <ClaimCard
                                key={claim._id}
                                claim={claim}
                                onApprove={handleApprove}
                                onReject={setRejectTarget}
                            />
                        ))}
                    </div>

                    {/* Pagination */}
                    {total > limit && (
                        <div className="flex justify-center gap-3 pt-2">
                            <button
                                disabled={page === 1}
                                onClick={() => setPage(p => p - 1)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
                            >
                                ← Prev
                            </button>
                            <span className="px-4 py-2 text-sm text-gray-600">
                                Page {page} of {Math.ceil(total / limit)}
                            </span>
                            <button
                                disabled={page * limit >= total}
                                onClick={() => setPage(p => p + 1)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
                            >
                                Next →
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* Reject Modal */}
            {rejectTarget && (
                <RejectModal
                    claim={rejectTarget}
                    onConfirm={handleReject}
                    onClose={() => setRejectTarget(null)}
                />
            )}
        </div>
    );
}
