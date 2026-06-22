'use client';

import { usePathname } from 'next/navigation';
import { Header } from './Header';

export function ConditionalHeader() {
  const pathname = usePathname();
  // Не показываем глобальный Header на страницах dashboard
  // (там есть свой Sidebar с навигацией и переключателем языка)
  const isDashboard = pathname.includes('/dashboard');
  if (isDashboard) return null;
  return <Header />;
}
