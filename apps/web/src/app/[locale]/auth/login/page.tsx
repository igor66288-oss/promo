'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/Button';
import api from '@/lib/api';

export default function LoginPage() {
  const t = useTranslations('auth');
  const nav = useTranslations('nav');
  const locale = useLocale();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      router.push(`/${locale}/dashboard`);
    } catch {
      setError(t('loginError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href={`/${locale}`} className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#06B6D4] to-[#F97316] flex items-center justify-center">
              <span className="text-white font-bold">P</span>
            </div>
            <span className="text-white font-bold text-2xl">Promo</span>
          </Link>
          <h1 className="text-2xl font-bold text-white mb-2">{t('login')}</h1>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-white/70 text-sm font-medium mb-2">
                {t('email')}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full bg-white/5 border border-white/15 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#06B6D4] transition-colors"
              />
            </div>

            <div>
              <label className="block text-white/70 text-sm font-medium mb-2">
                {t('password')}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/15 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#06B6D4] transition-colors"
              />
            </div>

            <Button type="submit" loading={loading} className="w-full" size="lg">
              {t('submit')}
            </Button>
          </form>

          <p className="mt-6 text-center text-white/50 text-sm">
            {t('noAccount')}{' '}
            <Link
              href={`/${locale}/auth/register`}
              className="text-[#67E8F9] hover:text-white transition-colors"
            >
              {t('register')}
            </Link>
          </p>
        </div>

        <div className="mt-4 p-4 bg-white/5 rounded-lg border border-white/10">
          <p className="text-white/50 text-xs text-center mb-2">
            {locale === 'th' ? 'บัญชีทดสอบ' : 'Demo credentials'}
          </p>
          <div className="space-y-1 text-xs text-white/40 text-center">
            <p>admin@promo.th / Admin123!</p>
            <p>merchant@demo.th / Demo123!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
