'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import api from '@/lib/api';

interface ClaimedCode {
  id: string;
  code: string;
  expiresAt: string | null;
}

interface Props {
  campaignId: string;
  locale: string;
}

export function ClaimButton({ campaignId, locale }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [claimedCode, setClaimedCode] = useState<ClaimedCode | null>(null);
  const [copied, setCopied] = useState(false);

  const handleClaim = async () => {
    setError('');
    const token =
      typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    if (!token) {
      router.push(`/${locale}/auth/login`);
      return;
    }

    setLoading(true);
    try {
      const res = await api.post(`/campaigns/${campaignId}/claim`);
      setClaimedCode(res.data);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        (locale === 'th' ? 'เกิดข้อผิดพลาด' : 'Something went wrong');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const copyCode = async () => {
    if (!claimedCode) return;
    await navigator.clipboard.writeText(claimedCode.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (claimedCode) {
    return (
      <div className="mt-6">
        <p className="text-white/60 text-sm mb-3 text-center">
          {locale === 'th' ? 'โค้ดของคุณ' : 'Your promo code'}
        </p>
        <div className="bg-white/5 border border-[#06B6D4]/40 rounded-xl p-6 text-center mb-4">
          <code className="text-3xl font-mono font-bold text-white tracking-widest select-all">
            {claimedCode.code}
          </code>
          {claimedCode.expiresAt && (
            <p className="text-white/40 text-xs mt-3">
              {locale === 'th' ? 'หมดอายุ: ' : 'Expires: '}
              {new Date(claimedCode.expiresAt).toLocaleDateString()}
            </p>
          )}
        </div>
        <Button onClick={copyCode} className="w-full">
          {copied
            ? locale === 'th'
              ? 'คัดลอกแล้ว!'
              : 'Copied!'
            : locale === 'th'
              ? 'คัดลอกโค้ด'
              : 'Copy Code'}
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-6">
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm text-center">
          {error}
        </div>
      )}
      <Button onClick={handleClaim} loading={loading} size="lg" className="w-full">
        {locale === 'th' ? 'รับโค้ดส่วนลด' : 'Get Discount Code'}
      </Button>
      <p className="text-white/30 text-xs text-center mt-2">
        {locale === 'th'
          ? 'ต้องเข้าสู่ระบบก่อน'
          : 'Login required to claim'}
      </p>
    </div>
  );
}
