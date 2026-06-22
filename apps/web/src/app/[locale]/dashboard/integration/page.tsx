'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import Sidebar from '@/components/layout/Sidebar';

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
    navigator.clipboard.writeText(text);
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
