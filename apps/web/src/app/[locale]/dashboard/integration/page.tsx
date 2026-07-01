'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import api from '@/lib/api';

const S = {
  page: { display: 'flex', minHeight: '100vh', background: '#030712', color: 'white', fontFamily: 'sans-serif' } as const,
  main: { flex: 1, padding: '32px 40px', overflowY: 'auto' as const },
  h1: { fontSize: 28, fontWeight: 800, margin: '0 0 4px' },
  sub: { color: 'rgba(255,255,255,0.4)', fontSize: 14, margin: '0 0 32px' },
  card: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 24, marginBottom: 24 },
  cardTitle: { fontSize: 16, fontWeight: 700, margin: '0 0 4px' },
  cardSub: { fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: '0 0 20px' },
  label: { display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: 6 },
  input: { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '11px 14px', color: 'white', fontSize: 14, boxSizing: 'border-box' as const, outline: 'none' },
  mono: { fontFamily: 'monospace', fontSize: 13, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', color: '#67E8F9', wordBreak: 'break-all' as const },
  row: { display: 'flex', gap: 10, alignItems: 'center' },
  sep: { height: 1, background: 'rgba(255,255,255,0.06)', margin: '20px 0' },
  code: { display: 'block', background: '#0d1117', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '16px 20px', fontFamily: 'monospace', fontSize: 12, color: '#e6edf3', overflowX: 'auto' as const, whiteSpace: 'pre' as const, lineHeight: 1.6 },
  btn: (color = '#06B6D4') => ({ padding: '9px 18px', background: color, border: 'none', borderRadius: 8, color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer' } as const),
  btnOutline: { padding: '9px 18px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 600, cursor: 'pointer' } as const,
  tag: (m: string) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, background: m === 'POST' ? 'rgba(249,115,22,0.2)' : 'rgba(6,182,212,0.2)', color: m === 'POST' ? '#FB923C' : '#67E8F9' } as const),
  badge: (ok: boolean) => ({ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: ok ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: ok ? '#34d399' : '#f87171' } as const),
};

export default function IntegrationPage() {
  const params = useParams();
  const locale = params.locale as string;
  const router = useRouter();

  const [apiKey, setApiKey] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookInput, setWebhookInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; status?: number; error?: string } | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'verify' | 'webhook' | 'shopify'>('verify');

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.push(`/${locale}/auth/login`); return; }
    const u = JSON.parse(stored);
    if (u.role === 'CUSTOMER') { router.push(`/${locale}/account`); return; }

    api.get('/my/api-key').then(r => {
      setApiKey(r.data.apiKey || '');
      setWebhookUrl(r.data.webhookUrl || '');
      setWebhookInput(r.data.webhookUrl || '');
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const copyKey = () => {
    navigator.clipboard?.writeText(apiKey).catch(() => {});
    setKeyCopied(true); setTimeout(() => setKeyCopied(false), 2000);
  };

  const rotateKey = async () => {
    if (!confirm(locale === 'th' ? 'สร้าง API Key ใหม่? Key เดิมจะหยุดทำงานทันที' : 'Generate a new API key? The old key will stop working immediately.')) return;
    setRotating(true);
    try {
      const r = await api.post('/my/api-key/rotate');
      setApiKey(r.data.apiKey);
    } catch {}
    setRotating(false);
  };

  const saveWebhook = async () => {
    setSaving(true); setSaved(false); setTestResult(null);
    try {
      const r = await api.patch('/my/webhook-url', { webhookUrl: webhookInput });
      setWebhookUrl(r.data.webhookUrl || '');
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch {}
    setSaving(false);
  };

  const testWebhook = async () => {
    setTesting(true); setTestResult(null);
    try {
      const r = await api.post('/my/webhook-test');
      setTestResult(r.data);
    } catch (e: any) {
      setTestResult({ success: false, error: e?.response?.data?.message || 'Error' });
    }
    setTesting(false);
  };

  const API_BASE = typeof window !== 'undefined' ? `${window.location.origin}/api` : 'https://your-domain.com/api';
  const KEY = apiKey || 'YOUR_API_KEY';

  const curlVerify = `curl -X POST ${API_BASE}/public/verify-code \\
  -H "Content-Type: application/json" \\
  -H "X-Store-Key: ${KEY}" \\
  -d '{"code": "PROMO-XXXX-YYYY", "orderId": "ORDER-001"}'`;

  const nodeVerify = `const res = await fetch('${API_BASE}/public/verify-code', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Store-Key': process.env.PROMO_STORE_KEY,
  },
  body: JSON.stringify({ code: promoCode, orderId: order.id }),
});
const result = await res.json();

if (result.valid) {
  // type: 'PERCENTAGE' | 'FIXED', value: number
  const discount = result.discount.type === 'PERCENTAGE'
    ? order.total * result.discount.value / 100
    : result.discount.value;
  order.applyDiscount(discount);
} else {
  // error: 'code_not_found' | 'already_used' | 'expired' | 'wrong_store'
  throw new Error('Promo code invalid: ' + result.error);
}`;

  const phpVerify = `$res = wp_remote_post('${API_BASE}/public/verify-code', [
  'headers' => ['Content-Type' => 'application/json', 'X-Store-Key' => PROMO_KEY],
  'body'    => json_encode(['code' => $code, 'orderId' => $order_id]),
]);
$data = json_decode(wp_remote_retrieve_body($res), true);
if ($data['valid']) apply_order_discount($order, $data['discount']);`;

  const webhookPayload = `{
  "event": "code.redeemed",
  "valid": true,
  "code": "PROMO-XXXX-YYYY",
  "orderId": "ORDER-001",
  "discount": { "type": "PERCENTAGE", "value": 20 },
  "campaign": "Summer Sale 20% Off",
  "store": "Demo Store",
  "redeemedAt": "2026-07-01T10:00:00.000Z"
}`;

  const expressReceiver = `app.post('/webhooks/promo', express.json(), (req, res) => {
  const { event, code, orderId, discount } = req.body;
  if (event === 'code.redeemed') {
    console.log(\`Code \${code} redeemed for order \${orderId}\`);
    // discount.type: 'PERCENTAGE' | 'FIXED', discount.value: number
    updateOrder(orderId, discount);
  }
  res.sendStatus(200); // always return 200
});`;

  const shopifyCode = `// pages/api/apply-promo.js (Next.js / Shopify App)
export default async function handler(req, res) {
  const { code, orderId } = req.body;
  const result = await fetch('${API_BASE}/public/verify-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Store-Key': process.env.PROMO_STORE_KEY },
    body: JSON.stringify({ code, orderId }),
  }).then(r => r.json());

  if (result.valid) {
    // Use Shopify Admin API to apply discount via draft order
    const discountAmount = result.discount.type === 'PERCENTAGE'
      ? orderTotal * result.discount.value / 100
      : result.discount.value;
    await applyShopifyDiscount(orderId, discountAmount);
    res.json({ success: true, discount: result.discount });
  } else {
    res.status(400).json({ error: result.error });
  }
}`;

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#030712', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)' }}>
      Loading...
    </div>
  );

  return (
    <div style={S.page}>
      <Sidebar />
      <main style={S.main}>
        <h1 style={S.h1}>{locale === 'th' ? '⚙ การเชื่อมต่อ API' : '⚙ API Integration'}</h1>
        <p style={S.sub}>{locale === 'th' ? 'เชื่อมต่อร้านค้าของคุณกับ Promo Platform เพื่อรับ/ตรวจสอบโค้ดอัตโนมัติ' : 'Connect your store to Promo Platform for automatic code verification and webhooks'}</p>

        {/* API Key */}
        <div style={S.card}>
          <p style={S.cardTitle}>🔑 API Key</p>
          <p style={S.cardSub}>{locale === 'th' ? 'ส่ง Key นี้ใน header X-Store-Key ทุกครั้งที่เรียก API' : 'Send this key in the X-Store-Key header on every API call'}</p>
          <div style={{ ...S.row, marginBottom: 12 }}>
            <div style={{ ...S.mono, flex: 1 }}>
              {showKey ? apiKey : '•'.repeat(Math.min(apiKey.length, 20)) + '...'}
            </div>
            <button style={S.btnOutline} onClick={() => setShowKey(v => !v)}>{showKey ? '🙈' : '👁'}</button>
            <button style={S.btn(keyCopied ? '#10B981' : '#06B6D4')} onClick={copyKey}>
              {keyCopied ? '✓' : locale === 'th' ? 'คัดลอก' : 'Copy'}
            </button>
          </div>
          <button style={{ ...S.btnOutline, color: '#F97316', borderColor: 'rgba(249,115,22,0.3)' } as const} onClick={rotateKey} disabled={rotating}>
            {rotating ? '...' : (locale === 'th' ? '🔄 สร้าง Key ใหม่' : '🔄 Rotate Key')}
          </button>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 8, marginBottom: 0 }}>
            {locale === 'th' ? '⚠️ การสร้าง Key ใหม่จะทำให้ Key เดิมหยุดทำงานทันที' : '⚠️ Rotating immediately invalidates the current key'}
          </p>
        </div>

        {/* Webhook */}
        <div style={S.card}>
          <p style={S.cardTitle}>🔔 {locale === 'th' ? 'Webhook URL' : 'Outbound Webhook URL'}</p>
          <p style={S.cardSub}>{locale === 'th' ? 'เราจะ POST ไปที่ URL นี้ทุกครั้งที่ลูกค้าใช้โค้ด' : 'We\'ll POST to this URL whenever a customer redeems a code'}</p>
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <input
              style={{ ...S.input, flex: 1 }}
              placeholder="https://your-store.com/webhooks/promo"
              value={webhookInput}
              onChange={e => setWebhookInput(e.target.value)}
            />
            <button style={S.btn(saved ? '#10B981' : '#06B6D4')} onClick={saveWebhook} disabled={saving}>
              {saving ? '...' : saved ? `✓ ${locale === 'th' ? 'บันทึกแล้ว' : 'Saved'}` : (locale === 'th' ? 'บันทึก' : 'Save')}
            </button>
          </div>
          {webhookUrl && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <button style={S.btnOutline} onClick={testWebhook} disabled={testing}>
                {testing ? '...' : (locale === 'th' ? '🧪 ทดสอบ' : '🧪 Send Test')}
              </button>
              {testResult && (
                <span style={S.badge(testResult.success)}>
                  {testResult.success ? `✓ ${testResult.status ?? 200} OK` : `✗ ${testResult.error || 'Failed'}`}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Guides */}
        <div style={S.card}>
          <p style={S.cardTitle}>📖 {locale === 'th' ? 'คู่มือการเชื่อมต่อ' : 'Integration Guide'}</p>
          <p style={S.cardSub}>{locale === 'th' ? 'Base URL:' : 'Base URL:'} <code style={{ color: '#67E8F9' }}>{API_BASE}</code></p>

          <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 0 }}>
            {([
              { key: 'verify', label: locale === 'th' ? '✅ ตรวจสอบโค้ด' : '✅ Verify Code' },
              { key: 'webhook', label: '🔔 Webhook' },
              { key: 'shopify', label: '🛒 Shopify' },
            ] as const).map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                padding: '8px 16px', borderRadius: '8px 8px 0 0', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                background: activeTab === tab.key ? 'rgba(6,182,212,0.15)' : 'transparent',
                color: activeTab === tab.key ? '#67E8F9' : 'rgba(255,255,255,0.4)',
                borderBottom: activeTab === tab.key ? '2px solid #06B6D4' : '2px solid transparent',
              }}>{tab.label}</button>
            ))}
          </div>

          {activeTab === 'verify' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={S.tag('POST')}>POST</span>
                <code style={{ fontSize: 13, color: '#67E8F9' }}>/api/public/verify-code</code>
              </div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: '0 0 16px' }}>
                {locale === 'th'
                  ? 'ตรวจสอบและใช้โค้ดในคราวเดียว — ไม่ต้อง login, ใช้แค่ X-Store-Key. เรียกใช้ตอน checkout.'
                  : 'Verifies AND redeems the code in one call. No JWT needed — just X-Store-Key. Call at checkout before charging.'}
              </p>

              <p style={S.label}>Request / Response</p>
              <pre style={S.code}>{`// Request
POST /api/public/verify-code
X-Store-Key: ${KEY}
Content-Type: application/json

{ "code": "PROMO-XXXX-YYYY", "orderId": "ORDER-001" }

// ✅ Success
{ "valid": true, "code": "PROMO-XXXX-YYYY", "orderId": "ORDER-001",
  "discount": { "type": "PERCENTAGE", "value": 20 },
  "campaign": "Summer Sale 20% Off", "store": "Demo Store",
  "redeemedAt": "2026-07-01T10:00:00.000Z" }

// ❌ Error (HTTP 200 — always check result.valid)
{ "valid": false, "error": "code_not_found" }
// error codes: code_not_found | already_used | expired | wrong_store`}</pre>

              <div style={S.sep} />
              <p style={S.label}>curl</p>
              <pre style={S.code}>{curlVerify}</pre>

              <div style={S.sep} />
              <p style={S.label}>Node.js / TypeScript</p>
              <pre style={S.code}>{nodeVerify}</pre>

              <div style={S.sep} />
              <p style={S.label}>PHP / WordPress / WooCommerce</p>
              <pre style={S.code}>{phpVerify}</pre>
            </div>
          )}

          {activeTab === 'webhook' && (
            <div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: '0 0 16px' }}>
                {locale === 'th'
                  ? 'เราส่ง POST ไปที่ Webhook URL ของคุณทุกครั้งที่โค้ดถูกใช้ผ่านแพลตฟอร์มหรือ verify API'
                  : 'We POST to your Webhook URL on every code redemption — via platform QR scan or /public/verify-code.'}
              </p>
              <div style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#FB923C' }}>
                <strong>Header sent:</strong> <code>X-Promo-Event: code.redeemed</code>
              </div>
              <p style={S.label}>Payload Example</p>
              <pre style={S.code}>{webhookPayload}</pre>
              <div style={S.sep} />
              <p style={S.label}>Express.js receiver</p>
              <pre style={S.code}>{expressReceiver}</pre>
            </div>
          )}

          {activeTab === 'shopify' && (
            <div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: '0 0 20px' }}>
                {locale === 'th' ? 'เชื่อมต่อ Shopify ผ่าน Custom App หรือ App Extension' : 'Integrate with Shopify via Custom App or Checkout Extension.'}
              </p>
              {[
                { n: 1, t: locale === 'th' ? 'เพิ่มช่องกรอกโค้ดใน cart หรือ checkout' : 'Add promo code input in cart or checkout' },
                { n: 2, t: locale === 'th' ? 'สร้าง API route ที่เรียก /api/public/verify-code' : 'Create API route that calls /api/public/verify-code' },
                { n: 3, t: locale === 'th' ? 'ใช้ Shopify Draft Orders API เพื่อลดราคา' : 'Use Shopify Draft Orders API to apply discount' },
                { n: 4, t: locale === 'th' ? 'ตั้ง Webhook URL เพื่อรับ events ทุก redemption' : 'Configure Webhook URL above to receive redemption events' },
              ].map(s => (
                <div key={s.n} style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#67E8F9', flexShrink: 0 }}>{s.n}</div>
                  <p style={{ margin: '4px 0 0', fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>{s.t}</p>
                </div>
              ))}
              <div style={S.sep} />
              <p style={S.label}>Next.js API Route (Shopify App)</p>
              <pre style={S.code}>{shopifyCode}</pre>
              <div style={{ marginTop: 16, background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 10, padding: '14px 18px', fontSize: 13, color: '#67E8F9' }}>
                💡 {locale === 'th' ? 'ต้องการ Shopify Plugin สำเร็จรูป? ติดต่อทีมเรา' : 'Need a pre-built Shopify App? Contact our team.'}
              </div>
            </div>
          )}
        </div>

        {/* Endpoints table */}
        <div style={S.card}>
          <p style={{ ...S.cardTitle, marginBottom: 16 }}>📋 {locale === 'th' ? 'สรุป API Endpoints' : 'API Endpoints Summary'}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { m: 'POST', p: '/public/verify-code', a: 'X-Store-Key header', d: locale === 'th' ? 'ตรวจสอบและใช้โค้ด (checkout)' : 'Verify & redeem code at checkout' },
              { m: 'POST', p: '/webhooks/order-paid', a: 'body.storeApiKey', d: locale === 'th' ? 'แจ้งออเดอร์สำเร็จ → CONVERTED' : 'Report paid order → marks code CONVERTED' },
            ].map(ep => (
              <div key={ep.p} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, flexWrap: 'wrap' }}>
                <span style={S.tag(ep.m)}>{ep.m}</span>
                <code style={{ fontSize: 12, color: '#67E8F9' }}>{ep.p}</code>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>{ep.a}</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{ep.d}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
