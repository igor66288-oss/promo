'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/Button';
import api from '@/lib/api';

export default function RegisterPage() {
  const t = useTranslations('auth');
  const locale = useLocale();
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'CUSTOMER' | 'MERCHANT'>('CUSTOMER');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/register', { name, email, password, role });
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      router.push(`/${locale}/dashboard`);
    } catch (err: any) {
      setError(err?.response?.data?.message || t('registerError'));
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
          <h1 className="text-2xl font-bold text-white mb-2">{t('register')}</h1>
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
                {t('name')}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={locale === 'th' ? 'ชื่อ-นามสกุล' : 'Your full name'}
                className="w-full bg-white/5 border border-white/15 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#06B6D4] transition-colors"
              />
            </div>

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
                minLength={6}
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/15 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#06B6D4] transition-colors"
              />
            </div>

            <div>
              <label className="block text-white/70 text-sm font-medium mb-2">
                {t('role')}
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(['CUSTOMER', 'MERCHANT'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`py-3 px-4 rounded-lg border text-sm font-medium transition-all duration-200 ${
                      role === r
                        ? 'bg-[#06B6D4] border-[#06B6D4] text-white'
                        : 'bg-white/5 border-white/15 text-white/60 hover:border-white/30'
                    }`}
                  >
                    {r === 'CUSTOMER' ? t('roleCustomer') : t('roleMerchant')}
                  </button>
                ))}
              </div>
            </div>

            <Button type="submit" loading={loading} className="w-full" size="lg">
              {t('submit')}
            </Button>
          </form>

          <p className="mt-6 text-center text-white/50 text-sm">
            {t('hasAccount')}{' '}
            <Link
              href={`/${locale}/auth/login`}
              className="text-[#67E8F9] hover:text-white transition-colors"
            >
              {t('login')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
