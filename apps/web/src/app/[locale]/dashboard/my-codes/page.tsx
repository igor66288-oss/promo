'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  discountType: 'PERCENTAGE' | 'FIXED' | 'GIFT';
  discountValue: number;
  store: Store;
}

interface PromoCode {
  id: string;
  code: string;
  status: 'CREATED' | 'ISSUED' | 'VIEWED' | 'REDEEMED' | 'CONVERTED';
  expiresAt: string | null;
  usedAt: string | null;
  createdAt: string;
  campaign: Campaign;
}

const statusConfig: Record<string, { label: string; labelTh: string; classes: string }> = {
  ISSUED: {
    label: 'Active',
    labelTh: 'ใช้ได้',
    classes: 'bg-green-500/20 text-green-400 border-green-500/30',
  },
  CREATED: {
    label: 'Active',
    labelTh: 'ใช้ได้',
    classes: 'bg-green-500/20 text-green-400 border-green-500/30',
  },
  VIEWED: {
    label: 'Viewed',
    labelTh: 'ดูแล้ว',
    classes: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  },
  REDEEMED: {
    label: 'Used',
    labelTh: 'ใช้แล้ว',
    classes: 'bg-white/10 text-white/50 border-white/20',
  },
  CONVERTED: {
    label: 'Converted',
    labelTh: 'แปลงแล้ว',
    classes: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  },
};

function discountLabel(c: Campaign): string {
  if (c.discountType === 'PERCENTAGE') return `${c.discountValue}% OFF`;
  if (c.discountType === 'FIXED') return `฿${c.discountValue} OFF`;
  return 'GIFT';
}

function CodeCard({ code, locale }: { code: PromoCode; locale: string }) {
  const [copied, setCopied] = useState(false);
  const status = statusConfig[code.status] || statusConfig.ISSUED;

  const copyCode = async () => {
    copyToClipboard(code.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isExpired =
    code.expiresAt ? new Date(code.expiresAt) < new Date() : false;

  return (
    <Card className="flex flex-col gap-4">
      {/* Header: store + campaign */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#06B6D4] to-[#F97316] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {code.campaign.store.name[0]}
          </div>
          <div className="min-w-0">
            <p className="text-white/50 text-xs truncate">
              {code.campaign.store.name}
            </p>
            <p className="text-white text-sm font-medium truncate">
              {code.campaign.title}
            </p>
          </div>
        </div>
        <span
          className={`flex-shrink-0 ml-2 px-2 py-0.5 rounded-md text-xs font-semibold border ${status.classes}`}
        >
          {locale === 'th' ? status.labelTh : status.label}
        </span>
      </div>

      {/* Code */}
      <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
        <code
          className={`text-lg font-mono font-bold tracking-widest select-all ${
            isExpired || code.status === 'REDEEMED' || code.status === 'CONVERTED'
              ? 'text-white/30 line-through'
              : 'text-white'
          }`}
        >
          {code.code}
        </code>
        <button
          onClick={copyCode}
          disabled={isExpired || code.status === 'REDEEMED' || code.status === 'CONVERTED'}
          className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg bg-[#06B6D4]/20 hover:bg-[#06B6D4]/40 text-[#67E8F9] hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {copied ? (locale === 'th' ? 'คัดลอก!' : 'Copied!') : locale === 'th' ? 'คัดลอก' : 'Copy'}
        </button>
      </div>

      {/* Discount + dates */}
      <div className="flex items-center justify-between text-xs text-white/40">
        <span className="font-medium text-white/60">{discountLabel(code.campaign)}</span>
        <div className="text-right">
          {code.usedAt ? (
            <span>
              {locale === 'th' ? 'ใช้เมื่อ: ' : 'Used: '}
              {new Date(code.usedAt).toLocaleDateString()}
            </span>
          ) : code.expiresAt ? (
            <span className={isExpired ? 'text-red-400' : ''}>
              {isExpired
                ? locale === 'th'
                  ? 'หมดอายุแล้ว'
                  : 'Expired'
                : `${locale === 'th' ? 'หมดอายุ: ' : 'Exp: '}${new Date(code.expiresAt).toLocaleDateString()}`}
            </span>
          ) : (
            <span>{locale === 'th' ? 'ไม่มีวันหมดอายุ' : 'No expiry'}</span>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function MyCodesPage() {
  const locale = useLocale();
  const router = useRouter();

  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'USED'>('ALL');

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      router.push(`/${locale}/auth/login`);
      return;
    }

    api
      .get('/my/codes')
      .then((res) => setCodes(Array.isArray(res.data) ? res.data : []))
      .catch(() => setCodes([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = codes.filter((c) => {
    if (filter === 'ALL') return true;
    if (filter === 'ACTIVE')
      return c.status === 'ISSUED' || c.status === 'CREATED' || c.status === 'VIEWED';
    if (filter === 'USED')
      return c.status === 'REDEEMED' || c.status === 'CONVERTED';
    return true;
  });

  return (
    <div className="min-h-screen bg-[#030712] flex">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-white/10 flex-shrink-0">
        <div className="p-6 border-b border-white/10">
          <Link href={`/${locale}`} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#06B6D4] to-[#F97316] flex items-center justify-center">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <span className="text-white font-bold text-lg">Promo</span>
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {[
            {
              href: `/${locale}/dashboard`,
              label: locale === 'th' ? 'แดชบอร์ด' : 'Dashboard',
              icon: '▦',
            },
            {
              href: `/${locale}/dashboard/my-codes`,
              label: locale === 'th' ? 'โค้ดของฉัน' : 'My Codes',
              icon: '◈',
              active: true,
            },
            {
              href: `/${locale}`,
              label: locale === 'th' ? 'ดูดีล' : 'Browse Deals',
              icon: '◉',
            },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                item.active
                  ? 'bg-[#06B6D4]/20 text-white border border-[#06B6D4]/30'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10">
          <button
            onClick={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              router.push(`/${locale}/auth/login`);
            }}
            className="w-full text-left px-3 py-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg text-sm transition-all"
          >
            {locale === 'th' ? 'ออกจากระบบ' : 'Logout'}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-4 md:p-8 pb-20 md:pb-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white">
              {locale === 'th' ? 'โค้ดของฉัน' : 'My Promo Codes'}
            </h1>
            <p className="text-white/50 text-sm mt-1">
              {locale === 'th'
                ? `${codes.length} โค้ดทั้งหมด`
                : `${codes.length} total codes`}
            </p>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 mb-6">
            {(
              [
                { value: 'ALL', label: locale === 'th' ? 'ทั้งหมด' : 'All' },
                { value: 'ACTIVE', label: locale === 'th' ? 'ใช้ได้' : 'Active' },
                { value: 'USED', label: locale === 'th' ? 'ใช้แล้ว' : 'Used' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filter === tab.value
                    ? 'bg-[#06B6D4] text-white'
                    : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-2 border-[#06B6D4] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <Card className="text-center py-16">
              <p className="text-white/40 text-lg mb-2">
                {filter === 'ALL'
                  ? locale === 'th'
                    ? 'คุณยังไม่มีโค้ด'
                    : "You don't have any codes yet"
                  : locale === 'th'
                    ? 'ไม่มีโค้ดในหมวดนี้'
                    : 'No codes in this category'}
              </p>
              {filter === 'ALL' && (
                <Link
                  href={`/${locale}`}
                  className="inline-flex mt-4 items-center gap-2 bg-[#06B6D4] hover:bg-[#0891b2] text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
                >
                  {locale === 'th' ? 'รับโค้ดเลย' : 'Browse Deals'}
                </Link>
              )}
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((code) => (
                <CodeCard key={code.id} code={code} locale={locale} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
