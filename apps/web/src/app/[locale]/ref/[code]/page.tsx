'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function RefRedirectPage() {
  const { code, locale } = useParams() as { code: string; locale: string };
  const router = useRouter();

  useEffect(() => {
    // Save ref code to localStorage then redirect to register
    if (code) {
      localStorage.setItem('refCode', code.toUpperCase());
    }
    router.replace(`/${locale}/auth/register`);
  }, [code, locale]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#030712', color: 'white' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🎁</div>
        <p style={{ color: 'rgba(255,255,255,0.5)' }}>กำลังโหลด...</p>
      </div>
    </div>
  );
}
