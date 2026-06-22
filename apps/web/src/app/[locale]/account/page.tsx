'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/api';

interface Campaign {
  id: string;
  title: string;
  description: string | null;
  discountType: string;
  discountValue: number;
  conditions: string | null;
  endsAt: string;
  store: { name: string; logo: string | null };
}

function discountLabel(type: string, value: number) {
  if (type === 'PERCENTAGE') return `${value}% OFF`;
  if (type === 'FIXED') return `฿${value} OFF`;
  return 'FREE';
}

export default function AccountPage() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [claimed, setClaimed] = useState<Record<string, boolean>>({});
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.push(`/${locale}/auth/login`); return; }
    const u = JSON.parse(stored);
    if (u.role !== 'CUSTOMER') { router.push(`/${locale}/dashboard`); return; }
    setUser(u);

    Promise.all([
      api.get('/campaigns?status=ACTIVE'),
      api.get('/users/me/codes'),
    ]).then(([c, codes]) => {
      setCampaigns(c.data);
      const claimedMap: Record<string, boolean> = {};
      codes.data.forEach((code: any) => { claimedMap[code.campaignId] = true; });
      setClaimed(claimedMap);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const claim = async (campaignId: string) => {
    setClaiming(campaignId);
    try {
      await api.post(`/users/me/claim/${campaignId}`);
      setClaimed(prev => ({ ...prev, [campaignId]: true }));
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Error');
    } finally {
      setClaiming(null);
    }
  };

  const bg = '#030712';

  return (
    <div style={{ minHeight: '100vh', background: bg, color: 'white', fontFamily: 'sans-serif' }}>
      {/* Header */}
      <div style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #06B6D4, #F97316)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16 }}>P</div>
          <span style={{ fontWeight: 700, fontSize: 18 }}>Promo</span>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <button onClick={() => router.push(`/${locale}/account/codes`)} style={{ color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>🎫 My Codes</button>
          <button onClick={() => router.push(`/${locale}/account/profile`)} style={{ color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>👤 Profile</button>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '20px 16px 100px' }}>
        {/* Welcome */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>
            {locale === 'th' ? 'ยินดีต้อนรับ' : 'Welcome back'}{user?.name ? `, ${user.name}` : ''}! 👋
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: 4, fontSize: 14 }}>
            {locale === 'th' ? 'รับโปรโมชั่นพิเศษจากร้านค้าที่ร่วมรายการ' : 'Grab exclusive promos from partner stores'}
          </p>
        </div>

        {/* Quick stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
          {[
            { label: locale === 'th' ? 'โค้ดที่มี' : 'My Codes', value: Object.keys(claimed).length, icon: '🎫', color: '#06B6D4' },
            { label: locale === 'th' ? 'แคมเปญใช้ได้' : 'Active Deals', value: campaigns.length, icon: '🔥', color: '#F97316' },
          ].map(s => (
            <div key={s.label} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '16px' }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>{s.icon}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
          {locale === 'th' ? '🔥 โปรโมชั่นที่ใช้ได้ตอนนี้' : '🔥 Active Deals'}
        </h2>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.3)' }}>Loading...</div>
        ) : campaigns.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.3)' }}>
            {locale === 'th' ? 'ยังไม่มีโปรโมชั่น' : 'No active deals yet'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {campaigns.map(c => (
              <div key={c.id} style={{ background: 'rgba(255,255,255,0.05)', border: claimed[c.id] ? '1px solid rgba(6,182,212,0.3)' : '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  {/* Discount badge */}
                  <div style={{ flexShrink: 0, width: 56, height: 56, borderRadius: 12, background: 'linear-gradient(135deg, #06B6D4, #0891B2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: 'white', textAlign: 'center', lineHeight: 1.2 }}>
                    {discountLabel(c.discountType, c.discountValue)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: 15, margin: 0 }}>{c.title}</p>
                        <p style={{ fontSize: 12, color: '#06B6D4', margin: '2px 0 0' }}>{c.store.name}</p>
                      </div>
                      {claimed[c.id] ? (
                        <span style={{ fontSize: 11, background: 'rgba(6,182,212,0.15)', color: '#67E8F9', padding: '4px 10px', borderRadius: 20, fontWeight: 600, flexShrink: 0 }}>
                          {locale === 'th' ? '✓ รับแล้ว' : '✓ Claimed'}
                        </span>
                      ) : null}
                    </div>
                    {c.description && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: '6px 0 0', lineHeight: 1.5 }}>{c.description}</p>}
                    {c.conditions && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: '4px 0 0' }}>📋 {c.conditions}</p>}
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: '4px 0 0' }}>
                      ⏳ {locale === 'th' ? 'หมดอายุ' : 'Expires'}: {new Date(c.endsAt).toLocaleDateString(locale === 'th' ? 'th-TH' : 'en-GB')}
                    </p>
                  </div>
                </div>
                {!claimed[c.id] && (
                  <button
                    onClick={() => claim(c.id)}
                    disabled={claiming === c.id}
                    style={{
                      marginTop: 12, width: '100%', padding: '10px',
                      background: claiming === c.id ? 'rgba(6,182,212,0.3)' : 'linear-gradient(135deg, #06B6D4, #0891B2)',
                      border: 'none', borderRadius: 10, color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    {claiming === c.id ? '...' : (locale === 'th' ? '🎫 รับโปรโมโค้ด' : '🎫 Get Promo Code')}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
