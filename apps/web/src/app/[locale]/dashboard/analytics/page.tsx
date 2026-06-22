'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import api from '@/lib/api';

interface FunnelData {
  impressions: number;
  clicks: number;
  redemptions: number;
  conversions: number;
  rouletteSpins: number;
}

interface AnalyticsData {
  period: { days: number };
  funnel: FunnelData;
  rates: { clickThrough: string; redemption: string; conversion: string };
  codes: { total: number; redeemed: number };
  topCampaigns: any[];
  store: { name: string; balance: number };
}

function FunnelBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>{label}</span>
        <span style={{ fontSize: '14px', fontWeight: '700', color: 'white' }}>{value.toLocaleString()}</span>
      </div>
      <div style={{ height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '4px', transition: 'width 0.8s ease' }} />
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px' }}>
      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: '28px', fontWeight: '800', color: color || 'white' }}>{value}</div>
      {sub && <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>{sub}</div>}
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/analytics/store?days=${days}`)
      .then(r => { setData(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [days]);

  const funnelMax = data?.funnel.impressions || 1;
  const discountFormat = (type: string, value: number) =>
    type === 'PERCENTAGE' ? `${value}% OFF` : type === 'FIXED' ? `฿${(value / 100).toLocaleString()} OFF` : 'GIFT';

  return (
    <div className="flex min-h-screen" style={{ background: '#030712', color: 'white' }}>
      <Sidebar />
      <main className="flex-1 p-4 md:p-8 pb-20 md:pb-8 overflow-y-auto">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '4px' }}>Analytics</h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
              {data?.store.name} · Last {days} days
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[7, 30, 90].map(d => (
              <button key={d} onClick={() => setDays(d)}
                style={{ padding: '8px 16px', borderRadius: '8px', border: `1px solid ${days === d ? '#06B6D4' : 'rgba(255,255,255,0.1)'}`, background: days === d ? 'rgba(6,182,212,0.15)' : 'transparent', color: days === d ? '#67E8F9' : 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '13px', fontWeight: days === d ? '700' : '400' }}>
                {d}d
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px', color: 'rgba(255,255,255,0.4)' }}>Loading analytics...</div>
        ) : !data ? (
          <div style={{ textAlign: 'center', padding: '80px', color: 'rgba(255,255,255,0.4)' }}>No data available</div>
        ) : (
          <>
            {/* Overview cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px', marginBottom: '32px' }}>
              <StatCard label="Impressions" value={data.funnel.impressions.toLocaleString()} color="#67E8F9" />
              <StatCard label="Clicks" value={data.funnel.clicks.toLocaleString()} color="#f9a8d4" />
              <StatCard label="Redemptions" value={data.funnel.redemptions.toLocaleString()} color="#fcd34d" />
              <StatCard label="Conversions" value={data.funnel.conversions.toLocaleString()} color="#6ee7b7" />
              <StatCard label="Roulette Spins" value={data.funnel.rouletteSpins.toLocaleString()} color="#93c5fd" />
              <StatCard label="Balance" value={`฿${(data.store.balance / 100).toLocaleString()}`} color="#FBBF24" sub="THB" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
              {/* Воронка */}
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '20px' }}>Conversion Funnel</h2>
                <FunnelBar label="Impressions" value={data.funnel.impressions} max={funnelMax} color="#06B6D4" />
                <FunnelBar label="Clicks" value={data.funnel.clicks} max={funnelMax} color="#F97316" />
                <FunnelBar label="Redemptions" value={data.funnel.redemptions} max={funnelMax} color="#FBBF24" />
                <FunnelBar label="Conversions" value={data.funnel.conversions} max={funnelMax} color="#10B981" />
                <FunnelBar label="Roulette Spins" value={data.funnel.rouletteSpins} max={funnelMax} color="#3B82F6" />
              </div>

              {/* Конверсии */}
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '20px' }}>Conversion Rates</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {[
                    { label: 'Click-through rate', value: `${data.rates.clickThrough}%`, desc: 'Impressions → Clicks', color: '#67E8F9' },
                    { label: 'Redemption rate', value: `${data.rates.redemption}%`, desc: 'Clicks → Redemptions', color: '#f9a8d4' },
                    { label: 'Conversion rate', value: `${data.rates.conversion}%`, desc: 'Redemptions → Conversions', color: '#6ee7b7' },
                  ].map(item => (
                    <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '2px' }}>{item.label}</div>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{item.desc}</div>
                      </div>
                      <div style={{ fontSize: '22px', fontWeight: '800', color: item.color }}>{item.value}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '16px', padding: '12px 16px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px' }}>
                  <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}>Promo codes used</div>
                  <div style={{ fontSize: '16px', fontWeight: '700' }}>{data.codes.redeemed} / {data.codes.total}</div>
                  <div style={{ height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', marginTop: '8px' }}>
                    <div style={{ height: '100%', width: `${data.codes.total > 0 ? (data.codes.redeemed / data.codes.total) * 100 : 0}%`, background: '#10B981', borderRadius: '2px' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Топ кампании */}
            {data.topCampaigns.length > 0 && (
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '20px' }}>Top Campaigns</h2>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', textTransform: 'uppercase' }}>
                        {['Campaign', 'Discount', 'Clicks', 'Redemptions', 'Conversions', 'Conv. Rate'].map(h => (
                          <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontWeight: '600' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.topCampaigns.map((tc, i) => (
                        <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                          <td style={{ padding: '12px', fontSize: '13px', fontWeight: '600' }}>{tc.campaign?.title || '-'}</td>
                          <td style={{ padding: '12px', fontSize: '12px', color: '#FBBF24' }}>
                            {tc.campaign ? discountFormat(tc.campaign.discountType, tc.campaign.discountValue) : '-'}
                          </td>
                          <td style={{ padding: '12px', fontSize: '13px' }}>{tc.clicks}</td>
                          <td style={{ padding: '12px', fontSize: '13px' }}>{tc.redemptions}</td>
                          <td style={{ padding: '12px', fontSize: '13px' }}>{tc.conversions}</td>
                          <td style={{ padding: '12px' }}>
                            <span style={{ color: '#6ee7b7', fontWeight: '700' }}>{tc.conversionRate}%</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
