'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/api';

interface PromoCode {
  id: string;
  code: string;
  status: string;
  expiresAt: string | null;
  usedAt: string | null;
  createdAt: string;
  campaign: {
    id: string;
    title: string;
    discountType: string;
    discountValue: number;
    store: { name: string };
  };
}

function discountLabel(type: string, value: number) {
  if (type === 'PERCENTAGE') return `${value}% OFF`;
  if (type === 'FIXED') return `฿${value} OFF`;
  return 'FREE';
}

const STATUS_COLOR: Record<string, string> = {
  CREATED: '#94a3b8',
  ISSUED: '#06B6D4',
  VIEWED: '#F97316',
  REDEEMED: '#10B981',
  CONVERTED: '#8B5CF6',
};

export default function MyCodesPage() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [tab, setTab] = useState<'active' | 'used'>('active');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.push(`/${locale}/auth/login`); return; }
    const u = JSON.parse(stored);
    if (u.role !== 'CUSTOMER') { router.push(`/${locale}/dashboard`); return; }

    api.get('/users/me/codes').then(r => { setCodes(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const copy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  const active = codes.filter(c => !['REDEEMED', 'CONVERTED'].includes(c.status) && (!c.expiresAt || new Date(c.expiresAt) > new Date()));
  const used = codes.filter(c => ['REDEEMED', 'CONVERTED'].includes(c.status));

  const displayCodes = tab === 'active' ? active : used;

  return (
    <div style={{ minHeight: '100vh', background: '#030712', color: 'white', fontFamily: 'sans-serif' }}>
      {/* Header */}
      <div style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.push(`/${locale}/account`)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 20, padding: 0 }}>←</button>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{locale === 'th' ? '🎫 โค้ดของฉัน' : '🎫 My Codes'}</h1>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '20px 16px 100px' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 4 }}>
          {(['active', 'used'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: tab === t ? 'rgba(6,182,212,0.2)' : 'transparent',
              color: tab === t ? '#67E8F9' : 'rgba(255,255,255,0.4)',
            }}>
              {t === 'active' ? `${locale === 'th' ? 'ใช้ได้' : 'Active'} (${active.length})` : `${locale === 'th' ? 'ใช้แล้ว' : 'Used'} (${used.length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.3)' }}>Loading...</div>
        ) : displayCodes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>{tab === 'active' ? '🎫' : '📋'}</div>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15 }}>
              {tab === 'active'
                ? (locale === 'th' ? 'ยังไม่มีโค้ด — รับโค้ดจากหน้าหลัก' : 'No active codes — grab some from Deals!')
                : (locale === 'th' ? 'ยังไม่เคยใช้โค้ด' : 'No used codes yet')}
            </p>
            {tab === 'active' && (
              <button onClick={() => router.push(`/${locale}/account`)} style={{ marginTop: 16, padding: '10px 24px', background: 'linear-gradient(135deg, #06B6D4, #F97316)', border: 'none', borderRadius: 10, color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                {locale === 'th' ? 'ดูโปรโมชั่น' : 'Browse Deals'}
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {displayCodes.map(c => {
              const expired = c.expiresAt && new Date(c.expiresAt) < new Date();
              return (
                <div key={c.id} style={{
                  background: expired ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${expired ? 'rgba(255,255,255,0.06)' : 'rgba(6,182,212,0.2)'}`,
                  borderRadius: 16, padding: 16, opacity: expired ? 0.6 : 1,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 14, margin: 0 }}>{c.campaign.title}</p>
                      <p style={{ fontSize: 12, color: '#06B6D4', margin: '2px 0 0' }}>{c.campaign.store.name}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#FBBF24' }}>
                        {discountLabel(c.campaign.discountType, c.campaign.discountValue)}
                      </div>
                      <div style={{ fontSize: 10, color: STATUS_COLOR[c.status] || '#94a3b8', marginTop: 2, fontWeight: 600 }}>
                        {c.status}
                      </div>
                    </div>
                  </div>

                  {/* Code */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: 8, padding: '8px 12px' }}>
                      <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: '0.1em', color: '#67E8F9', fontFamily: 'monospace' }}>{c.code}</span>
                    </div>
                    {!['REDEEMED', 'CONVERTED'].includes(c.status) && !expired && (
                      <button onClick={() => copy(c.code)} style={{
                        padding: '8px 14px', background: copied === c.code ? 'rgba(16,185,129,0.3)' : 'rgba(6,182,212,0.2)',
                        border: `1px solid ${copied === c.code ? '#10B981' : '#06B6D4'}`,
                        borderRadius: 8, color: copied === c.code ? '#10B981' : '#67E8F9',
                        fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                      }}>
                        {copied === c.code ? '✓ Copied' : 'Copy'}
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                      {locale === 'th' ? 'รับเมื่อ' : 'Claimed'}: {new Date(c.createdAt).toLocaleDateString(locale === 'th' ? 'th-TH' : 'en-GB')}
                    </span>
                    {c.expiresAt && (
                      <span style={{ fontSize: 11, color: expired ? '#ef4444' : 'rgba(255,255,255,0.3)' }}>
                        {expired ? '⚠️ ' : '⏳ '}{locale === 'th' ? 'หมดอายุ' : 'Expires'}: {new Date(c.expiresAt).toLocaleDateString(locale === 'th' ? 'th-TH' : 'en-GB')}
                      </span>
                    )}
                    {c.usedAt && (
                      <span style={{ fontSize: 11, color: '#10B981' }}>
                        ✓ {locale === 'th' ? 'ใช้เมื่อ' : 'Used'}: {new Date(c.usedAt).toLocaleDateString(locale === 'th' ? 'th-TH' : 'en-GB')}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
