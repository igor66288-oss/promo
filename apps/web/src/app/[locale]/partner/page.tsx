'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { copyToClipboard } from '@/lib/clipboard';

interface PartnerSpin {
  id: string;
  customerRef: string;
  transactionId: string;
  status: string;
  createdAt: string;
  promoCode?: { code: string } | null;
  campaign?: { title: string; discountType: string; discountValue: number } | null;
}

interface PartnerConfig {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  createdAt: string;
}

export default function PartnerDashboardPage() {
  const { locale } = useParams() as { locale: string };
  const [partners, setPartners] = useState<PartnerConfig[]>([]);
  const [spins, setSpins] = useState<Record<string, PartnerSpin[]>>({});
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const th = locale === 'th';

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (!user || user.role !== 'ADMIN') {
      window.location.href = `/${locale}/auth/login`;
      return;
    }
    api.get('/partner/configs').then(r => {
      setPartners(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const loadSpins = async (partnerId: string) => {
    if (spins[partnerId]) { setExpandedId(expandedId === partnerId ? null : partnerId); return; }
    try {
      const r = await api.get(`/partner/configs/${partnerId}/spins`);
      setSpins(prev => ({ ...prev, [partnerId]: r.data }));
      setExpandedId(partnerId);
    } catch {}
  };

  const createPartner = async () => {
    if (!newName.trim() || !newSlug.trim()) return;
    setCreating(true);
    try {
      const r = await api.post('/partner/configs', { name: newName.trim(), slug: newSlug.trim().toLowerCase() });
      setPartners(prev => [r.data, ...prev]);
      setNewName(''); setNewSlug('');
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Error');
    } finally { setCreating(false); }
  };

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/${locale}/partner-spin?partner=${slug}&ref=CUSTOMER_ID`;
    copyToClipboard(url);
    setCopied(slug);
    setTimeout(() => setCopied(null), 2000);
  };

  const shareToLine = (slug: string) => {
    const url = encodeURIComponent(`${window.location.origin}/${locale}/partner-spin?partner=${slug}&ref=LINE`);
    window.open(`https://line.me/R/msg/text/?${url}`, '_blank');
  };

  if (loading) return <div style={{ minHeight: '100vh', background: '#030712', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>Loading...</div>;

  return (
    <div style={{ minHeight: '100vh', background: '#030712', color: 'white', fontFamily: 'sans-serif', padding: '24px 16px 80px' }}>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>🤝 {th ? 'พาร์ทเนอร์แชนแนล' : 'Partner Channels'}</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 24 }}>
          {th ? 'สร้างลิงก์สำหรับอินฟลูเอนเซอร์, Line OA, Grab และช่องทางอื่นๆ' : 'Create links for influencers, Line OA, Grab, and other channels'}
        </p>

        {/* Create new partner */}
        <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '20px', marginBottom: 24 }}>
          <h2 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>➕ {th ? 'สร้างช่องทางใหม่' : 'Create new channel'}</h2>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder={th ? 'ชื่อช่องทาง เช่น Line OA' : 'Channel name e.g. Line OA'}
              style={{ flex: 2, minWidth: 140, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '10px 14px', color: 'white', fontSize: 13, outline: 'none' }} />
            <input value={newSlug} onChange={e => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="slug (line-oa)"
              style={{ flex: 1, minWidth: 100, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '10px 14px', color: 'white', fontSize: 13, outline: 'none', fontFamily: 'monospace' }} />
            <button onClick={createPartner} disabled={creating || !newName.trim() || !newSlug.trim()}
              style={{ padding: '10px 20px', background: 'linear-gradient(135deg,#06B6D4,#F97316)', border: 'none', borderRadius: 10, color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              {creating ? '...' : (th ? 'สร้าง' : 'Create')}
            </button>
          </div>
        </div>

        {/* Partner list */}
        {partners.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.3)' }}>
            {th ? 'ยังไม่มีช่องทาง' : 'No partner channels yet'}
          </div>
        ) : partners.map(p => (
          <div key={p.id} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '16px', marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>{p.name}</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>/{p.slug}</p>
              </div>
              <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: p.active ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)', color: p.active ? '#10B981' : 'rgba(255,255,255,0.3)', border: `1px solid ${p.active ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)'}` }}>
                {p.active ? (th ? 'ใช้งาน' : 'Active') : (th ? 'ปิด' : 'Inactive')}
              </span>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              <button onClick={() => copyLink(p.slug)} style={{ padding: '7px 14px', background: copied === p.slug ? 'rgba(16,185,129,0.2)' : 'rgba(6,182,212,0.15)', border: `1px solid ${copied === p.slug ? '#10B981' : 'rgba(6,182,212,0.4)'}`, borderRadius: 8, color: copied === p.slug ? '#10B981' : '#67E8F9', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                {copied === p.slug ? '✓' : '🔗'} {th ? 'คัดลอกลิงก์' : 'Copy link'}
              </button>
              <button onClick={() => shareToLine(p.slug)} style={{ padding: '7px 14px', background: 'rgba(0,185,0,0.1)', border: '1px solid rgba(0,185,0,0.3)', borderRadius: 8, color: '#4ade80', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                💬 Line
              </button>
              <button onClick={() => loadSpins(p.id)} style={{ padding: '7px 14px', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 8, color: '#a78bfa', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                📊 {th ? 'ดูสถิติ' : 'Analytics'} {expandedId === p.id ? '▲' : '▼'}
              </button>
            </div>

            {/* Spin analytics */}
            {expandedId === p.id && spins[p.id] && (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 12 }}>
                <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
                  {[
                    { label: th ? 'ทั้งหมด' : 'Total Spins', value: spins[p.id].length, color: '#06B6D4' },
                    { label: th ? 'ได้รับโค้ด' : 'Codes Won', value: spins[p.id].filter(s => s.promoCode).length, color: '#10B981' },
                    { label: th ? 'หมดอายุ' : 'Expired', value: spins[p.id].filter(s => s.status === 'EXPIRED').length, color: '#94a3b8' },
                  ].map(stat => (
                    <div key={stat.label} style={{ flex: 1, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 12px' }}>
                      <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: stat.color }}>{stat.value}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{stat.label}</p>
                    </div>
                  ))}
                </div>
                {spins[p.id].slice(0, 5).map(s => (
                  <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 12 }}>
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>{s.customerRef.slice(0,12)}…</span>
                    <span style={{ color: s.promoCode ? '#10B981' : '#94a3b8' }}>{s.promoCode?.code || s.status}</span>
                    <span style={{ color: 'rgba(255,255,255,0.3)' }}>{new Date(s.createdAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
