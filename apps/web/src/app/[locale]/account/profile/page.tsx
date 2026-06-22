'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/api';

const COUNTRIES = ['Thailand', 'Vietnam', 'Cambodia', 'Myanmar', 'Laos', 'Singapore', 'Malaysia', 'Indonesia', 'Philippines', 'Japan', 'South Korea', 'China', 'India', 'USA', 'UK', 'Russia', 'Ukraine', 'Other'];

export default function ProfilePage() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  const [form, setForm] = useState({
    name: '', firstName: '', lastName: '', middleName: '',
    gender: '', country: '', birthDate: '', phone: '', email: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.push(`/${locale}/auth/login`); return; }
    const u = JSON.parse(stored);
    if (u.role !== 'CUSTOMER') { router.push(`/${locale}/dashboard`); return; }

    api.get('/users/me').then(r => {
      const d = r.data;
      setForm({
        name: d.name || '',
        firstName: d.firstName || '',
        lastName: d.lastName || '',
        middleName: d.middleName || '',
        gender: d.gender || '',
        country: d.country || '',
        birthDate: d.birthDate ? d.birthDate.slice(0, 10) : '',
        phone: d.phone || '',
        email: d.email || '',
      });
      setLoading(false);
    });
  }, []);

  const save = async () => {
    setSaving(true); setError('');
    try {
      const payload: any = {
        name: form.firstName || form.name || undefined,
        firstName: form.firstName || undefined,
        lastName: form.lastName || undefined,
        middleName: form.middleName || undefined,
        gender: form.gender || undefined,
        country: form.country || undefined,
        birthDate: form.birthDate || undefined,
        phone: form.phone || undefined,
      };
      const r = await api.patch('/users/me', payload);
      const updated = { ...JSON.parse(localStorage.getItem('user') || '{}'), ...r.data };
      localStorage.setItem('user', JSON.stringify(updated));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Error saving');
    } finally {
      setSaving(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push(`/${locale}/auth/login`);
  };

  const field = (label: string, key: keyof typeof form, type = 'text', placeholder = '') => (
    <div>
      <label style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
        placeholder={placeholder}
        style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '11px 14px', color: 'white', fontSize: 14, boxSizing: 'border-box', outline: 'none' }}
      />
    </div>
  );

  if (loading) return <div style={{ minHeight: '100vh', background: '#030712', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)' }}>Loading...</div>;

  return (
    <div style={{ minHeight: '100vh', background: '#030712', color: 'white', fontFamily: 'sans-serif' }}>
      {/* Header */}
      <div style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.push(`/${locale}/account`)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 20, padding: 0 }}>←</button>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{locale === 'th' ? '👤 โปรไฟล์' : '👤 Profile'}</h1>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px 100px' }}>
        {/* Avatar */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, #06B6D4, #F97316)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, margin: '0 auto 12px' }}>
            {form.firstName?.[0] || form.name?.[0] || '👤'}
          </div>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>{form.email || form.phone}</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Name section */}
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 20 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#67E8F9' }}>{locale === 'th' ? 'ข้อมูลส่วนตัว' : 'Personal Info'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {field(locale === 'th' ? 'นามสกุล' : 'Last Name', 'lastName', 'text', 'Ivanov')}
              {field(locale === 'th' ? 'ชื่อ' : 'First Name', 'firstName', 'text', 'Ivan')}
              {field(locale === 'th' ? 'ชื่อกลาง' : 'Middle Name', 'middleName', 'text', 'Ivanovich')}
              {field(locale === 'th' ? 'ชื่อเล่น / ชื่อที่ใช้แสดง' : 'Display Name', 'name', 'text', 'Ivan')}
            </div>
          </div>

          {/* Demographics */}
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 20 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#a78bfa' }}>{locale === 'th' ? 'ข้อมูลประชากร' : 'Demographics'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Gender */}
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {locale === 'th' ? 'เพศ' : 'Gender'}
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[
                    { value: 'MALE', label: locale === 'th' ? '♂ ชาย' : '♂ Male' },
                    { value: 'FEMALE', label: locale === 'th' ? '♀ หญิง' : '♀ Female' },
                    { value: 'OTHER', label: locale === 'th' ? '⚧ อื่นๆ' : '⚧ Other' },
                  ].map(g => (
                    <button key={g.value} onClick={() => setForm(p => ({ ...p, gender: p.gender === g.value ? '' : g.value }))} style={{
                      flex: 1, padding: '10px 6px', borderRadius: 10, border: `1px solid ${form.gender === g.value ? '#8B5CF6' : 'rgba(255,255,255,0.1)'}`,
                      background: form.gender === g.value ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.04)',
                      color: form.gender === g.value ? '#a78bfa' : 'rgba(255,255,255,0.5)',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    }}>
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              {field(locale === 'th' ? 'วันเกิด' : 'Birth Date', 'birthDate', 'date')}

              {/* Country */}
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {locale === 'th' ? 'ประเทศ' : 'Country'}
                </label>
                <select
                  value={form.country}
                  onChange={e => setForm(p => ({ ...p, country: e.target.value }))}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '11px 14px', color: form.country ? 'white' : 'rgba(255,255,255,0.3)', fontSize: 14, boxSizing: 'border-box', outline: 'none' }}
                >
                  <option value="">{locale === 'th' ? 'เลือกประเทศ' : 'Select country'}</option>
                  {COUNTRIES.map(c => <option key={c} value={c} style={{ background: '#1e293b' }}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 20 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#34d399' }}>{locale === 'th' ? 'ข้อมูลติดต่อ' : 'Contact'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {form.email && (
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</label>
                  <div style={{ padding: '11px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>{form.email}</div>
                </div>
              )}
              {field(locale === 'th' ? 'เบอร์โทรศัพท์' : 'Phone', 'phone', 'tel', '+66812345678')}
            </div>
          </div>

          {/* Error / Success */}
          {error && <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, color: '#f87171', fontSize: 13 }}>{error}</div>}
          {saved && <div style={{ padding: '12px 16px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, color: '#34d399', fontSize: 13 }}>✓ {locale === 'th' ? 'บันทึกเรียบร้อย' : 'Profile saved!'}</div>}

          <button onClick={save} disabled={saving} style={{ padding: '14px', background: saving ? 'rgba(6,182,212,0.3)' : 'linear-gradient(135deg, #06B6D4, #F97316)', border: 'none', borderRadius: 12, color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            {saving ? '...' : (locale === 'th' ? 'บันทึกข้อมูล' : 'Save Profile')}
          </button>

          <button onClick={logout} style={{ padding: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, color: '#f87171', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            {locale === 'th' ? 'ออกจากระบบ' : 'Log Out'}
          </button>
        </div>
      </div>
    </div>
  );
}
