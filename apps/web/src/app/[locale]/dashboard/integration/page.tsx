'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import Sidebar from '@/components/layout/Sidebar';
import { copyToClipboard } from '@/lib/clipboard';

export default function IntegrationPage() {
  const [apiKey, setApiKey] = useState('');
  const [storeId, setStoreId] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [rotating, setRotating] = useState(false);

  useEffect(() => {
    api.get('/my/api-key').then((r) => {
      setApiKey(r.data.apiKey);
      setStoreId(r.data.storeId);
    }).catch(() => {
      // Store may not exist yet
    });
  }, []);

  const copy = (text: string, key: string) => {
    copyToClipboard(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const rotate = async () => {
    if (!confirm('Rotate API key? Old key will stop working immediately.')) return;
    setRotating(true);
    try {
      const r = await api.post('/my/api-key/rotate');
      setApiKey(r.data.apiKey);
    } finally {
      setRotating(false);
    }
  };

  const snippet = `<script src="http://localhost:3001/widget/promo-widget.js"
  data-store-id="${storeId}"
  data-api-url="http://localhost:3001/api"
  data-platform-url="http://localhost:3000">
</script>`;

  const webhookExample = JSON.stringify(
    {
      storeApiKey: apiKey || 'YOUR_API_KEY',
      orderId: 'ORD-12345',
      promoCode: 'DEMO-AB12-CD34',
      orderAmount: 150000,
    },
    null,
    2,
  );

  const shopifyLiquid = `{% comment %} Promo Widget — paste before </body> {% endcomment %}
<script src="http://localhost:3001/widget/promo-widget.js"
  data-store-id="${storeId}"
  data-api-url="http://localhost:3001/api"
  data-platform-url="http://localhost:3000">
</script>`;

  return (
    <div className="flex min-h-screen" style={{ background: '#030712', color: 'white' }}>
      <Sidebar />
      <main className="flex-1 p-4 md:p-8 pb-20 md:pb-8 overflow-auto">
        <h1 className="text-3xl font-bold mb-2">Integration</h1>
        <p className="text-gray-400 mb-8">Connect your store to the Promo platform</p>

        {/* API Key */}
        <section
          className="mb-8 p-6 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <h2 className="text-xl font-semibold mb-4">API Key</h2>
          <div className="flex items-center gap-3 flex-wrap">
            <code
              className="flex-1 p-3 rounded-lg text-sm font-mono min-w-0 break-all"
              style={{ background: 'rgba(0,0,0,0.3)' }}
            >
              {apiKey || 'Loading...'}
            </code>
            <button
              onClick={() => copy(apiKey, 'key')}
              className="px-4 py-2 rounded-lg text-sm font-medium flex-shrink-0"
              style={{ background: copied === 'key' ? '#059669' : '#06B6D4' }}
            >
              {copied === 'key' ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={rotate}
              disabled={rotating}
              className="px-4 py-2 rounded-lg text-sm font-medium flex-shrink-0"
              style={{
                background: 'rgba(239,68,68,0.2)',
                border: '1px solid rgba(239,68,68,0.4)',
                color: '#f87171',
              }}
            >
              {rotating ? '...' : 'Rotate'}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Use this key in webhook calls to authenticate your store.
          </p>
        </section>

        {/* JS Widget */}
        <section
          className="mb-8 p-6 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <h2 className="text-xl font-semibold mb-2">JS Widget</h2>
          <p className="text-gray-400 text-sm mb-4">
            Add one line before <code>&lt;/body&gt;</code> on your website to show a floating deals button.
          </p>
          <div className="relative">
            <pre
              className="p-4 rounded-lg text-xs overflow-x-auto"
              style={{ background: 'rgba(0,0,0,0.4)', color: '#67E8F9' }}
            >
              {snippet}
            </pre>
            <button
              onClick={() => copy(snippet, 'snippet')}
              className="absolute top-3 right-3 px-3 py-1 rounded text-xs"
              style={{ background: copied === 'snippet' ? '#059669' : '#06B6D4' }}
            >
              {copied === 'snippet' ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </section>

        {/* Shopify */}
        <section
          className="mb-8 p-6 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <h2 className="text-xl font-semibold mb-4">Shopify Integration</h2>
          <div className="space-y-6 text-sm text-gray-300">
            {/* Step 1 */}
            <div className="flex items-start gap-3">
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                style={{ background: '#06B6D4' }}
              >
                1
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-white mb-1">Add widget to your theme</p>
                <p className="text-gray-400 mb-2">
                  In Shopify Admin &rarr; Online Store &rarr; Themes &rarr; Edit code &rarr;{' '}
                  <code>theme.liquid</code>, paste before <code>&lt;/body&gt;</code>:
                </p>
                <div className="relative">
                  <pre
                    className="p-3 rounded text-xs overflow-x-auto"
                    style={{ background: 'rgba(0,0,0,0.4)', color: '#67E8F9' }}
                  >
                    {shopifyLiquid}
                  </pre>
                  <button
                    onClick={() => copy(shopifyLiquid, 'shopify')}
                    className="absolute top-2 right-2 px-2 py-1 rounded text-xs"
                    style={{ background: copied === 'shopify' ? '#059669' : '#06B6D4' }}
                  >
                    {copied === 'shopify' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-3">
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                style={{ background: '#06B6D4' }}
              >
                2
              </span>
              <div>
                <p className="font-medium text-white mb-1">Set up order webhook</p>
                <p className="text-gray-400">
                  In Shopify Admin &rarr; Settings &rarr; Notifications &rarr; Webhooks, add:
                </p>
                <ul className="mt-2 space-y-1 text-gray-400">
                  <li>
                    &bull; Event: <strong className="text-white">Order payment</strong>
                  </li>
                  <li>
                    &bull; URL:{' '}
                    <code className="text-cyan-400">
                      http://localhost:3001/api/webhooks/order-paid
                    </code>
                  </li>
                  <li>
                    &bull; Format: <strong className="text-white">JSON</strong>
                  </li>
                </ul>
                <p className="text-gray-500 text-xs mt-2">
                  Note: Shopify webhooks have their own format. For production use the Shopify app
                  connector.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Partner Roulette */}
        <section
          className="mb-8 p-6 rounded-xl"
          style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.25)' }}
        >
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🎡</span>
            <h2 className="text-xl font-semibold">Partner Post-Payment Roulette</h2>
          </div>
          <p className="text-gray-400 text-sm mb-6">
            Integrate with Grab, Lazada, or any partner platform. After a customer pays, call our API
            to get a roulette widget URL — show it as a popup and the wheel auto-spins to a random merchant promo.
          </p>

          <div className="space-y-6">
            {/* Step 1 */}
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5" style={{ background: '#8B5CF6' }}>1</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white mb-1">Enable your campaign for Partner Roulette</p>
                <p className="text-gray-400 text-sm">
                  Go to <strong className="text-white">Campaigns</strong> → click the{' '}
                  <span style={{ color: '#a78bfa' }}>🎡 Roulette</span> button on any active campaign to opt-in.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5" style={{ background: '#8B5CF6' }}>2</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white mb-2">Call the spin API after payment</p>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ background: '#059669' }}>POST</span>
                  <code className="text-xs text-cyan-400 break-all">http://5.223.88.83/api/partner/spin</code>
                </div>
                <div className="relative">
                  <pre className="p-3 rounded text-xs overflow-x-auto" style={{ background: 'rgba(0,0,0,0.4)', color: '#c4b5fd' }}>{`// Header: X-Partner-Key: grab-demo-secret-key-2026
{
  "transactionId": "grab-txn-unique-id",
  "customerRef": "grab-user-id"
}

// Response:
{
  "id": "spin_abc123",
  "widgetUrl": "http://5.223.88.83/th/partner-spin/spin_abc123",
  "status": "COMPLETED"
}`}</pre>
                  <button
                    onClick={() => copy(`fetch('http://5.223.88.83/api/partner/spin', {\n  method: 'POST',\n  headers: {\n    'X-Partner-Key': 'grab-demo-secret-key-2026',\n    'Content-Type': 'application/json'\n  },\n  body: JSON.stringify({ transactionId: order.id, customerRef: user.id })\n})\n.then(r => r.json())\n.then(({ widgetUrl }) => showPopup(widgetUrl));`, 'partner-api')}
                    className="absolute top-2 right-2 px-2 py-1 rounded text-xs"
                    style={{ background: copied === 'partner-api' ? '#059669' : '#8B5CF6' }}
                  >
                    {copied === 'partner-api' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5" style={{ background: '#8B5CF6' }}>3</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white mb-2">Show the widget as a popup</p>
                <div className="relative">
                  <pre className="p-3 rounded text-xs overflow-x-auto" style={{ background: 'rgba(0,0,0,0.4)', color: '#c4b5fd' }}>{`function showPromoPopup(widgetUrl) {
  const overlay = document.createElement('div');
  overlay.style.cssText = \`
    position:fixed; inset:0; z-index:9999;
    background:rgba(0,0,0,0.7);
    display:flex; align-items:center; justify-content:center;
  \`;
  const iframe = document.createElement('iframe');
  iframe.src = widgetUrl;
  iframe.style.cssText = \`
    width:360px; height:580px;
    border:none; border-radius:20px;
  \`;
  overlay.appendChild(iframe);
  overlay.onclick = (e) => { if(e.target===overlay) overlay.remove(); };
  document.body.appendChild(overlay);
}`}</pre>
                  <button
                    onClick={() => copy(`function showPromoPopup(widgetUrl) {\n  const overlay = document.createElement('div');\n  overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;';\n  const iframe = document.createElement('iframe');\n  iframe.src = widgetUrl;\n  iframe.style.cssText = 'width:360px;height:580px;border:none;border-radius:20px;';\n  overlay.appendChild(iframe);\n  overlay.onclick = (e) => { if(e.target===overlay) overlay.remove(); };\n  document.body.appendChild(overlay);\n}`, 'popup-code')}
                    className="absolute top-2 right-2 px-2 py-1 rounded text-xs"
                    style={{ background: copied === 'popup-code' ? '#059669' : '#8B5CF6' }}
                  >
                    {copied === 'popup-code' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>

            {/* Demo link */}
            <div className="p-4 rounded-lg" style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}>
              <p className="text-sm text-purple-300 font-medium mb-1">🧪 Demo Partner Key (Grab)</p>
              <code className="text-xs text-purple-200">grab-demo-secret-key-2026</code>
              <p className="text-xs text-gray-500 mt-2">Use this key to test the spin API. Replace with your real key in production.</p>
            </div>
          </div>
        </section>

        {/* Webhook docs */}
        <section
          className="p-6 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <h2 className="text-xl font-semibold mb-2">Webhook: order.paid</h2>
          <p className="text-gray-400 text-sm mb-4">
            Call this when a customer completes a purchase. Marks the promo code as converted and
            records the sale.
          </p>
          <div className="flex items-center gap-2 mb-3">
            <span
              className="px-2 py-0.5 rounded text-xs font-bold"
              style={{ background: '#059669' }}
            >
              POST
            </span>
            <code className="text-sm text-cyan-400">
              http://localhost:3001/api/webhooks/order-paid
            </code>
          </div>
          <div className="relative">
            <pre
              className="p-4 rounded-lg text-xs overflow-x-auto"
              style={{ background: 'rgba(0,0,0,0.4)', color: '#86efac' }}
            >
              {webhookExample}
            </pre>
            <button
              onClick={() => copy(webhookExample, 'webhook')}
              className="absolute top-3 right-3 px-3 py-1 rounded text-xs"
              style={{ background: copied === 'webhook' ? '#059669' : '#06B6D4' }}
            >
              {copied === 'webhook' ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            <code>orderAmount</code> in satangs (1 THB = 100 satangs).{' '}
            <code>promoCode</code> is optional.
          </p>
        </section>
      </main>
    </div>
  );
}
