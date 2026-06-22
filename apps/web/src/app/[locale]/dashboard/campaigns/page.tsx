'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Sidebar from '@/components/layout/Sidebar';
import api from '@/lib/api';

interface Campaign {
  id: string;
  title: string;
  discountType: string;
  discountValue: number;
  status: string;
  startsAt: string;
  endsAt: string;
  promoted: boolean;
  promotedUntil?: string | null;
  _count?: { promoCodes: number };
}

interface PromoCodeRow {
  id: string;
  code: string;
  status: string;
  createdAt: string;
  usedAt: string | null;
  user: { id: string; name: string | null; email: string | null } | null;
}

const PROMO_PLANS = [
  { days: 1, price: 99, label: '1 day' },
  { days: 3, price: 249, label: '3 days' },
  { days: 7, price: 499, label: '7 days' },
  { days: 14, price: 899, label: '14 days' },
  { days: 30, price: 1499, label: '30 days' },
];

const statusColors: Record<string, string> = {
  DRAFT: 'bg-white/10 text-white/50',
  ACTIVE: 'bg-green-500/20 text-green-400',
  PAUSED: 'bg-amber-500/20 text-amber-400',
  ENDED: 'bg-red-500/20 text-red-400',
};

const codeStatusColors: Record<string, string> = {
  CREATED: 'bg-blue-500/20 text-blue-400',
  ISSUED: 'bg-green-500/20 text-green-400',
  VIEWED: 'bg-blue-500/20 text-blue-400',
  REDEEMED: 'bg-white/10 text-white/50',
  CONVERTED: 'bg-purple-500/20 text-purple-400',
};

function isActivelyPromoted(c: Campaign): boolean {
  return c.promoted === true && !!c.promotedUntil && new Date(c.promotedUntil) > new Date();
}

export default function CampaignsPage() {
  const t = useTranslations('dashboard');
  const locale = useLocale();
  const router = useRouter();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null);
  const [campaignCodes, setCampaignCodes] = useState<Record<string, PromoCodeRow[]>>({});
  const [codesLoading, setCodesLoading] = useState<string | null>(null);

  // Promote panel state
  const [promoteOpenId, setPromoteOpenId] = useState<string | null>(null);
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [promoteSuccess, setPromoteSuccess] = useState<string | null>(null);
  const [promoteError, setPromoteError] = useState<string>('');

  const [form, setForm] = useState({
    title: '',
    discountType: 'PERCENTAGE',
    discountValue: 10,
    startsAt: new Date().toISOString().split('T')[0],
    endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'DRAFT',
    description: '',
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push(`/${locale}/auth/login`);
      return;
    }
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      const res = await api.get('/campaigns');
      setCampaigns(Array.isArray(res.data) ? res.data : []);
    } catch {
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    try {
      await api.post('/campaigns', {
        ...form,
        discountValue: Number(form.discountValue),
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
      });
      setShowForm(false);
      setForm({
        title: '',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        startsAt: new Date().toISOString().split('T')[0],
        endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'DRAFT',
        description: '',
      });
      await loadCampaigns();
    } catch (err: any) {
      setFormError(err?.response?.data?.message || 'Failed to create campaign');
    } finally {
      setFormLoading(false);
    }
  };

  const toggleCodes = async (campaignId: string) => {
    if (expandedCampaignId === campaignId) {
      setExpandedCampaignId(null);
      return;
    }

    setExpandedCampaignId(campaignId);

    if (!campaignCodes[campaignId]) {
      setCodesLoading(campaignId);
      try {
        const res = await api.get(`/campaigns/${campaignId}/codes`);
        setCampaignCodes((prev) => ({
          ...prev,
          [campaignId]: Array.isArray(res.data) ? res.data : [],
        }));
      } catch {
        setCampaignCodes((prev) => ({ ...prev, [campaignId]: [] }));
      } finally {
        setCodesLoading(null);
      }
    }
  };

  const handlePromote = async (campaignId: string, days: number) => {
    setPromoteError('');
    setPromotingId(campaignId);
    try {
      const res = await api.post(`/campaigns/${campaignId}/promote`, { days });
      setPromoteSuccess(campaignId);
      setPromoteOpenId(null);
      setTimeout(() => setPromoteSuccess(null), 3000);
      await loadCampaigns();
    } catch (err: any) {
      setPromoteError(err?.response?.data?.message || 'Failed to promote campaign');
      setTimeout(() => setPromoteError(''), 4000);
    } finally {
      setPromotingId(null);
    }
  };

  const discountLabel = (c: Campaign) => {
    if (c.discountType === 'PERCENTAGE') return `${c.discountValue}%`;
    if (c.discountType === 'FIXED') return `฿${c.discountValue}`;
    return 'GIFT';
  };

  return (
    <div className="min-h-screen bg-[#030712] flex">
      <Sidebar />

      {/* Main */}
      <main className="flex-1 p-4 md:p-8 pb-20 md:pb-8 overflow-auto">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white">{t('campaigns')}</h1>
              <p className="text-white/50 text-sm mt-1">
                {locale === 'th'
                  ? `${campaigns.length} แคมเปญทั้งหมด`
                  : `${campaigns.length} total campaigns`}
              </p>
            </div>
            <Button onClick={() => setShowForm(!showForm)}>
              {showForm
                ? locale === 'th'
                  ? 'ยกเลิก'
                  : 'Cancel'
                : t('newCampaign')}
            </Button>
          </div>

          {/* Promote success toast */}
          {promoteSuccess && (
            <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 text-sm flex items-center gap-2">
              <span>✓</span>
              <span>{locale === 'th' ? 'โปรโมทแคมเปญสำเร็จ!' : 'Campaign promoted successfully!'}</span>
            </div>
          )}

          {/* Promote error toast */}
          {promoteError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {promoteError}
            </div>
          )}

          {/* Create Form */}
          {showForm && (
            <Card className="mb-8">
              <h2 className="text-white font-semibold mb-6">{t('newCampaign')}</h2>
              {formError && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                  {formError}
                </div>
              )}
              <form
                onSubmit={handleCreate}
                className="grid grid-cols-1 md:grid-cols-2 gap-5"
              >
                <div className="md:col-span-2">
                  <label className="block text-white/70 text-sm font-medium mb-2">
                    {t('campaignTitle')}
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                    placeholder={locale === 'th' ? 'ชื่อแคมเปญ' : 'Campaign title'}
                    className="w-full bg-white/5 border border-white/15 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#06B6D4] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-white/70 text-sm font-medium mb-2">
                    {t('discountType')}
                  </label>
                  <select
                    value={form.discountType}
                    onChange={(e) =>
                      setForm({ ...form, discountType: e.target.value })
                    }
                    className="w-full bg-[#0F172A] border border-white/15 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#06B6D4] transition-colors"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Fixed (฿)</option>
                    <option value="GIFT">Gift</option>
                  </select>
                </div>

                <div>
                  <label className="block text-white/70 text-sm font-medium mb-2">
                    {t('discountValue')}
                  </label>
                  <input
                    type="number"
                    value={form.discountValue}
                    onChange={(e) =>
                      setForm({ ...form, discountValue: Number(e.target.value) })
                    }
                    required
                    min={0}
                    className="w-full bg-white/5 border border-white/15 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#06B6D4] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-white/70 text-sm font-medium mb-2">
                    {t('startsAt')}
                  </label>
                  <input
                    type="date"
                    value={form.startsAt}
                    onChange={(e) =>
                      setForm({ ...form, startsAt: e.target.value })
                    }
                    required
                    className="w-full bg-white/5 border border-white/15 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#06B6D4] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-white/70 text-sm font-medium mb-2">
                    {t('endsAt')}
                  </label>
                  <input
                    type="date"
                    value={form.endsAt}
                    onChange={(e) =>
                      setForm({ ...form, endsAt: e.target.value })
                    }
                    required
                    className="w-full bg-white/5 border border-white/15 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#06B6D4] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-white/70 text-sm font-medium mb-2">
                    {t('status')}
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value })
                    }
                    className="w-full bg-[#0F172A] border border-white/15 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#06B6D4] transition-colors"
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="ACTIVE">Active</option>
                  </select>
                </div>

                <div className="md:col-span-2 flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowForm(false)}
                  >
                    {locale === 'th' ? 'ยกเลิก' : 'Cancel'}
                  </Button>
                  <Button type="submit" loading={formLoading}>
                    {t('create')}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Campaigns List */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-[#06B6D4] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : campaigns.length === 0 ? (
            <Card className="text-center py-12">
              <p className="text-white/40 text-lg mb-2">
                {locale === 'th' ? 'ยังไม่มีแคมเปญ' : 'No campaigns yet'}
              </p>
              <p className="text-white/30 text-sm">
                {locale === 'th'
                  ? 'สร้างแคมเปญแรกของคุณเพื่อเริ่มต้น'
                  : 'Create your first campaign to get started'}
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {campaigns.map((campaign) => {
                const activelyPromoted = isActivelyPromoted(campaign);
                const canPromote = campaign.status === 'ACTIVE' && !activelyPromoted;
                const isPromotePanelOpen = promoteOpenId === campaign.id;

                return (
                  <div key={campaign.id}>
                    <Card
                      style={activelyPromoted ? {
                        border: '1px solid rgba(251,191,36,0.35)',
                        background: 'linear-gradient(135deg, rgba(251,191,36,0.05), rgba(6,182,212,0.05))',
                      } : undefined}
                    >
                      <div className="flex flex-col gap-3">
                        {/* Top row: badge + title */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#06B6D4] to-[#F97316] flex items-center justify-center text-white font-bold flex-shrink-0 text-sm">
                            {discountLabel(campaign)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-white font-medium truncate">
                                {campaign.title}
                              </h3>
                              {activelyPromoted && (
                                <span
                                  style={{
                                    padding: '2px 8px',
                                    background: 'rgba(251,191,36,0.15)',
                                    border: '1px solid rgba(251,191,36,0.4)',
                                    borderRadius: '20px',
                                    color: '#FBBF24',
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    flexShrink: 0,
                                  }}
                                >
                                  ⭐ {locale === 'th' ? 'กำลังโปรโมท' : 'Promoted'}
                                  {campaign.promotedUntil && (
                                    <span style={{ fontWeight: '400', opacity: 0.7, marginLeft: '4px' }}>
                                      until {new Date(campaign.promotedUntil).toLocaleDateString()}
                                    </span>
                                  )}
                                </span>
                              )}
                            </div>
                            <p className="text-white/40 text-xs mt-0.5">
                              {new Date(campaign.startsAt).toLocaleDateString()} –{' '}
                              {new Date(campaign.endsAt).toLocaleDateString()}
                              {campaign._count != null &&
                                ` · ${campaign._count.promoCodes} ${locale === 'th' ? 'โค้ด' : 'codes'}`}
                            </p>
                          </div>
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                              statusColors[campaign.status] || statusColors.DRAFT
                            }`}
                          >
                            {campaign.status}
                          </span>
                        </div>

                        {/* Bottom row: action buttons */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {canPromote && (
                            <button
                              onClick={() =>
                                setPromoteOpenId(isPromotePanelOpen ? null : campaign.id)
                              }
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '5px 10px',
                                background: isPromotePanelOpen
                                  ? 'rgba(251,191,36,0.25)'
                                  : 'rgba(251,191,36,0.1)',
                                border: '1px solid rgba(251,191,36,0.4)',
                                borderRadius: '8px',
                                color: '#FBBF24',
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor: 'pointer',
                              }}
                            >
                              ⭐ {locale === 'th' ? 'โปรโมท' : 'Promote'}
                            </button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => router.push(`/${locale}/dashboard/campaigns/${campaign.id}/roulette`)}
                          >
                            🎰 Roulette
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleCodes(campaign.id)}
                          >
                            {expandedCampaignId === campaign.id
                              ? locale === 'th' ? 'ซ่อนโค้ด' : 'Hide Codes'
                              : locale === 'th' ? 'ดูโค้ด' : 'View Codes'}
                          </Button>
                        </div>
                      </div>
                    </Card>

                    {/* Promote panel */}
                    {isPromotePanelOpen && (
                      <div
                        style={{
                          marginTop: '4px',
                          marginLeft: '4px',
                          background: 'rgba(251,191,36,0.05)',
                          border: '1px solid rgba(251,191,36,0.2)',
                          borderRadius: '12px',
                          padding: '20px',
                        }}
                      >
                        <div style={{ marginBottom: '14px' }}>
                          <p style={{ color: '#FBBF24', fontWeight: '700', fontSize: '14px', marginBottom: '4px' }}>
                            ⭐ {locale === 'th' ? 'เลือกแผนโปรโมท' : 'Choose Promotion Plan'}
                          </p>
                          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>
                            {locale === 'th'
                              ? 'ค่าใช้จ่ายจะถูกหักจากยอดคงเหลือทันที'
                              : 'Cost is deducted from your balance instantly'}
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                          {PROMO_PLANS.map((plan) => (
                            <button
                              key={plan.days}
                              disabled={promotingId === campaign.id}
                              onClick={() => handlePromote(campaign.id, plan.days)}
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                padding: '12px 18px',
                                background: 'rgba(255,255,255,0.04)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '10px',
                                cursor: promotingId === campaign.id ? 'not-allowed' : 'pointer',
                                opacity: promotingId === campaign.id ? 0.6 : 1,
                                transition: 'background 0.15s, border-color 0.15s',
                                minWidth: '90px',
                              }}
                              onMouseEnter={(e) => {
                                (e.currentTarget as HTMLElement).style.background = 'rgba(251,191,36,0.12)';
                                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(251,191,36,0.4)';
                              }}
                              onMouseLeave={(e) => {
                                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
                                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)';
                              }}
                            >
                              <span style={{ color: '#FBBF24', fontWeight: '800', fontSize: '18px', lineHeight: 1 }}>
                                ฿{plan.price}
                              </span>
                              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', marginTop: '4px' }}>
                                {plan.label}
                              </span>
                            </button>
                          ))}
                        </div>
                        {promotingId === campaign.id && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                            <div className="w-4 h-4 border-2 border-[#FBBF24] border-t-transparent rounded-full animate-spin" />
                            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>
                              {locale === 'th' ? 'กำลังดำเนินการ...' : 'Processing...'}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Codes panel */}
                    {expandedCampaignId === campaign.id && (
                      <div className="mt-1 ml-4 bg-white/3 border border-white/5 rounded-xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                          <h4 className="text-white/70 text-sm font-medium">
                            {locale === 'th' ? 'โปรโมโค้ด' : 'Promo Codes'}
                          </h4>
                          <span className="text-white/40 text-xs">
                            {campaignCodes[campaign.id]?.length ?? 0}{' '}
                            {locale === 'th' ? 'รายการ' : 'items'}
                          </span>
                        </div>

                        {codesLoading === campaign.id ? (
                          <div className="flex justify-center py-8">
                            <div className="w-5 h-5 border-2 border-[#06B6D4] border-t-transparent rounded-full animate-spin" />
                          </div>
                        ) : (campaignCodes[campaign.id] ?? []).length === 0 ? (
                          <div className="text-center py-8 text-white/30 text-sm">
                            {locale === 'th'
                              ? 'ยังไม่มีโค้ดที่ถูกรับ'
                              : 'No codes claimed yet'}
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-white/5">
                                  <th className="text-left text-white/40 font-medium px-6 py-3">
                                    {locale === 'th' ? 'โค้ด' : 'Code'}
                                  </th>
                                  <th className="text-left text-white/40 font-medium px-4 py-3">
                                    {locale === 'th' ? 'ผู้ใช้' : 'User'}
                                  </th>
                                  <th className="text-left text-white/40 font-medium px-4 py-3">
                                    {locale === 'th' ? 'สถานะ' : 'Status'}
                                  </th>
                                  <th className="text-left text-white/40 font-medium px-4 py-3">
                                    {locale === 'th' ? 'รับเมื่อ' : 'Claimed'}
                                  </th>
                                  <th className="text-left text-white/40 font-medium px-4 py-3">
                                    {locale === 'th' ? 'ใช้เมื่อ' : 'Used'}
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {(campaignCodes[campaign.id] ?? []).map((row) => (
                                  <tr
                                    key={row.id}
                                    className="border-b border-white/5 hover:bg-white/3 transition-colors"
                                  >
                                    <td className="px-6 py-3">
                                      <code className="font-mono text-white text-xs tracking-wider">
                                        {row.code}
                                      </code>
                                    </td>
                                    <td className="px-4 py-3 text-white/60">
                                      {row.user
                                        ? row.user.name || row.user.email || row.user.id
                                        : '—'}
                                    </td>
                                    <td className="px-4 py-3">
                                      <span
                                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                                          codeStatusColors[row.status] ||
                                          codeStatusColors.ISSUED
                                        }`}
                                      >
                                        {row.status}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-white/40 text-xs">
                                      {new Date(row.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-3 text-white/40 text-xs">
                                      {row.usedAt
                                        ? new Date(row.usedAt).toLocaleDateString()
                                        : '—'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
