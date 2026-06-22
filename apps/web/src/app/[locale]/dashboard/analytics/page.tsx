'use client';

import { useEffect, useState, useRef } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import api from '@/lib/api';

// ── Simple SVG Line Chart ──────────────────────────────────────────────────
interface LineChartProps {
  data: Record<string, any>[];
  lines: { key: string; color: string; label: string }[];
  xKey: string;
  height?: number;
}

function LineChart({ data, lines, xKey, height = 200 }: LineChartProps) {
  const ref = useRef<SVGSVGElement>(null);
  const [w, setW] = useState(600);
  const PAD = { top: 16, right: 16, bottom: 32, left: 48 };

  useEffect(() => {
    const observer = new ResizeObserver(e => setW(e[0].contentRect.width));
    if (ref.current?.parentElement) observer.observe(ref.current.parentElement);
    return () => observer.disconnect();
  }, []);

  if (!data.length) return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>No data</div>;

  const allVals = lines.flatMap(l => data.map(d => d[l.key] ?? 0));
  const maxV = Math.max(...allVals, 1);
  const cw = w - PAD.left - PAD.right;
  const ch = height - PAD.top - PAD.bottom;

  const px = (i: number) => PAD.left + (i / (data.length - 1 || 1)) * cw;
  const py = (v: number) => PAD.top + ch - (v / maxV) * ch;

  const ticks = 4;
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) => Math.round((maxV / ticks) * i));

  const xLabels = data.length <= 10
    ? data.map((d, i) => ({ i, label: d[xKey]?.slice(5) }))
    : [0, Math.floor(data.length / 2), data.length - 1].map(i => ({ i, label: data[i]?.[xKey]?.slice(5) }));

  return (
    <svg ref={ref} width="100%" height={height} style={{ overflow: 'visible' }}>
      {/* Grid */}
      {yTicks.map(v => (
        <g key={v}>
          <line x1={PAD.left} x2={w - PAD.right} y1={py(v)} y2={py(v)} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
          <text x={PAD.left - 6} y={py(v) + 4} textAnchor="end" fill="rgba(255,255,255,0.3)" fontSize={10}>{v}</text>
        </g>
      ))}
      {/* X labels */}
      {xLabels.map(({ i, label }) => (
        <text key={i} x={px(i)} y={height - 4} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize={10}>{label}</text>
      ))}
      {/* Lines */}
      {lines.map(l => {
        const pts = data.map((d, i) => `${px(i)},${py(d[l.key] ?? 0)}`).join(' ');
        return (
          <g key={l.key}>
            <polyline points={pts} fill="none" stroke={l.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {data.map((d, i) => (
              <circle key={i} cx={px(i)} cy={py(d[l.key] ?? 0)} r={data.length <= 15 ? 3 : 0} fill={l.color} />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

// ── Stat Card ──────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color }: { label: string; value: any; sub?: string; color?: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20 }}>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: color || 'white' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

// ── Date Range Presets ─────────────────────────────────────────────────────
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
const today = () => new Date().toISOString().slice(0, 10);

// ── Main Page ──────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Common analytics (merchant)
  const [merchantData, setMerchantData] = useState<any>(null);
  const [days, setDays] = useState(30);

  // Admin filters
  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(today());
  const [gender, setGender] = useState('');
  const [country, setCountry] = useState('');
  const [ageMin, setAgeMin] = useState('');
  const [ageMax, setAgeMax] = useState('');

  const [userStats, setUserStats] = useState<any>(null);
  const [timeSeries, setTimeSeries] = useState<any[]>([]);
  const [storeTimeSeries, setStoreTimeSeries] = useState<any>({ series: [], stores: [] });
  const [usersTable, setUsersTable] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'stores'>('overview');

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      const u = JSON.parse(stored);
      setUser(u);
      setIsAdmin(u.role === 'ADMIN');
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    if (!isAdmin) {
      setLoading(true);
      api.get(`/analytics/store?days=${days}`)
        .then(r => { setMerchantData(r.data); setLoading(false); })
        .catch(() => setLoading(false));
    }
  }, [user, days, isAdmin]);

  useEffect(() => {
    if (!user || !isAdmin) return;
    setLoading(true);
    const params = new URLSearchParams({ from, to });
    if (gender) params.set('gender', gender);
    if (country) params.set('country', country);
    if (ageMin) params.set('ageMin', ageMin);
    if (ageMax) params.set('ageMax', ageMax);
    const groupBy = (new Date(to).getTime() - new Date(from).getTime()) > 60 * 86400_000 ? 'week' : 'day';

    Promise.all([
      api.get(`/admin/analytics/users?${params}`),
      api.get(`/admin/analytics/timeseries?from=${from}&to=${to}&groupBy=${groupBy}`),
      api.get(`/admin/analytics/stores/timeseries?from=${from}&to=${to}`),
      api.get(`/admin/analytics/users/table?${params}`),
    ]).then(([stats, ts, sts, table]) => {
      setUserStats(stats.data);
      setTimeSeries(ts.data);
      setStoreTimeSeries(sts.data);
      setUsersTable(table.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user, isAdmin, from, to, gender, country, ageMin, ageMax]);

  const exportCsv = async () => {
    setExportLoading(true);
    const params = new URLSearchParams({ from, to });
    if (gender) params.set('gender', gender);
    if (country) params.set('country', country);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    const token = localStorage.getItem('token');
    const res = await fetch(`${apiUrl}/admin/analytics/export/csv?${params}`, { headers: { Authorization: `Bearer ${token}` } });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `users-${from}-${to}.csv`; a.click();
    URL.revokeObjectURL(url);
    setExportLoading(false);
  };

  const preset = (d: number) => { setFrom(daysAgo(d)); setTo(today()); };

  const funnelMax = merchantData?.funnel?.impressions || 1;

  // ── Merchant view ──────────────────────────────────────────────────────
  if (user && !isAdmin) {
    const data = merchantData;
    return (
      <div className="flex min-h-screen" style={{ background: '#030712', color: 'white' }}>
        <Sidebar />
        <main className="flex-1 p-4 md:p-8 pb-20 md:pb-8 overflow-y-auto">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Analytics</h1>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>{data?.store?.name} · Last {days} days</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[7, 30, 90].map(d => (
                <button key={d} onClick={() => setDays(d)} style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${days === d ? '#06B6D4' : 'rgba(255,255,255,0.1)'}`, background: days === d ? 'rgba(6,182,212,0.15)' : 'transparent', color: days === d ? '#67E8F9' : 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 13, fontWeight: days === d ? 700 : 400 }}>{d}d</button>
              ))}
            </div>
          </div>
          {loading ? <div style={{ textAlign: 'center', padding: 80, color: 'rgba(255,255,255,0.3)' }}>Loading...</div> : !data ? null : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16, marginBottom: 32 }}>
                <StatCard label="Impressions" value={data.funnel.impressions} color="#67E8F9" />
                <StatCard label="Clicks" value={data.funnel.clicks} color="#f9a8d4" />
                <StatCard label="Redemptions" value={data.funnel.redemptions} color="#fcd34d" />
                <StatCard label="Conversions" value={data.funnel.conversions} color="#6ee7b7" />
                <StatCard label="Roulette Spins" value={data.funnel.rouletteSpins} color="#93c5fd" />
                <StatCard label="Balance" value={`฿${(data.store.balance / 100).toLocaleString()}`} color="#FBBF24" sub="THB" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, marginBottom: 32 }}>
                <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 24 }}>
                  <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Conversion Funnel</h2>
                  {[
                    { label: 'Impressions', value: data.funnel.impressions, color: '#06B6D4' },
                    { label: 'Clicks', value: data.funnel.clicks, color: '#F97316' },
                    { label: 'Redemptions', value: data.funnel.redemptions, color: '#FBBF24' },
                    { label: 'Conversions', value: data.funnel.conversions, color: '#10B981' },
                  ].map(item => (
                    <div key={item.label} style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{item.label}</span>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{item.value}</span>
                      </div>
                      <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3 }}>
                        <div style={{ height: '100%', width: `${funnelMax > 0 ? (item.value / funnelMax) * 100 : 0}%`, background: item.color, borderRadius: 3 }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 24 }}>
                  <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Conversion Rates</h2>
                  {[
                    { label: 'Click-through', value: `${data.rates.clickThrough}%`, color: '#67E8F9' },
                    { label: 'Redemption', value: `${data.rates.redemption}%`, color: '#f9a8d4' },
                    { label: 'Conversion', value: `${data.rates.conversion}%`, color: '#6ee7b7' },
                  ].map(item => (
                    <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, marginBottom: 10 }}>
                      <span style={{ fontSize: 13 }}>{item.label}</span>
                      <span style={{ fontSize: 18, fontWeight: 800, color: item.color }}>{item.value}</span>
                    </div>
                  ))}
                  <div style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 10 }}>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Promo codes used</div>
                    <div style={{ fontWeight: 700 }}>{data.codes.redeemed} / {data.codes.total}</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    );
  }

  // ── Admin view ─────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen" style={{ background: '#030712', color: 'white' }}>
      <Sidebar />
      <main className="flex-1 p-4 md:p-8 pb-20 md:pb-8 overflow-y-auto">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Analytics</h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Platform-wide analytics</p>
          </div>
          <button onClick={exportCsv} disabled={exportLoading} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, color: '#34d399', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            {exportLoading ? '...' : '⬇️ Export CSV'}
          </button>
        </div>

        {/* Filters */}
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '16px 20px', marginBottom: 24 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
            {/* Presets */}
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Period</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[['1d', 1], ['7d', 7], ['30d', 30], ['90d', 90], ['1y', 365]].map(([label, d]) => (
                  <button key={label} onClick={() => preset(+d)} style={{ padding: '6px 10px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>{label}</button>
                ))}
              </div>
            </div>
            {/* Custom range */}
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>From</div>
              <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '6px 10px', color: 'white', fontSize: 12, outline: 'none' }} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>To</div>
              <input type="date" value={to} onChange={e => setTo(e.target.value)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '6px 10px', color: 'white', fontSize: 12, outline: 'none' }} />
            </div>
            {/* Gender */}
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gender</div>
              <select value={gender} onChange={e => setGender(e.target.value)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '6px 10px', color: 'white', fontSize: 12, outline: 'none' }}>
                <option value="" style={{ background: '#1e293b' }}>All</option>
                <option value="MALE" style={{ background: '#1e293b' }}>Male</option>
                <option value="FEMALE" style={{ background: '#1e293b' }}>Female</option>
                <option value="OTHER" style={{ background: '#1e293b' }}>Other</option>
              </select>
            </div>
            {/* Country */}
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Country</div>
              <input type="text" placeholder="Any" value={country} onChange={e => setCountry(e.target.value)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '6px 10px', color: 'white', fontSize: 12, outline: 'none', width: 90 }} />
            </div>
            {/* Age */}
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Age</div>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <input type="number" placeholder="Min" value={ageMin} onChange={e => setAgeMin(e.target.value)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '6px 8px', color: 'white', fontSize: 12, outline: 'none', width: 54 }} />
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>–</span>
                <input type="number" placeholder="Max" value={ageMax} onChange={e => setAgeMax(e.target.value)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '6px 8px', color: 'white', fontSize: 12, outline: 'none', width: 54 }} />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 4, width: 'fit-content' }}>
          {(['overview', 'users', 'stores'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '8px 20px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: activeTab === tab ? 'rgba(6,182,212,0.2)' : 'transparent', color: activeTab === tab ? '#67E8F9' : 'rgba(255,255,255,0.4)' }}>
              {tab === 'overview' ? '📊 Overview' : tab === 'users' ? '👥 Users' : '🏪 Stores'}
            </button>
          ))}
        </div>

        {loading ? <div style={{ textAlign: 'center', padding: 80, color: 'rgba(255,255,255,0.3)' }}>Loading...</div> : (
          <>
            {/* ── Overview Tab ─────────────────────────────────── */}
            {activeTab === 'overview' && userStats && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 16, marginBottom: 32 }}>
                  <StatCard label="Total Users" value={userStats.totalUsers} color="#67E8F9" />
                  <StatCard label="New Users" value={userStats.newUsers} color="#34d399" sub={`${from} – ${to}`} />
                  <StatCard label="Users w/ Codes" value={userStats.usersWithCodes} color="#F97316" />
                  <StatCard label="Codes Issued" value={userStats.codesIssued} color="#a78bfa" />
                  <StatCard label="Redeemed" value={userStats.codesRedeemed} color="#FBBF24" />
                  <StatCard label="Avg Codes/User" value={userStats.avgCodesPerUser} color="#f9a8d4" />
                </div>

                {/* Line chart: Users over time */}
                <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 24, marginBottom: 24 }}>
                  <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>User & Code Trends</h2>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>{from} → {to}</p>
                  <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                    {[
                      { key: 'newUsers', color: '#06B6D4', label: 'New Users' },
                      { key: 'codesIssued', color: '#F97316', label: 'Codes Issued' },
                      { key: 'codesRedeemed', color: '#10B981', label: 'Redeemed' },
                    ].map(l => (
                      <div key={l.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 12, height: 3, borderRadius: 2, background: l.color }} />
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{l.label}</span>
                      </div>
                    ))}
                  </div>
                  <LineChart
                    data={timeSeries}
                    xKey="date"
                    lines={[
                      { key: 'newUsers', color: '#06B6D4', label: 'New Users' },
                      { key: 'codesIssued', color: '#F97316', label: 'Codes Issued' },
                      { key: 'codesRedeemed', color: '#10B981', label: 'Redeemed' },
                    ]}
                    height={200}
                  />
                </div>

                {/* Gender & Country breakdown */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
                  <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 20 }}>
                    <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Gender Breakdown</h2>
                    {userStats.genderBreakdown.length === 0 ? (
                      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>No data yet</p>
                    ) : userStats.genderBreakdown.map((g: any) => (
                      <div key={g.gender} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{g.gender === 'MALE' ? '♂ Male' : g.gender === 'FEMALE' ? '♀ Female' : '⚧ Other'}</span>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{g.count}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 20 }}>
                    <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Top Countries</h2>
                    {userStats.topCountries.length === 0 ? (
                      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>No data yet</p>
                    ) : userStats.topCountries.map((c: any) => (
                      <div key={c.country} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{c.country}</span>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{c.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ── Users Tab ────────────────────────────────────── */}
            {activeTab === 'users' && (
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Users ({usersTable.length})</h2>
                  <button onClick={exportCsv} disabled={exportLoading} style={{ padding: '6px 14px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, color: '#34d399', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    ⬇️ Export
                  </button>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 700 }}>
                    <thead>
                      <tr style={{ color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {['Name', 'Contact', 'Gender', 'Age', 'Country', 'Registered', 'Codes', 'Redeemed', 'Avg ฿'].map(h => (
                          <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 600, fontSize: 11, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {usersTable.map(u => (
                        <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '10px', fontWeight: 600 }}>{u.fullName}</td>
                          <td style={{ padding: '10px', color: 'rgba(255,255,255,0.5)' }}>{u.email || u.phone || '—'}</td>
                          <td style={{ padding: '10px', color: 'rgba(255,255,255,0.5)' }}>{u.gender === 'MALE' ? '♂' : u.gender === 'FEMALE' ? '♀' : u.gender === 'OTHER' ? '⚧' : '—'}</td>
                          <td style={{ padding: '10px' }}>{u.age || '—'}</td>
                          <td style={{ padding: '10px', color: 'rgba(255,255,255,0.5)' }}>{u.country || '—'}</td>
                          <td style={{ padding: '10px', color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap' }}>{new Date(u.registeredAt).toLocaleDateString('en-GB')}</td>
                          <td style={{ padding: '10px', color: '#67E8F9', fontWeight: 700 }}>{u.totalCodes}</td>
                          <td style={{ padding: '10px', color: '#10B981', fontWeight: 700 }}>{u.redeemedCodes}</td>
                          <td style={{ padding: '10px', color: '#FBBF24' }}>{u.avgCheck > 0 ? `฿${u.avgCheck}` : '—'}</td>
                        </tr>
                      ))}
                      {usersTable.length === 0 && (
                        <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>No users found</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Stores Tab ───────────────────────────────────── */}
            {activeTab === 'stores' && (
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 24 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Store Conversions Over Time</h2>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>Number of conversions per store</p>
                <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
                  {storeTimeSeries.stores.map((name: string, i: number) => (
                    <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 12, height: 3, borderRadius: 2, background: ['#06B6D4', '#F97316', '#8B5CF6', '#10B981', '#FBBF24'][i % 5] }} />
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{name}</span>
                    </div>
                  ))}
                </div>
                <LineChart
                  data={storeTimeSeries.series}
                  xKey="date"
                  lines={storeTimeSeries.stores.map((name: string, i: number) => ({
                    key: name,
                    color: ['#06B6D4', '#F97316', '#8B5CF6', '#10B981', '#FBBF24'][i % 5],
                    label: name,
                  }))}
                  height={240}
                />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
