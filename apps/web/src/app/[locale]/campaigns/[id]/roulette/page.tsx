'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import RouletteWheel from '@/components/roulette/RouletteWheel';
import api from '@/lib/api';

export default function RoulettePage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [spinsLeft, setSpinsLeft] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/campaigns/${campaignId}`),
      api.get(`/campaigns/${campaignId}/roulette`).catch(() => null),
      api.get(`/campaigns/${campaignId}/roulette/spins-left`).catch(() => null),
    ]).then(([camp, cfg, spins]) => {
      setCampaign(camp.data);
      setConfig(cfg?.data || null);
      setSpinsLeft(spins?.data?.spinsLeft ?? null);
      setLoading(false);
    });
  }, [campaignId]);

  const handleSpin = async (cId: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      router.push('/auth/login');
      throw new Error('Not logged in');
    }
    const res = await api.post(`/campaigns/${cId}/roulette/spin`);
    setSpinsLeft(res.data.spinsLeft);
    return res.data;
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#030712', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
      Loading...
    </div>
  );

  if (!config) return (
    <div style={{ minHeight: '100vh', background: '#030712', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '48px' }}>🎰</div>
        <div style={{ fontSize: '18px', marginTop: '16px', color: 'rgba(255,255,255,0.6)' }}>No roulette configured for this campaign</div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#030712', color: 'white' }}>
      {/* Header */}
      <div style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '20px' }}>&#8592;</button>
        <span style={{ fontWeight: '700', fontSize: '18px' }}>Spin &amp; Win</span>
      </div>

      <div style={{ maxWidth: '500px', margin: '0 auto', padding: '40px 24px', textAlign: 'center' }}>
        {campaign && (
          <div style={{ marginBottom: '32px' }}>
            <h1 style={{ fontSize: '26px', fontWeight: '800', marginBottom: '8px' }}>{campaign.title}</h1>
            {campaign.description && (
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>{campaign.description}</p>
            )}
            {spinsLeft !== null && (
              <div style={{ marginTop: '12px', display: 'inline-block', padding: '6px 16px', borderRadius: '20px', background: spinsLeft > 0 ? 'rgba(6,182,212,0.15)' : 'rgba(239,68,68,0.2)', border: `1px solid ${spinsLeft > 0 ? 'rgba(6,182,212,0.3)' : 'rgba(239,68,68,0.4)'}`, fontSize: '13px', color: spinsLeft > 0 ? '#67E8F9' : '#f87171' }}>
                {spinsLeft > 0 ? `${spinsLeft} spin${spinsLeft > 1 ? 's' : ''} available` : 'No spins left today'}
              </div>
            )}
          </div>
        )}

        <RouletteWheel
          sectors={config.sectors}
          campaignId={campaignId}
          onSpin={handleSpin}
        />
      </div>
    </div>
  );
}
