'use client';

import Sidebar from '@/components/layout/Sidebar';

const PLANS = [
  { days: 1, price: 99, recommended: false, desc: 'Quick boost for 24 hours' },
  { days: 3, price: 249, recommended: false, desc: 'Weekend exposure' },
  { days: 7, price: 499, recommended: true, desc: 'Full week visibility' },
  { days: 14, price: 899, recommended: false, desc: 'Two week campaign' },
  { days: 30, price: 1499, recommended: false, desc: 'Maximum monthly exposure' },
];

export default function PromotionPage() {
  return (
    <div className="flex min-h-screen" style={{ background: '#030712', color: 'white' }}>
      <Sidebar />
      <main className="flex-1 p-4 md:p-8 pb-20 md:pb-8">
        <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '8px' }}>Promote Campaigns</h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '40px' }}>
          Get your campaigns featured at the top of the storefront with a gold badge
        </p>

        {/* Benefits */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '48px' }}>
          {[
            { icon: '⭐', title: 'Top placement', desc: 'Featured section above all regular deals' },
            { icon: '🏅', title: 'Gold badge', desc: 'Eye-catching FEATURED label on your campaign' },
            { icon: '📈', title: 'More clicks', desc: 'Up to 5× more traffic vs non-promoted campaigns' },
          ].map(b => (
            <div key={b.title} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '24px', textAlign: 'center' }}>
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>{b.icon}</div>
              <div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '6px' }}>{b.title}</div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>{b.desc}</div>
            </div>
          ))}
        </div>

        {/* Pricing */}
        <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '24px' }}>Promotion Plans</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
          {PLANS.map(plan => (
            <div key={plan.days} style={{
              background: plan.recommended ? 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(249,115,22,0.1))' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${plan.recommended ? '#06B6D4' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: '16px',
              padding: '24px',
              position: 'relative',
              textAlign: 'center',
            }}>
              {plan.recommended && (
                <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: '#06B6D4', color: 'white', fontSize: '11px', fontWeight: '700', padding: '4px 12px', borderRadius: '20px', whiteSpace: 'nowrap' }}>
                  MOST POPULAR
                </div>
              )}
              <div style={{ fontSize: '32px', fontWeight: '800', color: '#FBBF24', marginBottom: '4px' }}>
                ฿{plan.price}
              </div>
              <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '6px' }}>
                {plan.days} {plan.days === 1 ? 'day' : 'days'}
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '16px' }}>{plan.desc}</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                ฿{Math.round(plan.price / plan.days)}/day
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '32px', padding: '20px', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '12px' }}>
          <div style={{ fontSize: '14px', color: '#fcd34d', fontWeight: '600', marginBottom: '4px' }}>💡 How to promote</div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>
            Go to <strong>Campaigns</strong> → click <strong>⭐ Promote</strong> on any active campaign → choose a plan. The cost is deducted from your balance instantly.
          </div>
        </div>
      </main>
    </div>
  );
}
