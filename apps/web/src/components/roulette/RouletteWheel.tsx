'use client';

import { useState } from 'react';
import { copyToClipboard } from '@/lib/clipboard';

interface Sector {
  label: string;
  discountType: string;
  discountValue: number;
  probability: number;
  color: string;
}

interface SpinResult {
  winner: Sector;
  sectorIndex: number;
  promoCode: { code: string; expiresAt: string } | null;
  spinsLeft: number;
}

interface Props {
  sectors: Sector[];
  campaignId: string;
  onSpin: (campaignId: string) => Promise<SpinResult>;
}

const DEFAULT_COLORS = ['#06B6D4', '#F97316', '#FBBF24', '#10B981', '#3B82F6', '#EF4444', '#22D3EE', '#F59E0B'];

export default function RouletteWheel({ sectors, campaignId, onSpin }: Props) {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<SpinResult | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const size = 300;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 10;

  // Рисуем сектора SVG
  const totalProb = sectors.reduce((s, sec) => s + sec.probability, 0);
  let currentAngle = -90; // начало сверху

  const paths = sectors.map((sector, i) => {
    const angle = (sector.probability / totalProb) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const x1 = cx + r * Math.cos(toRad(startAngle));
    const y1 = cy + r * Math.sin(toRad(startAngle));
    const x2 = cx + r * Math.cos(toRad(endAngle));
    const y2 = cy + r * Math.sin(toRad(endAngle));
    const largeArc = angle > 180 ? 1 : 0;
    const color = sector.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length];

    // Позиция текста — середина сектора
    const midAngle = startAngle + angle / 2;
    const textR = r * 0.65;
    const tx = cx + textR * Math.cos(toRad(midAngle));
    const ty = cy + textR * Math.sin(toRad(midAngle));

    const label = sector.discountType === 'NO_PRIZE' ? 'No Prize' :
      sector.discountType === 'PERCENTAGE' ? `${sector.discountValue}%` :
      sector.discountType === 'FIXED' ? `฿${sector.discountValue / 100}` : 'Gift';

    return (
      <g key={i}>
        <path
          d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`}
          fill={color}
          stroke="#030712"
          strokeWidth="2"
        />
        <text
          x={tx}
          y={ty}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize="11"
          fontWeight="bold"
          transform={`rotate(${midAngle + 90}, ${tx}, ${ty})`}
        >
          {label}
        </text>
      </g>
    );
  });

  const handleSpin = async () => {
    if (spinning) return;
    setSpinning(true);
    setResult(null);
    setError('');

    try {
      const res = await onSpin(campaignId);

      // Анимация: крутим минимум 5 оборотов + до нужного сектора
      const totalSectors = sectors.length;
      const sectorAngle = 360 / totalSectors;
      // Нужный сектор должен оказаться сверху (под стрелкой)
      const targetAngle = -(res.sectorIndex * sectorAngle + sectorAngle / 2);
      const fullRotations = 5 * 360;
      const finalRotation = rotation + fullRotations + ((targetAngle - rotation) % 360 + 360) % 360 + fullRotations;

      setRotation(finalRotation);

      setTimeout(() => {
        setSpinning(false);
        setResult(res);
      }, 4000);
    } catch (e: any) {
      setSpinning(false);
      setError(e?.response?.data?.message || e?.message || 'Error spinning');
    }
  };

  const copy = () => {
    if (result?.promoCode?.code) {
      copyToClipboard(result.promoCode.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Стрелка-указатель */}
      <div className="relative">
        <div style={{
          position: 'absolute',
          top: '-12px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: '12px solid transparent',
          borderRight: '12px solid transparent',
          borderTop: '24px solid #FBBF24',
          zIndex: 10,
        }} />
        <svg
          width={size}
          height={size}
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: spinning ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
            filter: 'drop-shadow(0 0 20px rgba(6,182,212,0.4))',
          }}
        >
          {paths}
          <circle cx={cx} cy={cy} r={16} fill="#030712" stroke="#06B6D4" strokeWidth="3" />
        </svg>
      </div>

      {/* Кнопка спина */}
      <button
        onClick={handleSpin}
        disabled={spinning}
        style={{
          background: spinning ? 'rgba(6,182,212,0.3)' : 'linear-gradient(135deg, #06B6D4, #F97316)',
          color: 'white',
          border: 'none',
          borderRadius: '50px',
          padding: '14px 40px',
          fontSize: '16px',
          fontWeight: '700',
          cursor: spinning ? 'not-allowed' : 'pointer',
          boxShadow: '0 4px 20px rgba(6,182,212,0.4)',
          transition: 'all 0.3s',
        }}
      >
        {spinning ? 'Spinning...' : '🎰 SPIN!'}
      </button>

      {/* Ошибка */}
      {error && (
        <div style={{ color: '#f87171', background: 'rgba(239,68,68,0.1)', padding: '10px 16px', borderRadius: '8px', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {/* Результат */}
      {result && (
        <div style={{
          background: 'rgba(6,182,212,0.1)',
          border: '1px solid rgba(6,182,212,0.3)',
          borderRadius: '16px',
          padding: '20px',
          textAlign: 'center',
          width: '100%',
          maxWidth: '300px',
        }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>
            {result.winner.discountType === 'NO_PRIZE' ? '😔' : '🎉'}
          </div>
          <div style={{ color: '#FBBF24', fontSize: '24px', fontWeight: '800', marginBottom: '4px' }}>
            {result.winner.label}
          </div>
          {result.promoCode ? (
            <>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', marginBottom: '12px' }}>
                Your promo code:
              </div>
              <div style={{
                background: 'rgba(0,0,0,0.3)',
                border: '1px dashed #06B6D4',
                borderRadius: '8px',
                padding: '10px',
                fontFamily: 'monospace',
                fontSize: '20px',
                fontWeight: '800',
                color: '#67E8F9',
                letterSpacing: '2px',
                marginBottom: '10px',
              }}>
                {result.promoCode.code}
              </div>
              <button onClick={copy} style={{
                background: copied ? '#059669' : '#06B6D4',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 20px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '600',
              }}>
                {copied ? '✓ Copied!' : 'Copy Code'}
              </button>
            </>
          ) : (
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
              Better luck next time!
            </div>
          )}
          {result.spinsLeft > 0 && (
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginTop: '10px' }}>
              {result.spinsLeft} spin{result.spinsLeft > 1 ? 's' : ''} remaining
            </div>
          )}
        </div>
      )}
    </div>
  );
}
