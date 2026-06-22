'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';

interface Sector {
  campaignId: string;
  title: string;
  storeName: string;
  discountType: string;
  discountValue: number;
  logo?: string | null;
}

interface SpinResult {
  id: string;
  status: string;
  sectors: Sector[];
  winnerIndex: number;
  promoCode: string | null;
  winnerCampaign: {
    title: string;
    storeName: string;
    discountType: string;
    discountValue: number;
  } | null;
  expiresAt: string;
}

const SECTOR_COLORS = [
  '#06B6D4', '#F97316', '#8B5CF6', '#10B981',
  '#F59E0B', '#EF4444', '#3B82F6', '#EC4899',
];

function discountLabel(type: string, value: number) {
  if (type === 'PERCENTAGE') return `${value}% OFF`;
  if (type === 'FIXED') return `฿${value} OFF`;
  return 'FREE GIFT';
}

function RouletteWheel({
  sectors,
  winnerIndex,
  spinning,
  onDone,
}: {
  sectors: Sector[];
  winnerIndex: number;
  spinning: boolean;
  onDone: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const angleRef = useRef(0);
  const startTimeRef = useRef(0);
  const SPIN_MS = 4000;

  const n = sectors.length;
  const sectorAngle = (2 * Math.PI) / n;

  const drawWheel = (rotation: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const r = cx - 10;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Outer ring
    ctx.beginPath();
    ctx.arc(cx, cy, r + 8, 0, 2 * Math.PI);
    ctx.fillStyle = '#1e293b';
    ctx.fill();

    sectors.forEach((sector, i) => {
      const start = rotation + i * sectorAngle - Math.PI / 2;
      const end = start + sectorAngle;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, end);
      ctx.closePath();
      ctx.fillStyle = SECTOR_COLORS[i % SECTOR_COLORS.length];
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Text
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(start + sectorAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = 'white';
      ctx.font = `bold ${n > 6 ? 11 : 13}px sans-serif`;
      ctx.fillText(discountLabel(sector.discountType, sector.discountValue), r - 12, 5);
      ctx.font = `${n > 6 ? 9 : 11}px sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillText(sector.storeName.slice(0, 12), r - 12, n > 6 ? 18 : 20);
      ctx.restore();
    });

    // Center circle
    ctx.beginPath();
    ctx.arc(cx, cy, 28, 0, 2 * Math.PI);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.strokeStyle = '#06B6D4';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = 'white';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎰', cx, cy);
  };

  useEffect(() => {
    drawWheel(0);
  }, [sectors]);

  useEffect(() => {
    if (!spinning) return;

    // Calculate target angle: winner sector should stop under the pointer (top = -PI/2)
    // Winner sector center: winnerIndex * sectorAngle + sectorAngle/2
    // We want it at 0 (top), so: rotation + center = 0 → rotation = -center
    const winnerCenter = winnerIndex * sectorAngle + sectorAngle / 2;
    const extraRotations = 5 * 2 * Math.PI;
    const targetAngle = extraRotations - winnerCenter;

    startTimeRef.current = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(elapsed / SPIN_MS, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentAngle = eased * targetAngle;
      angleRef.current = currentAngle;
      drawWheel(currentAngle);

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        drawWheel(targetAngle);
        onDone();
      }
    };

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [spinning]);

  return (
    <div className="relative inline-block">
      {/* Pointer */}
      <div
        className="absolute left-1/2 -translate-x-1/2 z-10"
        style={{ top: -4 }}
      >
        <div style={{
          width: 0, height: 0,
          borderLeft: '10px solid transparent',
          borderRight: '10px solid transparent',
          borderTop: '22px solid #F97316',
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
        }} />
      </div>
      <canvas ref={canvasRef} width={280} height={280} style={{ display: 'block' }} />
    </div>
  );
}

export default function PartnerSpinPage() {
  const params = useParams();
  const spinId = params.spinId as string;

  const [spin, setSpin] = useState<SpinResult | null>(null);
  const [error, setError] = useState('');
  const [phase, setPhase] = useState<'loading' | 'ready' | 'spinning' | 'done'>('loading');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    fetch(`${apiUrl}/partner/spin/${spinId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.status === 'NO_CAMPAIGNS') {
          setError('ไม่มีโปรโมชั่นในขณะนี้');
          setPhase('done');
          return;
        }
        setSpin(data);
        // Auto-start spin after short delay
        setTimeout(() => setPhase('spinning'), 800);
      })
      .catch(() => setError('เกิดข้อผิดพลาด กรุณาลองใหม่'));
  }, [spinId]);

  const copyCode = () => {
    if (!spin?.promoCode) return;
    navigator.clipboard.writeText(spin.promoCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: 'sans-serif',
        color: 'white',
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.3)',
          borderRadius: 12, padding: '6px 16px', marginBottom: 12,
        }}>
          <span style={{ fontSize: 18 }}>🎁</span>
          <span style={{ fontSize: 13, color: '#67E8F9', fontWeight: 700 }}>
            Promo Partner Reward
          </span>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>
          หมุนรับโปรโมชั่น!
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
          Spin to win a promo code
        </p>
      </div>

      {/* Wheel */}
      {spin && spin.sectors.length > 0 && (
        <div style={{ position: 'relative', marginBottom: 24 }}>
          <RouletteWheel
            sectors={spin.sectors}
            winnerIndex={spin.winnerIndex}
            spinning={phase === 'spinning'}
            onDone={() => setPhase('done')}
          />
          {phase === 'loading' && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              background: 'rgba(15,23,42,0.5)', borderRadius: '50%',
            }}>
              <div style={{
                width: 36, height: 36, border: '3px solid #06B6D4',
                borderTopColor: 'transparent', borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
            </div>
          )}
        </div>
      )}

      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 12, padding: '16px 24px', color: '#f87171', marginBottom: 16,
        }}>
          {error}
        </div>
      )}

      {/* Result */}
      {phase === 'done' && spin?.promoCode && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(249,115,22,0.15))',
          border: '1px solid rgba(6,182,212,0.3)',
          borderRadius: 20, padding: '24px 32px', textAlign: 'center',
          maxWidth: 320, width: '100%',
          animation: 'fadeIn 0.5s ease',
        }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: '0 0 4px' }}>
            คุณได้รับโปรโมชั่นจาก
          </p>
          <p style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>
            {spin.winnerCampaign?.storeName}
          </p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: '0 0 16px' }}>
            {spin.winnerCampaign?.title}
          </p>
          <div style={{
            background: 'rgba(0,0,0,0.3)', borderRadius: 12,
            padding: '12px 20px', marginBottom: 16,
            border: '1px dashed rgba(255,255,255,0.2)',
          }}>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: '0 0 4px', letterSpacing: '0.1em' }}>
              PROMO CODE
            </p>
            <p style={{ fontSize: 22, fontWeight: 800, letterSpacing: '0.15em', margin: 0, color: '#06B6D4' }}>
              {spin.promoCode}
            </p>
          </div>
          <button
            onClick={copyCode}
            style={{
              width: '100%', padding: '12px',
              background: copied ? 'rgba(16,185,129,0.3)' : 'linear-gradient(135deg, #06B6D4, #F97316)',
              border: 'none', borderRadius: 10, color: 'white',
              fontSize: 15, fontWeight: 700, cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {copied ? '✓ Copied!' : 'Copy Code'}
          </button>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 12, marginBottom: 0 }}>
            หมดอายุ: {new Date(spin.expiresAt).toLocaleDateString('th-TH')}
          </p>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}
