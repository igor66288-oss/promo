'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import Sidebar from '@/components/layout/Sidebar';

const COLORS = ['#06B6D4', '#F97316', '#FBBF24', '#10B981', '#3B82F6', '#EF4444', '#22D3EE', '#F59E0B'];

const defaultSectors = [
  { label: '10% Off', discountType: 'PERCENTAGE', discountValue: 10, probability: 30, color: '#06B6D4' },
  { label: '20% Off', discountType: 'PERCENTAGE', discountValue: 20, probability: 20, color: '#F97316' },
  { label: '฿50 Off', discountType: 'FIXED', discountValue: 5000, probability: 15, color: '#FBBF24' },
  { label: '฿100 Off', discountType: 'FIXED', discountValue: 10000, probability: 10, color: '#10B981' },
  { label: 'Free Gift', discountType: 'GIFT', discountValue: 0, probability: 5, color: '#3B82F6' },
  { label: 'No Prize', discountType: 'NO_PRIZE', discountValue: 0, probability: 20, color: '#374151' },
];

export default function RouletteConfigPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;
  const [sectors, setSectors] = useState(defaultSectors);
  const [maxSpins, setMaxSpins] = useState(1);
  const [periodHours, setPeriodHours] = useState(24);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [campaign, setCampaign] = useState<any>(null);

  useEffect(() => {
    api.get(`/campaigns/${campaignId}`).then(r => setCampaign(r.data));
    api.get(`/campaigns/${campaignId}/roulette`).then(r => {
      setSectors(r.data.sectors);
      setMaxSpins(r.data.maxSpinsPerUser);
      setPeriodHours(r.data.periodHours);
    }).catch(() => {});
  }, [campaignId]);

  const total = sectors.reduce((s, sec) => s + Number(sec.probability), 0);

  const updateSector = (i: number, field: string, value: any) => {
    setSectors(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s));
  };

  const addSector = () => {
    if (sectors.length >= 8) return;
    setSectors(prev => [...prev, { label: 'New Prize', discountType: 'PERCENTAGE', discountValue: 10, probability: 10, color: COLORS[prev.length % COLORS.length] }]);
  };

  const removeSector = (i: number) => {
    if (sectors.length <= 2) return;
    setSectors(prev => prev.filter((_, idx) => idx !== i));
  };

  const save = async () => {
    if (Math.abs(total - 100) > 0.01) { alert('Probabilities must sum to 100%'); return; }
    setSaving(true);
    try {
      await api.post(`/campaigns/${campaignId}/roulette`, { sectors, maxSpinsPerUser: maxSpins, periodHours });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Save failed');
    }
    setSaving(false);
  };

  return (
    <div className="flex min-h-screen" style={{ background: '#030712', color: 'white' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '20px' }}>&#8592;</button>
          <h1 style={{ fontSize: '28px', fontWeight: '800' }}>Roulette Config</h1>
        </div>
        {campaign && <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '32px', marginLeft: '32px' }}>{campaign.title}</p>}

        {/* Settings */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '160px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '8px' }}>Spins per period</label>
            <input type="number" min={1} max={10} value={maxSpins} onChange={e => setMaxSpins(Number(e.target.value))}
              style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '8px', color: 'white', fontSize: '16px' }} />
          </div>
          <div style={{ flex: 1, minWidth: '160px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '8px' }}>Period (hours)</label>
            <input type="number" min={1} max={168} value={periodHours} onChange={e => setPeriodHours(Number(e.target.value))}
              style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '8px', color: 'white', fontSize: '16px' }} />
          </div>
          <div style={{ flex: 1, minWidth: '160px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '8px' }}>Total probability</label>
            <div style={{ fontSize: '24px', fontWeight: '800', color: Math.abs(total - 100) < 0.01 ? '#10B981' : '#EF4444' }}>{total.toFixed(1)}%</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Must equal 100%</div>
          </div>
        </div>

        {/* Sectors */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Sectors ({sectors.length}/8)</h2>
            <button onClick={addSector} disabled={sectors.length >= 8}
              style={{ background: '#06B6D4', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', opacity: sectors.length >= 8 ? 0.5 : 1 }}>
              + Add Sector
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {sectors.map((sector, i) => (
              <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '12px', border: '1px solid rgba(255,255,255,0.08)', flexWrap: 'wrap' }}>
                <input type="color" value={sector.color} onChange={e => updateSector(i, 'color', e.target.value)}
                  style={{ width: '36px', height: '36px', border: 'none', borderRadius: '6px', cursor: 'pointer', padding: '2px', background: 'none' }} />
                <input value={sector.label} onChange={e => updateSector(i, 'label', e.target.value)}
                  placeholder="Label" style={{ flex: 2, minWidth: '100px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '8px', color: 'white', fontSize: '13px' }} />
                <select value={sector.discountType} onChange={e => updateSector(i, 'discountType', e.target.value)}
                  style={{ flex: 1, minWidth: '100px', background: '#0F172A', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '8px', color: 'white', fontSize: '13px' }}>
                  <option value="PERCENTAGE">% Off</option>
                  <option value="FIXED">Fixed (satangs)</option>
                  <option value="GIFT">Gift</option>
                  <option value="NO_PRIZE">No Prize</option>
                </select>
                {sector.discountType !== 'NO_PRIZE' && sector.discountType !== 'GIFT' && (
                  <input type="number" value={sector.discountValue} onChange={e => updateSector(i, 'discountValue', Number(e.target.value))}
                    placeholder="Value" style={{ width: '80px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '8px', color: 'white', fontSize: '13px' }} />
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input type="number" value={sector.probability} onChange={e => updateSector(i, 'probability', Number(e.target.value))}
                    min={0} max={100} style={{ width: '60px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '8px', color: 'white', fontSize: '13px' }} />
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>%</span>
                </div>
                <button onClick={() => removeSector(i)} disabled={sectors.length <= 2}
                  style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer', fontSize: '13px', opacity: sectors.length <= 2 ? 0.4 : 1 }}>
                  &#10005;
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={save} disabled={saving || Math.abs(total - 100) > 0.01}
            style={{ background: saved ? '#059669' : 'linear-gradient(135deg, #06B6D4, #F97316)', color: 'white', border: 'none', borderRadius: '10px', padding: '12px 28px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Roulette'}
          </button>
          <button onClick={() => window.open(`/campaigns/${campaignId}/roulette`, '_blank')}
            style={{ background: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', padding: '12px 24px', fontSize: '14px', cursor: 'pointer' }}>
            Preview &#8594;
          </button>
        </div>
      </main>
    </div>
  );
}
