'use client';

import { useState, useEffect } from 'react';
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
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'CUSTOMER' | 'MERCHANT'>('CUSTOMER');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [refCode, setRefCode] = useState('');

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('refCode') : '';
    if (saved) setRefCode(saved);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload: any = { name, password, role };
      if (loginMethod === 'email') payload.email = email;
      else payload.phone = phone;
      if (refCode.trim()) payload.refCode = refCode.trim().toUpperCase();

      const response = await api.post('/auth/register', payload);
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.removeItem('refCode');
      router.push(user.role === 'CUSTOMER' ? `/${locale}/account` : `/${locale}/dashboard`);
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
              <label className="block text-white/70 text-sm font-medium mb-2">{t('name')}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={locale === 'th' ? 'ชื่อ-นามสกุล' : 'Your name'}
                className="w-full bg-white/5 border border-white/15 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#06B6D4] transition-colors"
              />
            </div>

            {/* Login method toggle */}
            <div>
              <label className="block text-white/70 text-sm font-medium mb-2">
                {locale === 'th' ? 'วิธีเข้าสู่ระบบ' : 'Login method'}
              </label>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {(['email', 'phone'] as const).map(m => (
                  <button key={m} type="button" onClick={() => setLoginMethod(m)}
                    className={`py-2.5 rounded-lg border text-sm font-medium transition-all ${loginMethod === m ? 'bg-[#06B6D4]/20 border-[#06B6D4] text-[#67E8F9]' : 'bg-white/5 border-white/10 text-white/50'}`}>
                    {m === 'email' ? '✉️ Email' : `📱 ${locale === 'th' ? 'เบอร์โทร' : 'Phone'}`}
                  </button>
                ))}
              </div>
              {loginMethod === 'email' ? (
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com"
                  className="w-full bg-white/5 border border-white/15 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#06B6D4] transition-colors" />
              ) : (
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required placeholder="+66812345678"
                  className="w-full bg-white/5 border border-white/15 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#06B6D4] transition-colors" />
              )}
            </div>

            <div>
              <label className="block text-white/70 text-sm font-medium mb-2">{t('password')}</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} placeholder="••••••••"
                className="w-full bg-white/5 border border-white/15 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#06B6D4] transition-colors" />
            </div>

            <div>
              <label className="block text-white/70 text-sm font-medium mb-2">{t('role')}</label>
              <div className="grid grid-cols-2 gap-3">
                {(['CUSTOMER', 'MERCHANT'] as const).map(r => (
                  <button key={r} type="button" onClick={() => setRole(r)}
                    className={`py-3 px-4 rounded-lg border text-sm font-medium transition-all duration-200 ${role === r ? 'bg-[#06B6D4] border-[#06B6D4] text-white' : 'bg-white/5 border-white/15 text-white/60 hover:border-white/30'}`}>
                    {r === 'CUSTOMER' ? t('roleCustomer') : t('roleMerchant')}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-white/70 text-sm font-medium mb-2">
                {locale === 'th' ? '🎁 รหัสชวนเพื่อน (ไม่บังคับ)' : '🎁 Referral code (optional)'}
              </label>
              <input type="text" value={refCode} onChange={e => setRefCode(e.target.value.toUpperCase())} placeholder="ABCDEF"
                className="w-full bg-white/5 border border-white/15 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#F97316] transition-colors font-mono tracking-widest" />
              {refCode && <p className="mt-1 text-xs text-orange-400">+50 {locale === 'th' ? 'พอยท์สำหรับคุณ!' : 'points for you!'}</p>}
            </div>

            <Button type="submit" loading={loading} className="w-full" size="lg">{t('submit')}</Button>
          </form>

          <p className="mt-6 text-center text-white/50 text-sm">
            {t('hasAccount')}{' '}
            <Link href={`/${locale}/auth/login`} className="text-[#67E8F9] hover:text-white transition-colors">{t('login')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
