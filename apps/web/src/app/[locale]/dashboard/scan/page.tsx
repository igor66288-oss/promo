'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { BrowserQRCodeReader } from '@zxing/browser';
import api from '@/lib/api';

interface VerifyResult {
  success: boolean;
  code: string;
  campaign: { title: string; discountType: string; discountValue: number };
  customer: { name?: string; firstName?: string; lastName?: string; email?: string; phone?: string } | null;
  usedAt: string;
}

function discountLabel(type: string, value: number) {
  if (type === 'PERCENTAGE') return `${value}% OFF`;
  if (type === 'FIXED') return `฿${value} OFF`;
  return 'FREE GIFT';
}

export default function ScanPage() {
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;
  const th = locale === 'th';

  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserQRCodeReader | null>(null);
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'camera' | 'manual'>('camera');

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    if (!['MERCHANT', 'ADMIN'].includes(u.role)) {
      router.push(`/${locale}/auth/login`);
    }
  }, []);

  const verify = async (code: string) => {
    if (loading) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const r = await api.post('/stores/verify-code', { code: code.trim().toUpperCase() });
      setResult(r.data);
      stopCamera();
    } catch (e: any) {
      setError(e?.response?.data?.message || (th ? 'เกิดข้อผิดพลาด' : 'Error verifying code'));
    } finally {
      setLoading(false);
    }
  };

  const stopCamera = () => {
    if (readerRef.current) {
      try { (readerRef.current as any).reset?.(); } catch {}
      readerRef.current = null;
    }
    setScanning(false);
  };

  const startCamera = async () => {
    setResult(null);
    setError('');
    setScanning(true);
    setTimeout(async () => {
      if (!videoRef.current) return;
      try {
        const reader = new BrowserQRCodeReader();
        readerRef.current = reader;
        await reader.decodeFromVideoDevice(undefined, videoRef.current, (res, err) => {
          if (res) {
            const text = res.getText();
            stopCamera();
            verify(text);
          }
        });
      } catch {
        setError(th ? 'ไม่สามารถเข้าถึงกล้องได้' : 'Cannot access camera');
        setScanning(false);
      }
    }, 100);
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const reset = () => {
    setResult(null);
    setError('');
    setManualCode('');
    if (mode === 'camera') startCamera();
  };

  return (
    <div style={{ minHeight: '100vh', background: '#030712', color: 'white', fontFamily: 'sans-serif' }}>
      {/* Header */}
      <div style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => { stopCamera(); router.push(`/${locale}/dashboard`); }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 20, padding: 0 }}>←</button>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
          {th ? '📷 สแกนโค้ด' : '📷 Scan Code'}
        </h1>
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 16px 100px' }}>
        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 4 }}>
          {(['camera', 'manual'] as const).map(m => (
            <button key={m} onClick={() => { stopCamera(); setMode(m); setResult(null); setError(''); }} style={{
              flex: 1, padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: mode === m ? 'rgba(6,182,212,0.2)' : 'transparent',
              color: mode === m ? '#67E8F9' : 'rgba(255,255,255,0.4)',
            }}>
              {m === 'camera' ? (th ? '📷 กล้อง' : '📷 Camera') : (th ? '⌨️ พิมพ์โค้ด' : '⌨️ Enter Code')}
            </button>
          ))}
        </div>

        {/* Result */}
        {result && (
          <div style={{
            background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.4)',
            borderRadius: 20, padding: 24, textAlign: 'center', marginBottom: 20,
          }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>✅</div>
            <h2 style={{ margin: '0 0 4px', fontSize: 20, color: '#10B981' }}>
              {th ? 'ยืนยันสำเร็จ!' : 'Verified!'}
            </h2>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
              {new Date(result.usedAt).toLocaleString(th ? 'th-TH' : 'en-GB')}
            </p>

            <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 16, marginBottom: 12 }}>
              <p style={{ margin: '0 0 4px', fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em' }}>PROMO CODE</p>
              <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#06B6D4', letterSpacing: '0.12em', fontFamily: 'monospace' }}>{result.code}</p>
            </div>

            <div style={{ fontSize: 22, fontWeight: 800, color: '#FBBF24', marginBottom: 8 }}>
              {discountLabel(result.campaign.discountType, result.campaign.discountValue)}
            </div>
            <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600 }}>{result.campaign.title}</p>
            {result.customer && (
              <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                {result.customer.firstName || result.customer.name || result.customer.email || result.customer.phone || ''}
              </p>
            )}

            <button onClick={reset} style={{
              marginTop: 20, width: '100%', padding: '12px',
              background: 'linear-gradient(135deg, #06B6D4, #F97316)',
              border: 'none', borderRadius: 10, color: 'white',
              fontSize: 15, fontWeight: 700, cursor: 'pointer',
            }}>
              {th ? 'สแกนโค้ดถัดไป' : 'Scan Next Code'}
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 12, padding: '14px 16px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center',
          }}>
            <span style={{ fontSize: 20 }}>❌</span>
            <span style={{ fontSize: 13, color: '#f87171' }}>{error}</span>
          </div>
        )}

        {/* Camera mode */}
        {mode === 'camera' && !result && (
          <div>
            <div style={{
              position: 'relative', width: '100%', paddingBottom: '100%',
              background: 'rgba(255,255,255,0.04)', borderRadius: 20, overflow: 'hidden',
              border: scanning ? '2px solid #06B6D4' : '2px solid rgba(255,255,255,0.1)',
            }}>
              <video
                ref={videoRef}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                muted
                playsInline
              />
              {!scanning && (
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 12,
                }}>
                  <div style={{ fontSize: 48 }}>📷</div>
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
                    {th ? 'กดปุ่มด้านล่างเพื่อเปิดกล้อง' : 'Press button to open camera'}
                  </p>
                </div>
              )}
              {scanning && (
                <div style={{
                  position: 'absolute', inset: '20%',
                  border: '2px solid #06B6D4', borderRadius: 8,
                  boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)',
                }} />
              )}
            </div>

            {loading && (
              <p style={{ textAlign: 'center', color: '#06B6D4', margin: '12px 0 0' }}>
                {th ? 'กำลังตรวจสอบ...' : 'Verifying...'}
              </p>
            )}

            <button
              onClick={scanning ? stopCamera : startCamera}
              style={{
                marginTop: 16, width: '100%', padding: '14px',
                background: scanning ? 'rgba(239,68,68,0.2)' : 'linear-gradient(135deg, #06B6D4, #F97316)',
                border: scanning ? '1px solid rgba(239,68,68,0.4)' : 'none',
                borderRadius: 12, color: 'white', fontSize: 16, fontWeight: 700, cursor: 'pointer',
              }}
            >
              {scanning ? (th ? '⏹ หยุด' : '⏹ Stop') : (th ? '▶ เปิดกล้อง' : '▶ Open Camera')}
            </button>
          </div>
        )}

        {/* Manual mode */}
        {mode === 'manual' && !result && (
          <div>
            <label style={{ display: 'block', fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>
              {th ? 'พิมพ์หรือวางโค้ดโปรโมชั่น' : 'Type or paste promo code'}
            </label>
            <input
              value={manualCode}
              onChange={e => setManualCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && manualCode && verify(manualCode)}
              placeholder="PROMO-XXXX-XXXX"
              style={{
                width: '100%', padding: '14px 16px', fontSize: 18, fontWeight: 700,
                fontFamily: 'monospace', letterSpacing: '0.1em',
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 12, color: 'white', outline: 'none', boxSizing: 'border-box',
              }}
            />
            <button
              onClick={() => manualCode && verify(manualCode)}
              disabled={!manualCode || loading}
              style={{
                marginTop: 12, width: '100%', padding: '14px',
                background: manualCode && !loading ? 'linear-gradient(135deg, #06B6D4, #F97316)' : 'rgba(255,255,255,0.08)',
                border: 'none', borderRadius: 12, color: 'white',
                fontSize: 16, fontWeight: 700, cursor: manualCode && !loading ? 'pointer' : 'not-allowed',
                opacity: manualCode && !loading ? 1 : 0.5,
              }}
            >
              {loading ? (th ? 'กำลังตรวจสอบ...' : 'Verifying...') : (th ? '✓ ยืนยันโค้ด' : '✓ Verify Code')}
            </button>
          </div>
        )}

        {/* Info */}
        {!result && (
          <div style={{ marginTop: 24, padding: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
            <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>
              {th ? 'วิธีใช้งาน' : 'How it works'}
            </p>
            <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.8 }}>
              <li>{th ? 'ลูกค้าเปิดโค้ดในแอปและกด QR' : 'Customer opens code in app and taps QR'}</li>
              <li>{th ? 'สแกน QR หรือพิมพ์โค้ด' : 'Scan QR or enter code manually'}</li>
              <li>{th ? 'ระบบยืนยันและหักค่า CPA อัตโนมัติ' : 'System verifies and deducts CPA automatically'}</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
