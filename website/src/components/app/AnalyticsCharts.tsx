"use client";

/**
 * AnalyticsCharts — Recharts wrappers for the HashView business dashboard.
 * Uses the brand color palette: primary #210059, secondary #FC8603, accent #d651f3
 */

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
} from "recharts";

// ─── Brand palette ────────────────────────────────────────────────────────────

export const BRAND_COLORS = {
  primary: "#7c3aed",   // violet-600 (readable on dark bg)
  secondary: "#FC8603", // orange
  accent: "#d651f3",    // magenta
  success: "#10B981",
  info: "#3B82F6",
  muted: "#94a3b8",
};

const CHART_COLORS = [
  BRAND_COLORS.primary,
  BRAND_COLORS.secondary,
  BRAND_COLORS.accent,
  BRAND_COLORS.success,
  BRAND_COLORS.info,
];

// ─── Tooltip styles ───────────────────────────────────────────────────────────

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl shadow-xl px-3 py-2.5 text-sm">
      {label && <p className="font-medium text-foreground mb-1.5">{label}</p>}
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground capitalize">{p.name}:</span>
          <span className="font-semibold text-foreground">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Visits Bar Chart ─────────────────────────────────────────────────────────

interface VisitsChartProps {
  data: { label: string; visits: number }[];
  height?: number;
}

export function VisitsBarChart({ data, height = 220 }: VisitsChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(124,58,237,0.08)" }} />
        <Bar
          dataKey="visits"
          fill={BRAND_COLORS.primary}
          radius={[6, 6, 0, 0]}
          maxBarSize={40}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Rating Trend Line Chart ──────────────────────────────────────────────────

interface RatingChartProps {
  data: { label: string; rating: number; count?: number }[];
  height?: number;
}

export function RatingTrendChart({ data, height = 220 }: RatingChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
        <defs>
          <linearGradient id="ratingGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={BRAND_COLORS.secondary} stopOpacity={0.3} />
            <stop offset="95%" stopColor={BRAND_COLORS.secondary} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[0, 5]}
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="rating"
          stroke={BRAND_COLORS.secondary}
          strokeWidth={2.5}
          fill="url(#ratingGrad)"
          dot={{ fill: BRAND_COLORS.secondary, r: 3, strokeWidth: 0 }}
          activeDot={{ r: 5, fill: BRAND_COLORS.secondary }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Coupon Redemption Bar Chart ──────────────────────────────────────────────

interface CouponChartProps {
  data: { label: string; redeemed: number; issued?: number }[];
  height?: number;
}

export function CouponRedemptionChart({ data, height = 200 }: CouponChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(252,134,3,0.08)" }} />
        <Bar dataKey="redeemed" fill={BRAND_COLORS.secondary} radius={[6, 6, 0, 0]} maxBarSize={36} />
        {data[0]?.issued !== undefined && (
          <Bar dataKey="issued" fill={BRAND_COLORS.primary} radius={[6, 6, 0, 0]} maxBarSize={36} />
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Rating Breakdown Pie ─────────────────────────────────────────────────────

interface RatingBreakdownProps {
  data: { name: string; value: number }[];
  height?: number;
}

export function RatingBreakdownPie({ data, height = 200 }: RatingBreakdownProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={75}
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((_, index) => (
            <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0];
            return (
              <div className="bg-card border border-border rounded-xl shadow-xl px-3 py-2 text-sm">
                <p className="font-medium text-foreground">{d.name}</p>
                <p className="text-muted-foreground">{d.value} reviews</p>
              </div>
            );
          }}
        />
        <Legend
          formatter={(value) => (
            <span style={{ fontSize: 11, color: "#94a3b8" }}>{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
