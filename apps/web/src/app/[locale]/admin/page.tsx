'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function AdminPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/analytics/platform')
      .then(r => { setData(r.data); setLoading(false); })
      .catch(() => { setLoading(false); router.push('/auth/login'); });
  }, []);

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#030712', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
      Loading...
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#030712', color: 'white' }}>
      <div style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: '800', fontSize: '20px' }}>Admin Panel</span>
        <button onClick={() => { localStorage.removeItem('token'); router.push('/auth/login'); }}
          style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
          Logout
        </button>
      </div>

      <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '8px' }}>Platform Overview</h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '32px' }}>Last {data?.period?.days} days</p>

        {/* Overview */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          {data && [
            { label: 'Total Stores', value: data.overview.totalStores, color: '#67E8F9' },
            { label: 'Active Stores', value: data.overview.activeStores, color: '#6ee7b7' },
            { label: 'Total Campaigns', value: data.overview.totalCampaigns, color: '#f9a8d4' },
            { label: 'Active Campaigns', value: data.overview.activeCampaigns, color: '#fcd34d' },
            { label: 'Events (period)', value: data.overview.totalEvents.toLocaleString(), color: '#93c5fd' },
            { label: 'Total Codes', value: data.overview.totalCodes.toLocaleString(), color: '#FBBF24' },
          ].map(item => (
            <div key={item.label} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px' }}>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</div>
              <div style={{ fontSize: '26px', fontWeight: '800', color: item.color }}>{item.value}</div>
            </div>
          ))}
        </div>

        {/* Events by type */}
        {data?.eventsByType && (
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>Events by Type</h2>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {data.eventsByType.map((e: any) => (
                <div key={e.type} style={{ flex: '1', minWidth: '120px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: '#67E8F9' }}>{e.count}</div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>{e.type}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top stores */}
        {data?.topStores?.length > 0 && (
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>Top Stores by Activity</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', textTransform: 'uppercase' }}>
                  {['Store', 'Status', 'Events', 'Balance'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontWeight: '600' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.topStores.map((ts: any, i: number) => (
                  <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <td style={{ padding: '12px', fontSize: '13px', fontWeight: '600' }}>{ts.store?.name || '-'}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ padding: '3px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', background: ts.store?.status === 'ACTIVE' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: ts.store?.status === 'ACTIVE' ? '#6ee7b7' : '#f87171' }}>
                        {ts.store?.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontSize: '13px' }}>{ts.events}</td>
                    <td style={{ padding: '12px', fontSize: '13px', color: '#FBBF24' }}>฿{((ts.store?.balance || 0) / 100).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
