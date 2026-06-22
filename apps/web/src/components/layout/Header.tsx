'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';

export function Header() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      try { setUser(JSON.parse(userData)); } catch {}
    }
  }, []);

  // Переключаем локаль: заменяем /th/... на /en/... или наоборот
  const switchLocale = (newLocale: string) => {
    const segments = pathname.split('/');
    segments[1] = newLocale; // первый сегмент после / — это локаль
    router.push(segments.join('/'));
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    router.push(`/${locale}/auth/login`);
  };

  return (
    <header style={{
      background: 'rgba(3,7,18,0.95)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      padding: '0 24px',
      height: '60px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      {/* Logo */}
      <Link href={`/${locale}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '8px',
          background: 'linear-gradient(135deg, #06B6D4, #F97316)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '16px', fontWeight: '800', color: 'white',
        }}>P</div>
        <span style={{ fontWeight: '800', fontSize: '18px', color: 'white' }}>Promo</span>
      </Link>

      {/* Right side */}
      <div className="flex items-center gap-1 sm:gap-3">
        {/* Language switcher */}
        <div className="flex gap-0.5 rounded-lg p-0.5" style={{ background: 'rgba(255,255,255,0.06)' }}>
          {(['th', 'en'] as const).map(lng => (
            <button
              key={lng}
              onClick={() => switchLocale(lng)}
              className="rounded-md text-xs font-medium cursor-pointer transition-all px-2 py-1 sm:px-2.5"
              style={{
                border: 'none',
                background: locale === lng ? 'rgba(6,182,212,0.5)' : 'transparent',
                color: locale === lng ? 'white' : 'rgba(255,255,255,0.5)',
                fontWeight: locale === lng ? '700' : '400',
              }}
            >
              {lng === 'th' ? 'TH' : 'EN'}
            </button>
          ))}
        </div>

        {/* Auth */}
        {user ? (
          <div className="flex items-center gap-1 sm:gap-2">
            <Link href={`/${locale}/${user?.role === 'CUSTOMER' ? 'account' : 'dashboard'}`} className="text-xs sm:text-sm font-semibold px-2 sm:px-3 py-1.5 rounded-lg" style={{
              background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.2)', color: '#67E8F9', textDecoration: 'none',
            }}>
              {user?.role === 'CUSTOMER' ? (locale === 'th' ? 'บัญชีของฉัน' : 'My Account') : (locale === 'th' ? 'แดชบอร์ด' : 'Dashboard')}
            </Link>
            <button onClick={logout} className="hidden sm:block text-xs px-3 py-1.5 rounded-lg cursor-pointer" style={{
              background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)',
            }}>
              {locale === 'th' ? 'ออก' : 'Logout'}
            </button>
          </div>
        ) : (
          <div className="flex gap-1 sm:gap-2">
            <Link href={`/${locale}/auth/login`} className="hidden sm:inline-flex text-xs sm:text-sm px-2 sm:px-3 py-1.5 rounded-lg" style={{
              background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', textDecoration: 'none',
            }}>
              {locale === 'th' ? 'เข้าสู่ระบบ' : 'Login'}
            </Link>
            <Link href={`/${locale}/auth/register`} className="text-xs sm:text-sm font-semibold px-2 sm:px-3 py-1.5 rounded-lg" style={{
              background: 'linear-gradient(135deg, #06B6D4, #F97316)', color: 'white', textDecoration: 'none',
            }}>
              {locale === 'th' ? 'สมัคร' : 'Register'}
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;
