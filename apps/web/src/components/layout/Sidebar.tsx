'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useEffect, useState } from 'react';


interface NavItem {
  href: string;
  label: string;
  labelTh: string;
  icon: string;
  roles?: string[];
}

export default function Sidebar() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<string>('');
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    if (stored) {
      try {
        const u = JSON.parse(stored);
        setUserRole(u.role || '');
        setUserName(u.name || u.email || '');
      } catch {
        // ignore
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push(`/${locale}/auth/login`);
  };

  const switchLocale = (newLocale: string) => {
    const segments = pathname.split('/');
    segments[1] = newLocale;
    router.push(segments.join('/'));
  };

  const navItems: NavItem[] = [
    {
      href: `/${locale}/dashboard`,
      label: 'Dashboard',
      labelTh: 'แดชบอร์ด',
      icon: '▦',
    },
    {
      href: `/${locale}/dashboard/campaigns`,
      label: 'Campaigns',
      labelTh: 'แคมเปญ',
      icon: '◈',
      roles: ['MERCHANT', 'ADMIN'],
    },
    {
      href: `/${locale}/dashboard/my-codes`,
      label: 'My Codes',
      labelTh: 'โค้ดของฉัน',
      icon: '⊕',
      roles: ['CUSTOMER'],
    },
    {
      href: `/${locale}/dashboard/analytics`,
      label: 'Analytics',
      labelTh: 'วิเคราะห์',
      icon: '◉',
      roles: ['MERCHANT', 'ADMIN'],
    },
    {
      href: `/${locale}/dashboard/integration`,
      label: 'Integration',
      labelTh: 'การเชื่อมต่อ',
      icon: '⚙',
      roles: ['MERCHANT', 'ADMIN'],
    },
    {
      href: `/${locale}/dashboard/billing`,
      label: 'Billing',
      labelTh: 'การชำระเงิน',
      icon: '◈',
      roles: ['MERCHANT', 'ADMIN'],
    },
    {
      href: `/${locale}/dashboard/promotion`,
      label: 'Promotion',
      labelTh: 'โปรโมท',
      icon: '⭐',
      roles: ['MERCHANT', 'ADMIN'],
    },
    {
      href: `/${locale}`,
      label: 'Browse Deals',
      labelTh: 'ดูดีล',
      icon: '◉',
    },
  ];

  const visibleItems = navItems.filter((item) => {
    if (!item.roles) return true;
    return userRole && item.roles.includes(userRole);
  });

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-white/10 flex-shrink-0" style={{ background: '#030712' }}>
      <div className="p-6 border-b border-white/10">
        <Link href={`/${locale}`} className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#06B6D4] to-[#F97316] flex items-center justify-center">
            <span className="text-white font-bold text-sm">P</span>
          </div>
          <span className="text-white font-bold text-lg">Promo</span>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-[#06B6D4]/20 text-white border border-[#06B6D4]/30'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {locale === 'th' ? item.labelTh : item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        {/* Language switcher */}
        <div style={{
          display: 'flex', gap: '4px',
          background: 'rgba(255,255,255,0.06)',
          borderRadius: '8px', padding: '3px',
          marginBottom: '12px',
        }}>
          {(['th', 'en'] as const).map(lng => (
            <button
              key={lng}
              onClick={() => switchLocale(lng)}
              style={{
                flex: 1,
                padding: '5px 0',
                borderRadius: '6px',
                border: 'none',
                background: locale === lng ? 'rgba(6,182,212,0.5)' : 'transparent',
                color: locale === lng ? 'white' : 'rgba(255,255,255,0.4)',
                fontSize: '12px',
                fontWeight: locale === lng ? '700' : '400',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {lng === 'th' ? '🇹🇭 TH' : '🇬🇧 EN'}
            </button>
          ))}
        </div>

        {userName && (
          <div className="mb-3 px-3">
            <p className="text-white text-sm font-medium truncate">{userName}</p>
            <p className="text-white/40 text-xs">{userRole}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full text-left px-3 py-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg text-sm transition-all"
        >
          {locale === 'th' ? 'ออกจากระบบ' : 'Logout'}
        </button>
      </div>
    </aside>
  );
}
