'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { Card, CardContent } from '@/components/ui/Card';
import Sidebar from '@/components/layout/Sidebar';
import api from '@/lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface Stats {
  totalCampaigns: number;
  activeCodes: number;
  balance: number;
  impressions: number;
  clicks: number;
  conversions: number;
}

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const locale = useLocale();
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<Stats>({ totalCampaigns: 0, activeCodes: 0, balance: 0, impressions: 0, clicks: 0, conversions: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (!token) {
      router.push(`/${locale}/auth/login`);
      return;
    }

    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [campaignsRes, analyticsRes] = await Promise.all([
        api.get('/campaigns').catch(() => ({ data: [] })),
        api.get('/analytics/store?days=30').catch(() => ({ data: null })),
      ]);

      const campaigns = Array.isArray(campaignsRes.data) ? campaignsRes.data : [];
      const analytics = analyticsRes.data;

      setStats({
        totalCampaigns: campaigns.length,
        activeCodes: analytics?.codes?.total ?? campaigns.reduce((acc: number, c: any) => acc + (c._count?.promoCodes || 0), 0),
        balance: analytics?.store?.balance ?? 0,
        impressions: analytics?.funnel?.impressions ?? 0,
        clicks: analytics?.funnel?.clicks ?? 0,
        conversions: analytics?.funnel?.conversions ?? 0,
      });
    } catch {
      // Stats not critical — keep defaults
    } finally {
      setLoading(false);
    }
  };


  const statCards = [
    {
      label: t('totalCampaigns'),
      value: stats.totalCampaigns,
      gradient: 'from-cyan-600 to-cyan-800',
      icon: '◈',
    },
    {
      label: t('activeCodes'),
      value: stats.activeCodes,
      gradient: 'from-orange-600 to-orange-800',
      icon: '⊕',
    },
    {
      label: t('revenue'),
      value: `฿${(stats.balance / 100).toLocaleString()}`,
      gradient: 'from-amber-600 to-amber-800',
      icon: '◎',
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#06B6D4] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8 pb-20 md:pb-8 overflow-auto">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
            <p className="text-white/50 text-sm mt-1">
              {locale === 'th'
                ? `ยินดีต้อนรับกลับ, ${user?.name || user?.email}`
                : `Welcome back, ${user?.name || user?.email}`}
            </p>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {statCards.map((stat) => (
              <Card key={stat.label}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-white/40 text-sm">{stat.label}</span>
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${stat.gradient} flex items-center justify-center text-white text-sm`}>
                    {stat.icon}
                  </div>
                </div>
                <p className="text-3xl font-bold text-white">{stat.value}</p>
              </Card>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-semibold">{t('campaigns')}</h2>
                <Link
                  href={`/${locale}/dashboard/campaigns`}
                  className="text-[#67E8F9] hover:text-white text-sm transition-colors"
                >
                  {locale === 'th' ? 'ดูทั้งหมด →' : 'View all →'}
                </Link>
              </div>
              <CardContent>
                <p className="text-white/40 text-sm">
                  {locale === 'th'
                    ? 'จัดการแคมเปญส่วนลดและโปรโมโค้ดของคุณ'
                    : 'Manage your discount campaigns and promo codes'}
                </p>
                <Link
                  href={`/${locale}/dashboard/campaigns`}
                  className="inline-flex items-center mt-4 gap-2 bg-[#06B6D4] hover:bg-[#0891b2] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  {t('newCampaign')}
                </Link>
              </CardContent>
            </Card>

            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-semibold">{t('analytics')}</h2>
                <Link
                  href={`/${locale}/dashboard/analytics`}
                  className="text-[#67E8F9] hover:text-white text-sm transition-colors"
                >
                  {locale === 'th' ? 'ดูทั้งหมด →' : 'View all →'}
                </Link>
              </div>
              <CardContent>
                <p className="text-white/40 text-sm">
                  {locale === 'th'
                    ? 'ติดตามประสิทธิภาพแคมเปญและ ROI'
                    : 'Track campaign performance and ROI'}
                </p>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[
                    { label: locale === 'th' ? 'การแสดงผล' : 'Impressions', value: stats.impressions.toLocaleString() },
                    { label: locale === 'th' ? 'คลิก' : 'Clicks', value: stats.clicks.toLocaleString() },
                    { label: locale === 'th' ? 'แปลง' : 'Conversions', value: stats.conversions.toLocaleString() },
                  ].map((m) => (
                    <div key={m.label} className="bg-white/5 rounded-lg p-3 text-center">
                      <p className="text-white font-semibold text-lg">{m.value}</p>
                      <p className="text-white/40 text-xs mt-1">{m.label}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
