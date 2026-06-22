'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import api from '@/lib/api';

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
  startsAt: string;
  endsAt: string;
  promoted: boolean;
  promotedUntil?: string | null;
  store: Store;
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

function CodeModal({
  claimedCode,
  onClose,
  locale,
}: {
  claimedCode: ClaimedCode;
  onClose: () => void;
  locale: string;
}) {
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    await navigator.clipboard.writeText(claimedCode.code);
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
          <h2 className="text-white font-bold text-xl">
            {locale === 'th' ? 'โค้ดของคุณ' : 'Your Promo Code'}
          </h2>
          <p className="text-white/50 text-sm mt-1">
            {claimedCode.campaign.store.name} — {claimedCode.campaign.title}
          </p>
        </div>

        <div className="bg-white/5 border border-white/15 rounded-xl p-6 mb-6 text-center">
          <code className="text-3xl font-mono font-bold text-white tracking-widest select-all">
            {claimedCode.code}
          </code>
          {claimedCode.expiresAt && (
            <p className="text-white/40 text-xs mt-3">
              {locale === 'th' ? 'หมดอายุ: ' : 'Expires: '}
              {new Date(claimedCode.expiresAt).toLocaleDateString()}
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <Button onClick={copyCode} className="flex-1">
            {copied
              ? locale === 'th'
                ? 'คัดลอกแล้ว!'
                : 'Copied!'
              : locale === 'th'
                ? 'คัดลอกโค้ด'
                : 'Copy Code'}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            {locale === 'th' ? 'ปิด' : 'Close'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function FeaturedCampaignCard({
  campaign,
  locale,
  onClaim,
  claiming,
}: {
  campaign: Campaign;
  locale: string;
  onClaim: (id: string) => void;
  claiming: boolean;
}) {
  const endsAt = new Date(campaign.endsAt);
  const daysLeft = Math.max(
    0,
    Math.ceil((endsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
  );

  return (
    <div
      style={{
        position: 'relative',
        border: '1px solid rgba(251,191,36,0.4)',
        background: 'linear-gradient(135deg, rgba(251,191,36,0.08), rgba(6,182,212,0.08))',
        borderRadius: '16px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
    >
      {/* FEATURED badge */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          background: 'rgba(251,191,36,0.15)',
          border: '1px solid rgba(251,191,36,0.4)',
          color: '#FBBF24',
          fontSize: '10px',
          fontWeight: '800',
          padding: '3px 8px',
          borderRadius: '20px',
          letterSpacing: '0.05em',
        }}
      >
        ⭐ FEATURED
      </div>

      {claiming && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.4)',
            borderRadius: '16px',
          }}
        >
          <div className="w-6 h-6 border-2 border-[#FBBF24] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px', paddingRight: '80px' }}>
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #FBBF24, #06B6D4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: '800',
            fontSize: '16px',
            flexShrink: 0,
          }}
        >
          {campaign.store.name[0]}
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '2px' }}>
            {campaign.store.name}
          </p>
          <p style={{ color: 'white', fontWeight: '600', fontSize: '15px' }}>{campaign.title}</p>
        </div>
      </div>

      {/* Discount value — bigger for featured */}
      <div
        style={{
          fontSize: '30px',
          fontWeight: '900',
          color: '#FBBF24',
          marginBottom: '8px',
          lineHeight: 1,
        }}
      >
        {discountLabel(campaign)}
      </div>

      {campaign.description && (
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginBottom: '16px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {campaign.description}
        </p>
      )}

      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>
          {daysLeft > 0
            ? locale === 'th'
              ? `เหลืออีก ${daysLeft} วัน`
              : `${daysLeft} days left`
            : locale === 'th'
              ? 'หมดอายุแล้ว'
              : 'Expired'}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link
            href={`/${locale}/campaigns/${campaign.id}/roulette`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '500',
              background: 'rgba(251,191,36,0.15)',
              color: '#FCD34D',
              border: '1px solid rgba(251,191,36,0.3)',
              textDecoration: 'none',
            }}
          >
            🎰 {locale === 'th' ? 'ลองโชค' : 'Try Luck'}
          </Link>
          <Button size="sm" onClick={() => onClaim(campaign.id)}>
            {locale === 'th' ? 'รับโค้ด' : 'Get Code'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function CampaignCard({
  campaign,
  locale,
  onClaim,
}: {
  campaign: Campaign;
  locale: string;
  onClaim: (id: string) => void;
}) {
  const endsAt = new Date(campaign.endsAt);
  const daysLeft = Math.max(
    0,
    Math.ceil((endsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
  );

  return (
    <Card hover className="group flex flex-col">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#06B6D4] to-[#F97316] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {campaign.store.name[0]}
          </div>
          <div className="min-w-0">
            <p className="text-white/50 text-xs truncate">{campaign.store.name}</p>
            <p className="text-white font-medium text-sm truncate">{campaign.title}</p>
          </div>
        </div>
        <span
          className={`ml-2 flex-shrink-0 px-2 py-1 rounded-md text-xs font-bold border ${
            typeColors[campaign.discountType]
          }`}
        >
          {discountLabel(campaign)}
        </span>
      </div>

      {campaign.description && (
        <p className="text-white/40 text-xs mb-4 line-clamp-2">{campaign.description}</p>
      )}

      <div className="mt-auto flex items-center justify-between gap-2">
        <span className="text-white/40 text-xs">
          {daysLeft > 0
            ? locale === 'th'
              ? `เหลืออีก ${daysLeft} วัน`
              : `${daysLeft} days left`
            : locale === 'th'
              ? 'หมดอายุแล้ว'
              : 'Expired'}
        </span>
        <div className="flex items-center gap-2">
          <Link
            href={`/${locale}/campaigns/${campaign.id}/roulette`}
            className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition-colors"
          >
            🎰 {locale === 'th' ? 'ลองโชค' : 'Try Luck'}
          </Link>
          <Button size="sm" onClick={() => onClaim(campaign.id)}>
            {locale === 'th' ? 'รับโค้ด' : 'Get Code'}
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default function HomePage() {
  const locale = useLocale();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimedCode, setClaimedCode] = useState<ClaimedCode | null>(null);
  const [claimError, setClaimError] = useState<string>('');

  useEffect(() => {
    api
      .get('/campaigns')
      .then((res) => setCampaigns(Array.isArray(res.data) ? res.data : []))
      .catch(() => setCampaigns([]))
      .finally(() => setLoading(false));
  }, []);

  const handleClaim = async (campaignId: string) => {
    setClaimError('');
    const token =
      typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      window.location.href = `/${locale}/auth/login`;
      return;
    }

    setClaimingId(campaignId);
    try {
      const res = await api.post(`/campaigns/${campaignId}/claim`);
      setClaimedCode(res.data);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        (locale === 'th' ? 'เกิดข้อผิดพลาด' : 'Something went wrong');
      setClaimError(msg);
      setTimeout(() => setClaimError(''), 4000);
    } finally {
      setClaimingId(null);
    }
  };

  const featuredCampaigns = campaigns.filter(isFeatured);
  const regularCampaigns = campaigns.filter((c) => !isFeatured(c));

  return (
    <div className="min-h-screen bg-[#030712]">

      {/* Hero */}
      <section className="pt-16 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-[#06B6D4]/20 border border-[#06B6D4]/30 rounded-full px-4 py-2 mb-6">
            <span className="w-2 h-2 rounded-full bg-[#06B6D4] animate-pulse" />
            <span className="text-[#67E8F9] text-sm font-medium">
              {locale === 'th' ? 'ดีลพิเศษสำหรับไทย' : 'Exclusive Deals for Thailand'}
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
            {locale === 'th' ? (
              <>
                Promo{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#06B6D4] to-[#F97316]">
                  ดีลและส่วนลด
                </span>
                สุดคุ้มในไทย
              </>
            ) : (
              <>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#06B6D4] to-[#F97316]">
                  Thailand's
                </span>{' '}
                Best Deals Platform
              </>
            )}
          </h1>

          <p className="text-white/60 text-lg md:text-xl mb-10 max-w-2xl mx-auto">
            {locale === 'th'
              ? 'ค้นหาส่วนลดพิเศษและโปรโมโค้ดจากร้านค้าชั้นนำทั่วประเทศไทย'
              : 'Find exclusive discounts and promo codes from top stores across Thailand'}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={`/${locale}/auth/register`}
              className="inline-flex items-center justify-center gap-2 bg-[#06B6D4] hover:bg-[#0891b2] text-white px-8 py-3 rounded-lg font-medium transition-all duration-200 shadow-lg shadow-cyan-900/30"
            >
              {locale === 'th' ? 'เริ่มต้นฟรี' : 'Get Started Free'}
            </Link>
            <Link
              href={`/${locale}/dashboard/my-codes`}
              className="inline-flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/20 text-white px-8 py-3 rounded-lg font-medium transition-all duration-200"
            >
              {locale === 'th' ? 'โค้ดของฉัน' : 'My Codes'}
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-10 px-4 border-y border-white/5">
        <div className="max-w-5xl mx-auto grid grid-cols-3 gap-4 md:gap-8 text-center">
          {[
            { value: '500+', label: locale === 'th' ? 'ร้านค้า' : 'Stores' },
            {
              value: '10,000+',
              label: locale === 'th' ? 'โปรโมโค้ด' : 'Promo Codes',
            },
            { value: '฿50M+', label: locale === 'th' ? 'ประหยัดแล้ว' : 'Saved' },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#06B6D4] to-[#F97316]">
                {stat.value}
              </p>
              <p className="text-white/50 text-sm mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Error toast */}
      {claimError && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 bg-red-500/20 border border-red-500/40 text-red-300 px-6 py-3 rounded-xl text-sm shadow-lg">
          {claimError}
        </div>
      )}

      {/* Featured Deals */}
      {!loading && featuredCampaigns.length > 0 && (
        <section className="pt-20 pb-10 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(251,191,36,0.1)',
                  border: '1px solid rgba(251,191,36,0.3)',
                  borderRadius: '20px',
                  padding: '4px 14px',
                }}
              >
                <span style={{ color: '#FBBF24', fontSize: '12px', fontWeight: '700', letterSpacing: '0.05em' }}>
                  ✨ {locale === 'th' ? 'ดีลแนะนำ' : 'Featured Deals'}
                </span>
              </div>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>
                {featuredCampaigns.length} {locale === 'th' ? 'รายการ' : 'campaigns'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredCampaigns.map((campaign) => (
                <FeaturedCampaignCard
                  key={campaign.id}
                  campaign={campaign}
                  locale={locale}
                  onClaim={handleClaim}
                  claiming={claimingId === campaign.id}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* All Deals */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-white">
              {locale === 'th' ? 'ดีลทั้งหมด' : 'All Deals'}
            </h2>
            <Link
              href={`/${locale}/auth/login`}
              className="text-[#67E8F9] hover:text-white text-sm transition-colors"
            >
              {locale === 'th' ? 'ดูทั้งหมด →' : 'View all →'}
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-[#06B6D4] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : campaigns.length === 0 ? (
            <Card className="text-center py-16">
              <p className="text-white/40 text-lg">
                {locale === 'th' ? 'ยังไม่มีดีล' : 'No active deals yet'}
              </p>
              <p className="text-white/25 text-sm mt-2">
                {locale === 'th'
                  ? 'กลับมาใหม่ในภายหลัง'
                  : 'Check back soon for exclusive offers'}
              </p>
            </Card>
          ) : regularCampaigns.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-white/30 text-sm">
                {locale === 'th'
                  ? 'ดีลทั้งหมดอยู่ในส่วน Featured ด้านบน'
                  : 'All deals are featured above'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {regularCampaigns.map((campaign) => (
                <div key={campaign.id} className="relative">
                  {claimingId === campaign.id && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 rounded-xl">
                      <div className="w-6 h-6 border-2 border-[#06B6D4] border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                  <CampaignCard
                    campaign={campaign}
                    locale={locale}
                    onClaim={handleClaim}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Campaign detail hint */}
      {campaigns.length > 0 && (
        <section className="pb-10 px-4">
          <div className="max-w-6xl mx-auto">
            <p className="text-white/30 text-xs text-center">
              {locale === 'th'
                ? 'คลิกที่แคมเปญเพื่อดูรายละเอียด'
                : 'Click a campaign title to view full details'}
            </p>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 px-4 mt-10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-white/40 text-sm">
            {locale === 'th'
              ? '© 2026 Promo Platform Thailand'
              : '© 2026 Promo Platform Thailand'}
          </p>
          <div className="flex items-center gap-4">
            <Link
              href={`/${locale}/auth/login`}
              className="text-white/40 hover:text-white text-sm transition-colors"
            >
              {locale === 'th' ? 'เข้าสู่ระบบ' : 'Login'}
            </Link>
            <Link
              href={`/${locale}/auth/register`}
              className="text-white/40 hover:text-white text-sm transition-colors"
            >
              {locale === 'th' ? 'สมัครสมาชิก' : 'Register'}
            </Link>
          </div>
        </div>
      </footer>

      {/* Code modal */}
      {claimedCode && (
        <CodeModal
          claimedCode={claimedCode}
          onClose={() => setClaimedCode(null)}
          locale={locale}
        />
      )}
    </div>
  );
}
