import { MobileNav } from '@/components/layout/MobileNav';

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <MobileNav />
    </>
  );
}
