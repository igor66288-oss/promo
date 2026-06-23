'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import api from '@/lib/api';
import { copyToClipboard } from '@/lib/clipboard';

interface Store {
  id: string;
  name: string;
  logo: string | null;
}

interface Campaign {
  id: string;
  title: string;
  description: string | null;
  discountType: 'PERCENTAGE' | 'FIXED' | 'GIFT';
  discountValue: number;
  category: string;
  startsAt: string;
  endsAt: string;
  promoted: boolean;
  promotedUntil?: string | null;
  distanceKm?: number;
  store: Store & { address?: string; city?: string };
  _count?: { promoCodes: number };
}

interface ClaimedCode {
  id: string;
  code: string;
  campaign: {
    title: string;
    discountType: string;
    discountValue: number;
    store: Store;
  };
  expiresAt: string | null;
}

const CATEGORIES: { key: string; icon: string; th: string; en: string }[] = [
  { key: 'ALL',           icon: '🔥', th: 'ทั้งหมด',    en: 'All' },
  { key: 'NEARBY',        icon: '📍', th: 'ใกล้ฉัน',    en: 'Nearby' },
  { key: 'FOOD',          icon: '🍽️', th: 'อาหาร',      en: 'Food' },
  { key: 'BEAUTY',        icon: '💄', th: 'ความงาม',    en: 'Beauty' },
  { key: 'FASHION',       icon: '👗', th: 'แฟชั่น',     en: 'Fashion' },
  { key: 'ENTERTAINMENT', icon: '🎮', th: 'บันเทิง',    en: 'Fun' },
  { key: 'FITNESS',       icon: '💪', th: 'ฟิตเนส',     en: 'Fitness' },
  { key: 'TRAVEL',        icon: '✈️', th: 'ท่องเที่ยว', en: 'Travel' },
  { key: 'HEALTH',        icon: '🏥', th: 'สุขภาพ',     en: 'Health' },
  { key: 'SERVICES',      icon: '⚙️', th: 'บริการ',     en: 'Services' },
  { key: 'SHOPPING',      icon: '🛍️', th: 'ช้อปปิ้ง',   en: 'Shopping' },
];

function discountLabel(c: Campaign): string {
  if (c.discountType === 'PERCENTAGE') return `${c.discountValue}% OFF`;
  if (c.discountType === 'FIXED') return `฿${c.discountValue} OFF`;
  return 'GIFT';
}

const typeColors: Record<string, string> = {
  PERCENTAGE: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  FIXED: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  GIFT: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
};

function isFeatured(c: Campaign): boolean {
  return c.promoted === true && !!c.promotedUntil && new Date(c.promotedUntil) > new Date();
}

function CodeModal({ claimedCode, onClose, locale }: { claimedCode: ClaimedCode; onClose: () => void; locale: string }) {
  const [copied, setCopied] = useState(false);
  const copyCode = () => {
    copyToClipboard(claimedCode.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-[#0F172A] border border-white/20 rounded-2xl p-8 max-w-md w-full shadow-2xl">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#06B6D4] to-[#F97316] flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">
            {claimedCode.campaign.store.name[0]}
          </div>
          <h2 className="text-white font-bold text-xl">{locale === 'th' ? 'โค้ดของคุณ' : 'Your Promo Code'}</h2>
          <p className="text-white/50 text-sm mt-1">{claimedCode.campaign.store.name} — {claimedCode.campaign.title}</p>
        </div>
        <div className="bg-white/5 border border-white/15 rounded-xl p-6 mb-6 text-center">
          <code className="text-3xl font-mono font-bold text-white tracking-widest select-all">{claimedCode.code}</code>
          {claimedCode.expiresAt && (
            <p className="text-white/40 text-xs mt-3">{locale === 'th' ? 'หมดอายุ: ' : 'Expires: '}{new Date(claimedCode.expiresAt).toLocaleDateString()}</p>
          )}
        </div>
        <div className="flex gap-3">
          <Button onClick={copyCode} className="flex-1">{copied ? (locale === 'th' ? 'คัดลอกแล้ว!' : 'Copied!') : (locale === 'th' ? 'คัดลอกโค้ด' : 'Copy Code')}</Button>
          <Button variant="ghost" onClick={onClose}>{locale === 'th' ? 'ปิด' : 'Close'}</Button>
        </div>
      </div>
    </div>
  );
}

function FeaturedCampaignCard({ campaign, locale, onClaim, claiming }: { campaign: Campaign; locale: string; onClaim: (id: string) => void; claiming: boolean }) {
  const daysLeft = Math.max(0, Math.ceil((new Date(campaign.endsAt).getTime() - Date.now()) / 86400000));
  const cat = CATEGORIES.find(c => c.key === campaign.category);
  return (
    <div style={{ position: 'relative', border: '1px solid rgba(251,191,36,0.4)', background: 'linear-gradient(135deg, rgba(251,191,36,0.08), rgba(6,182,212,0.08))', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: 6 }}>
        {cat && <span style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)', fontSize: '10px', padding: '2px 8px', borderRadius: '20px' }}>{cat.icon} {locale === 'th' ? cat.th : cat.en}</span>}
        <span style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.4)', color: '#FBBF24', fontSize: '10px', fontWeight: '800', padding: '3px 8px', borderRadius: '20px', letterSpacing: '0.05em' }}>⭐ FEATURED</span>
      </div>
      {claiming && <div style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', borderRadius: '16px' }}><div className="w-6 h-6 border-2 border-[#FBBF24] border-t-transparent rounded-full animate-spin" /></div>}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px', paddingRight: '120px' }}>
        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, #FBBF24, #06B6D4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '800', fontSize: '16px', flexShrink: 0 }}>{campaign.store.name[0]}</div>
        <div style={{ minWidth: 0 }}>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '2px' }}>{campaign.store.name}</p>
          <p style={{ color: 'white', fontWeight: '600', fontSize: '15px' }}>{campaign.title}</p>
        </div>
      </div>
      <div style={{ fontSize: '30px', fontWeight: '900', color: '#FBBF24', marginBottom: '8px', lineHeight: 1 }}>{discountLabel(campaign)}</div>
      {campaign.description && <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginBottom: '16px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{campaign.description}</p>}
      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>{daysLeft > 0 ? (locale === 'th' ? `เหลืออีก ${daysLeft} วัน` : `${daysLeft} days left`) : (locale === 'th' ? 'หมดอายุแล้ว' : 'Expired')}</span>
        <Button size="sm" onClick={() => onClaim(campaign.id)}>{locale === 'th' ? 'รับโค้ด' : 'Get Code'}</Button>
      </div>
    </div>
  );
}

function CampaignCard({ campaign, locale, onClaim }: { campaign: Campaign; locale: string; onClaim: (id: string) => void }) {
  const daysLeft = Math.max(0, Math.ceil((new Date(campaign.endsAt).getTime() - Date.now()) / 86400000));
  const cat = CATEGORIES.find(c => c.key === campaign.category);
  return (
    <Card hover className="group flex flex-col">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#06B6D4] to-[#F97316] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{campaign.store.name[0]}</div>
          <div className="min-w-0">
            <p className="text-white/50 text-xs truncate">{campaign.store.name}</p>
            <p className="text-white font-medium text-sm truncate">{campaign.title}</p>
          </div>
        </div>
        <span className={`ml-2 flex-shrink-0 px-2 py-1 rounded-md text-xs font-bold border ${typeColors[campaign.discountType]}`}>{discountLabel(campaign)}</span>
      </div>
      {cat && cat.key !== 'OTHER' && (
        <span className="inline-flex items-center gap-1 text-xs text-white/40 mb-2 w-fit">{cat.icon} {locale === 'th' ? cat.th : cat.en}</span>
      )}
      {campaign.description && <p className="text-white/40 text-xs mb-4 line-clamp-2">{campaign.description}</p>}
      <div className="mt-auto flex items-center justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-white/40 text-xs">{daysLeft > 0 ? (locale === 'th' ? `เหลืออีก ${daysLeft} วัน` : `${daysLeft} days left`) : (locale === 'th' ? 'หมดอายุแล้ว' : 'Expired')}</span>
          {campaign.distanceKm !== undefined && <span className="text-[#06B6D4] text-xs">📍 {campaign.distanceKm} km</span>}
          {campaign.store.city && !campaign.distanceKm && <span className="text-white/30 text-xs">📍 {campaign.store.city}</span>}
        </div>
        <Button size="sm" onClick={() => onClaim(campaign.id)}>{locale === 'th' ? 'รับโค้ด' : 'Get Code'}</Button>
      </div>
    </Card>
  );
}

export default function HomePage() {
  const locale = useLocale();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [geoError, setGeoError] = useState('');
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimedCode, setClaimedCode] = useState<ClaimedCode | null>(null);
  const [claimError, setClaimError] = useState('');

  const loadCampaigns = (cat: string) => {
    setLoading(true);
    setGeoError('');
    if (cat === 'NEARBY') {
      if (!navigator.geolocation) {
        setGeoError(locale === 'th' ? 'เบราว์เซอร์ไม่รองรับ GPS' : 'Browser does not support geolocation');
        setLoading(false);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        pos => {
          api.get(`/campaigns/nearby?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}&radius=10`)
            .then(res => setCampaigns(Array.isArray(res.data) ? res.data : []))
            .catch(() => setCampaigns([]))
            .finally(() => setLoading(false));
        },
        () => {
          setGeoError(locale === 'th' ? 'ไม่สามารถเข้าถึงตำแหน่งได้ กรุณาอนุญาต GPS' : 'Location access denied. Please allow GPS.');
          setCampaigns([]);
          setLoading(false);
        },
      );
    } else {
      const params = cat !== 'ALL' ? `?category=${cat}` : '';
      api.get(`/campaigns${params}`)
        .then(res => setCampaigns(Array.isArray(res.data) ? res.data : []))
        .catch(() => setCampaigns([]))
        .finally(() => setLoading(false));
    }
  };

  useEffect(() => { loadCampaigns(activeCategory); }, [activeCategory]);

  const handleClaim = async (campaignId: string) => {
    setClaimError('');
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) { window.location.href = `/${locale}/auth/login`; return; }
    setClaimingId(campaignId);
    try {
      const res = await api.post(`/campaigns/${campaignId}/claim`);
      setClaimedCode(res.data);
    } catch (err: any) {
      const msg = err?.response?.data?.message || (locale === 'th' ? 'เกิดข้อผิดพลาด' : 'Something went wrong');
      setClaimError(msg);
      setTimeout(() => setClaimError(''), 4000);
    } finally {
      setClaimingId(null);
    }
  };

  const featuredCampaigns = campaigns.filter(isFeatured);
  const regularCampaigns = campaigns.filter(c => !isFeatured(c));

  return (
    <div className="min-h-screen bg-[#030712]">
      {/* Hero */}
      <section className="pt-16 pb-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-[#06B6D4]/20 border border-[#06B6D4]/30 rounded-full px-4 py-2 mb-6">
            <span className="w-2 h-2 rounded-full bg-[#06B6D4] animate-pulse" />
            <span className="text-[#67E8F9] text-sm font-medium">{locale === 'th' ? 'ดีลพิเศษสำหรับไทย' : 'Exclusive Deals for Thailand'}</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
            {locale === 'th' ? (<>Promo <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#06B6D4] to-[#F97316]">ดีลและส่วนลด</span>สุดคุ้มในไทย</>) : (<><span className="text-transparent bg-clip-text bg-gradient-to-r from-[#06B6D4] to-[#F97316]">Thailand's</span> Best Deals Platform</>)}
          </h1>
          <p className="text-white/60 text-lg md:text-xl mb-10 max-w-2xl mx-auto">
            {locale === 'th' ? 'ค้นหาส่วนลดพิเศษและโปรโมโค้ดจากร้านค้าชั้นนำทั่วประเทศไทย' : 'Find exclusive discounts and promo codes from top stores across Thailand'}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href={`/${locale}/auth/register`} className="inline-flex items-center justify-center gap-2 bg-[#06B6D4] hover:bg-[#0891b2] text-white px-8 py-3 rounded-lg font-medium transition-all duration-200 shadow-lg shadow-cyan-900/30">
              {locale === 'th' ? 'เริ่มต้นฟรี' : 'Get Started Free'}
            </Link>
            <Link href={`/${locale}/account/codes`} className="inline-flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/20 text-white px-8 py-3 rounded-lg font-medium transition-all duration-200">
              {locale === 'th' ? 'โค้ดของฉัน' : 'My Codes'}
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-8 px-4 border-y border-white/5">
        <div className="max-w-5xl mx-auto grid grid-cols-3 gap-4 text-center">
          {[
            { value: '500+', label: locale === 'th' ? 'ร้านค้า' : 'Stores' },
            { value: '10,000+', label: locale === 'th' ? 'โปรโมโค้ด' : 'Promo Codes' },
            { value: '฿50M+', label: locale === 'th' ? 'ประหยัดแล้ว' : 'Saved' },
          ].map(stat => (
            <div key={stat.label}>
              <p className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#06B6D4] to-[#F97316]">{stat.value}</p>
              <p className="text-white/50 text-sm mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Category filter */}
      <section className="py-6 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                style={{
                  flexShrink: 0,
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 50, border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
                  background: activeCategory === cat.key ? '#06B6D4' : 'rgba(255,255,255,0.07)',
                  color: activeCategory === cat.key ? 'white' : 'rgba(255,255,255,0.55)',
                  boxShadow: activeCategory === cat.key ? '0 0 16px rgba(6,182,212,0.4)' : 'none',
                }}
              >
                <span>{cat.icon}</span>
                <span>{locale === 'th' ? cat.th : cat.en}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Error toasts */}
      {claimError && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 bg-red-500/20 border border-red-500/40 text-red-300 px-6 py-3 rounded-xl text-sm shadow-lg">{claimError}</div>
      )}
      {geoError && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 bg-amber-500/20 border border-amber-500/40 text-amber-300 px-6 py-3 rounded-xl text-sm shadow-lg max-w-xs text-center">📍 {geoError}</div>
      )}

      {/* Featured Deals */}
      {!loading && featuredCampaigns.length > 0 && (
        <section className="pt-4 pb-10 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '20px', padding: '4px 14px' }}>
                <span style={{ color: '#FBBF24', fontSize: '12px', fontWeight: '700' }}>✨ {locale === 'th' ? 'ดีลแนะนำ' : 'Featured Deals'}</span>
              </div>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>{featuredCampaigns.length} {locale === 'th' ? 'รายการ' : 'campaigns'}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredCampaigns.map(campaign => (
                <FeaturedCampaignCard key={campaign.id} campaign={campaign} locale={locale} onClaim={handleClaim} claiming={claimingId === campaign.id} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* All Deals */}
      <section className="py-8 px-4 pb-24">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">
              {activeCategory === 'ALL'
                ? (locale === 'th' ? 'ดีลทั้งหมด' : 'All Deals')
                : (() => { const cat = CATEGORIES.find(c => c.key === activeCategory); return `${cat?.icon} ${locale === 'th' ? cat?.th : cat?.en}`; })()
              }
              {!loading && <span className="text-white/30 text-base font-normal ml-2">({campaigns.length})</span>}
            </h2>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-[#06B6D4] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-16">
              <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
              <p className="text-white/40 text-lg">{locale === 'th' ? 'ไม่พบดีลในหมวดนี้' : 'No deals in this category yet'}</p>
              <button onClick={() => setActiveCategory('ALL')} style={{ marginTop: 16, padding: '10px 24px', background: 'rgba(6,182,212,0.2)', border: '1px solid rgba(6,182,212,0.3)', borderRadius: 10, color: '#67E8F9', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                {locale === 'th' ? 'ดูทั้งหมด' : 'Show all deals'}
              </button>
            </div>
          ) : regularCampaigns.length === 0 && featuredCampaigns.length > 0 ? (
            <div className="text-center py-8">
              <p className="text-white/30 text-sm">{locale === 'th' ? 'ดีลทั้งหมดอยู่ในส่วน Featured ด้านบน' : 'All deals are featured above'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {regularCampaigns.map(campaign => (
                <div key={campaign.id} className="relative">
                  {claimingId === campaign.id && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 rounded-xl">
                      <div className="w-6 h-6 border-2 border-[#06B6D4] border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                  <CampaignCard campaign={campaign} locale={locale} onClaim={handleClaim} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-white/40 text-sm">© 2026 Promo Platform Thailand</p>
          <div className="flex items-center gap-4">
            <Link href={`/${locale}/auth/login`} className="text-white/40 hover:text-white text-sm transition-colors">{locale === 'th' ? 'เข้าสู่ระบบ' : 'Login'}</Link>
            <Link href={`/${locale}/auth/register`} className="text-white/40 hover:text-white text-sm transition-colors">{locale === 'th' ? 'สมัครสมาชิก' : 'Register'}</Link>
          </div>
        </div>
      </footer>

      {claimedCode && <CodeModal claimedCode={claimedCode} onClose={() => setClaimedCode(null)} locale={locale} />}
    </div>
  );
}
