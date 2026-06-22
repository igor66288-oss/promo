import type { Metadata } from 'next';
import { Sarabun } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { ConditionalHeader } from '@/components/layout/ConditionalHeader';
import '../globals.css';

const sarabun = Sarabun({
  subsets: ['latin', 'thai'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sarabun',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Promo - Thailand Deals Platform',
  description: 'Find the best promo codes and discounts in Thailand',
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as any)) notFound();

  const messages = await getMessages();

  return (
    <html lang={locale} className={sarabun.variable}>
      <body className={`${sarabun.className} bg-[#030712] text-white min-h-screen`}>
        <NextIntlClientProvider messages={messages}>
          <ConditionalHeader />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
