import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getLocale } from 'next-intl/server';
import { ClaimButton } from './ClaimButton';

interface Store {
  id: string;
  name: string;
  logo: string | null;
  website: string | null;
}

interface Campaign {
  id: string;
  title: string;
  description: string | null;
  discountType: 'PERCENTAGE' | 'FIXED' | 'GIFT';
  discountValue: number;
  conditions: string | null;
  startsAt: string;
  endsAt: string;
  totalLimit: number | null;
  perUserLimit: number;
  status: string;
  promoted: boolean;
  store: Store;
  _count: { promoCodes: number };
}

async function getCampaign(id: string): Promise<Campaign | null> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/campaigns/${id}`,
      { cache: 'no-store' },
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function discountLabel(c: Campaign): string {
  if (c.discountType === 'PERCENTAGE') return `${c.discountValue}% OFF`;
  if (c.discountType === 'FIXED') return `฿${c.discountValue} OFF`;
  return 'FREE GIFT';
}

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale: paramLocale } = await params;
  const locale = await getLocale();
  const campaign = await getCampaign(id);

  if (!campaign) notFound();

  const startsAt = new Date(campaign.startsAt);
  const endsAt = new Date(campaign.endsAt);
  const now = new Date();
  const isActive =
    campaign.status === 'ACTIVE' && now >= startsAt && now <= endsAt;
  const daysLeft = Math.max(
    0,
    Math.ceil((endsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
  );

  const typeColors: Record<string, string> = {
    PERCENTAGE: 'from-cyan-500 to-cyan-700',
    FIXED: 'from-orange-500 to-orange-700',
    GIFT: 'from-amber-500 to-orange-600',
  };

  return (
    <div className="min-h-screen bg-[#030712]">
      {/* Top bar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#030712]/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
          <Link
            href={`/${locale}`}
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm"
          >
            ← {locale === 'th' ? 'กลับ' : 'Back'}
          </Link>
          <div className="flex items-center gap-2 ml-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#06B6D4] to-[#F97316] flex items-center justify-center">
              <span className="text-white font-bold text-xs">P</span>
            </div>
            <span className="text-white font-bold">Promo</span>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Hero card */}
          <div
            className={`bg-gradient-to-br ${typeColors[campaign.discountType] || typeColors.PERCENTAGE} rounded-2xl p-8 mb-6 text-center shadow-2xl`}
          >
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4">
              {campaign.store.name[0]}
            </div>
            <p className="text-white/80 text-sm font-medium mb-2">
              {campaign.store.name}
            </p>
            <h1 className="text-white text-2xl font-bold mb-3">
              {campaign.title}
            </h1>
            <div className="inline-flex items-center bg-white/20 rounded-xl px-6 py-3">
              <span className="text-white text-3xl font-extrabold tracking-wide">
                {discountLabel(campaign)}
              </span>
            </div>
          </div>

          {/* Details card */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
            {campaign.description && (
              <div className="mb-6">
                <h2 className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-2">
                  {locale === 'th' ? 'รายละเอียด' : 'Description'}
                </h2>
                <p className="text-white/80 text-sm leading-relaxed">
                  {campaign.description}
                </p>
              </div>
            )}

            {campaign.conditions && (
              <div className="mb-6">
                <h2 className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-2">
                  {locale === 'th' ? 'เงื่อนไข' : 'Conditions'}
                </h2>
                <p className="text-white/80 text-sm leading-relaxed">
                  {campaign.conditions}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-white/40 text-xs mb-1">
                  {locale === 'th' ? 'เริ่มต้น' : 'Starts'}
                </p>
                <p className="text-white text-sm font-medium">
                  {startsAt.toLocaleDateString()}
                </p>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-white/40 text-xs mb-1">
                  {locale === 'th' ? 'สิ้นสุด' : 'Ends'}
                </p>
                <p className="text-white text-sm font-medium">
                  {endsAt.toLocaleDateString()}
                </p>
              </div>
              {daysLeft > 0 && (
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-white/40 text-xs mb-1">
                    {locale === 'th' ? 'เหลืออีก' : 'Time Left'}
                  </p>
                  <p className="text-white text-sm font-medium">
                    {daysLeft} {locale === 'th' ? 'วัน' : 'days'}
                  </p>
                </div>
              )}
              {campaign.totalLimit && (
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-white/40 text-xs mb-1">
                    {locale === 'th' ? 'จำนวนจำกัด' : 'Total Limit'}
                  </p>
                  <p className="text-white text-sm font-medium">
                    {campaign._count.promoCodes} / {campaign.totalLimit}{' '}
                    {locale === 'th' ? 'ใช้แล้ว' : 'used'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Claim area */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            {!isActive ? (
              <div className="text-center py-4">
                <p className="text-white/40 text-lg mb-1">
                  {campaign.status !== 'ACTIVE'
                    ? locale === 'th'
                      ? 'แคมเปญนี้ไม่พร้อมใช้งาน'
                      : 'This campaign is not active'
                    : locale === 'th'
                      ? 'แคมเปญสิ้นสุดแล้ว'
                      : 'This campaign has ended'}
                </p>
                <p className="text-white/25 text-sm">
                  {locale === 'th'
                    ? 'ลองดูดีลอื่นๆ'
                    : 'Check out other deals'}
                </p>
                <Link
                  href={`/${locale}`}
                  className="inline-flex mt-4 items-center gap-2 text-[#67E8F9] hover:text-white text-sm transition-colors"
                >
                  {locale === 'th' ? '← ดูดีลทั้งหมด' : '← Browse all deals'}
                </Link>
              </div>
            ) : (
              <ClaimButton campaignId={campaign.id} locale={locale} />
            )}
          </div>

          {/* Store link */}
          {campaign.store.website && (
            <p className="text-center mt-4 text-white/30 text-xs">
              {locale === 'th' ? 'เว็บไซต์ร้านค้า: ' : 'Store website: '}
              <a
                href={campaign.store.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#67E8F9] hover:text-white transition-colors"
              >
                {campaign.store.website}
              </a>
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
