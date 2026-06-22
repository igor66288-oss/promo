'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useEffect, useState } from 'react';

export function MobileNav() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      setUserRole(u.role || '');
    } catch {}
  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push(`/${locale}/auth/login`);
  };

  const th = locale === 'th';

  const isActive = (href: string) =>
    pathname === href ||
    (href !== `/${locale}` && pathname.startsWith(href + '/'));

  const merchantItems = [
    { href: `/${locale}/dashboard`, icon: '▦', label: th ? 'หน้าแรก' : 'Home' },
    { href: `/${locale}/dashboard/campaigns`, icon: '◈', label: th ? 'แคมเปญ' : 'Campaigns' },
    { href: `/${locale}/dashboard/analytics`, icon: '◉', label: th ? 'สถิติ' : 'Stats' },
    { href: `/${locale}/dashboard/billing`, icon: '◎', label: th ? 'บิล' : 'Billing' },
    { href: `/${locale}`, icon: '⊕', label: th ? 'ดีล' : 'Deals' },
  ];

  const customerItems = [
    { href: `/${locale}/account`, icon: '▦', label: th ? 'หน้าแรก' : 'Home' },
    { href: `/${locale}/account/codes`, icon: '◈', label: th ? 'โค้ด' : 'Codes' },
    { href: `/${locale}/account/profile`, icon: '◉', label: th ? 'โปรไฟล์' : 'Profile' },
    { href: `/${locale}`, icon: '⊕', label: th ? 'ดีล' : 'Deals' },
  ];

  const items = ['MERCHANT', 'ADMIN'].includes(userRole) ? merchantItems : customerItems;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-white/10 safe-area-inset-bottom"
      style={{ background: '#030712' }}
    >
      <div className="flex">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs transition-colors min-w-0 ${
              isActive(item.href) ? 'text-[#06B6D4]' : 'text-white/40'
            }`}
          >
            <span className="text-base leading-none">{item.icon}</span>
            <span className="truncate w-full text-center text-[10px]">{item.label}</span>
          </Link>
        ))}
        <button
          onClick={logout}
          className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs text-white/30 min-w-0"
        >
          <span className="text-base leading-none">↩</span>
          <span className="text-[10px]">{th ? 'ออก' : 'Logout'}</span>
        </button>
      </div>
    </nav>
  );
}
