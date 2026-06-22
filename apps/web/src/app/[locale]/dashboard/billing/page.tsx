'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import api from '@/lib/api';

const AMOUNTS = [500, 1000, 2000, 5000, 10000];

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    PAID: { bg: 'rgba(16,185,129,0.15)', color: '#6ee7b7' },
    PENDING: { bg: 'rgba(251,191,36,0.15)', color: '#fcd34d' },
    FAILED: { bg: 'rgba(239,68,68,0.15)', color: '#f87171' },
    CANCELLED: { bg: 'rgba(107,114,128,0.15)', color: '#9ca3af' },
  };
  const s = styles[status] || styles.PENDING;
  return (
    <span
      style={{
        padding: '3px 10px',
        borderRadius: '20px',
        fontSize: '11px',
        fontWeight: '700',
        background: s.bg,
        color: s.color,
      }}
    >
      {status}
    </span>
  );
}

export default function BillingPage() {
  const [billing, setBilling] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState(1000);
  const [customAmount, setCustomAmount] = useState('');
  const [paying, setPaying] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    api
      .get('/billing/balance')
      .then((r) => {
        setBilling(r.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleTopUp = async () => {
    const finalAmount = customAmount ? Number(customAmount) : amount;
    if (!finalAmount || finalAmount < 20) {
      setError('Minimum 20 THB');
      return;
    }
    setPaying(true);
    setError('');
    setSuccess('');
    try {
      // Demo mode: без токена Omise — сразу зачисляет
      const res = await api.post('/billing/top-up', { amount: finalAmount });
      setSuccess(`✓ ${res.data.demo ? 'Demo: ' : ''}Added ฿${finalAmount} to your balance`);
      setCustomAmount('');
      load();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Payment failed');
    }
    setPaying(false);
  };

  const downloadPdf = (invoiceId: string) => {
    const token = localStorage.getItem('token');
    const url = `${process.env.NEXT_PUBLIC_API_URL}/billing/invoices/${invoiceId}/pdf`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `invoice-${invoiceId}.pdf`;
        link.click();
        URL.revokeObjectURL(blobUrl);
      });
  };

  return (
    <div className="flex min-h-screen" style={{ background: '#030712', color: 'white' }}>
      <Sidebar />
      <main className="flex-1 p-4 md:p-8 pb-20 md:pb-8 overflow-y-auto">
        <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '4px' }}>Billing</h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '32px' }}>
          Manage your balance and invoices
        </p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(255,255,255,0.4)' }}>
            Loading...
          </div>
        ) : (
          <>
            {/* Balance cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div
                style={{
                  background:
                    'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(249,115,22,0.15))',
                  border: '1px solid rgba(6,182,212,0.2)',
                  borderRadius: '16px',
                  padding: '24px',
                }}
              >
                <div
                  style={{
                    fontSize: '12px',
                    color: 'rgba(255,255,255,0.5)',
                    marginBottom: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Current Balance
                </div>
                <div style={{ fontSize: '36px', fontWeight: '800', color: '#FBBF24' }}>
                  ฿
                  {((billing?.balance || 0) / 100).toLocaleString('th-TH', {
                    minimumFractionDigits: 2,
                  })}
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                  THB
                </div>
              </div>

              <div
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '16px',
                  padding: '24px',
                }}
              >
                <div
                  style={{
                    fontSize: '12px',
                    color: 'rgba(255,255,255,0.5)',
                    marginBottom: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Tariff
                </div>
                <div style={{ fontSize: '28px', fontWeight: '800', color: '#67E8F9' }}>
                  {billing?.tariff}
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                  Cost per action
                </div>
              </div>

              <div
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '16px',
                  padding: '24px',
                }}
              >
                <div
                  style={{
                    fontSize: '12px',
                    color: 'rgba(255,255,255,0.5)',
                    marginBottom: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Store Status
                </div>
                <div
                  style={{
                    fontSize: '24px',
                    fontWeight: '800',
                    color:
                      billing?.status === 'ACTIVE'
                        ? '#6ee7b7'
                        : billing?.status === 'SUSPENDED'
                          ? '#f87171'
                          : '#fcd34d',
                  }}
                >
                  {billing?.status}
                </div>
                {billing?.status === 'SUSPENDED' && (
                  <div style={{ fontSize: '11px', color: '#f87171', marginTop: '4px' }}>
                    Top up balance to reactivate
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Top-up panel */}
              <div
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '16px',
                  padding: '24px',
                }}
              >
                <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>
                  Top Up Balance
                </h2>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '8px',
                    marginBottom: '16px',
                  }}
                >
                  {AMOUNTS.map((a) => (
                    <button
                      key={a}
                      onClick={() => {
                        setAmount(a);
                        setCustomAmount('');
                      }}
                      style={{
                        padding: '10px',
                        borderRadius: '10px',
                        border: `1px solid ${amount === a && !customAmount ? '#06B6D4' : 'rgba(255,255,255,0.1)'}`,
                        background:
                          amount === a && !customAmount
                            ? 'rgba(6,182,212,0.15)'
                            : 'rgba(255,255,255,0.04)',
                        color:
                          amount === a && !customAmount ? '#67E8F9' : 'rgba(255,255,255,0.7)',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600',
                      }}
                    >
                      ฿{a.toLocaleString()}
                    </button>
                  ))}
                </div>

                <input
                  type="number"
                  placeholder="Or enter custom amount (THB)"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '10px',
                    padding: '12px',
                    color: 'white',
                    fontSize: '14px',
                    marginBottom: '16px',
                    boxSizing: 'border-box',
                  }}
                />

                <div
                  style={{
                    background: 'rgba(251,191,36,0.1)',
                    border: '1px solid rgba(251,191,36,0.2)',
                    borderRadius: '8px',
                    padding: '10px',
                    marginBottom: '16px',
                    fontSize: '12px',
                    color: '#fcd34d',
                  }}
                >
                  Demo mode — payment is simulated instantly without Omise keys
                </div>

                {error && (
                  <div
                    style={{
                      color: '#f87171',
                      fontSize: '13px',
                      marginBottom: '12px',
                      padding: '10px',
                      background: 'rgba(239,68,68,0.1)',
                      borderRadius: '8px',
                    }}
                  >
                    {error}
                  </div>
                )}
                {success && (
                  <div
                    style={{
                      color: '#6ee7b7',
                      fontSize: '13px',
                      marginBottom: '12px',
                      padding: '10px',
                      background: 'rgba(16,185,129,0.1)',
                      borderRadius: '8px',
                    }}
                  >
                    {success}
                  </div>
                )}

                <button
                  onClick={handleTopUp}
                  disabled={paying}
                  style={{
                    width: '100%',
                    background: paying
                      ? 'rgba(6,182,212,0.3)'
                      : 'linear-gradient(135deg, #06B6D4, #F97316)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '14px',
                    fontSize: '15px',
                    fontWeight: '700',
                    cursor: paying ? 'not-allowed' : 'pointer',
                  }}
                >
                  {paying
                    ? 'Processing...'
                    : `Top Up ฿${(customAmount ? Number(customAmount) : amount).toLocaleString()}`}
                </button>
              </div>

              {/* CPA info panel */}
              <div
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '16px',
                  padding: '24px',
                }}
              >
                <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>
                  CPA Tariff
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    {
                      label: 'Charge per conversion',
                      value: '฿10.00',
                      desc: 'Deducted from balance on each order.paid',
                    },
                    {
                      label: 'Auto-suspension',
                      value: 'At ฿0',
                      desc: 'Campaigns pause when balance reaches zero',
                    },
                    {
                      label: 'Auto-reactivation',
                      value: 'On top-up',
                      desc: 'Campaigns resume after balance is added',
                    },
                    {
                      label: 'Minimum top-up',
                      value: '฿20',
                      desc: 'Minimum single transaction',
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      style={{
                        padding: '14px',
                        background: 'rgba(255,255,255,0.04)',
                        borderRadius: '10px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                        }}
                      >
                        <div>
                          <div
                            style={{ fontSize: '13px', fontWeight: '600', marginBottom: '3px' }}
                          >
                            {item.label}
                          </div>
                          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                            {item.desc}
                          </div>
                        </div>
                        <div
                          style={{
                            fontSize: '15px',
                            fontWeight: '800',
                            color: '#FBBF24',
                            whiteSpace: 'nowrap',
                            marginLeft: '12px',
                          }}
                        >
                          {item.value}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Invoice history */}
            <div
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '16px',
                padding: '24px',
              }}
            >
              <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>
                Invoice History
              </h2>
              {!billing?.invoices?.length ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '32px',
                    color: 'rgba(255,255,255,0.4)',
                    fontSize: '14px',
                  }}
                >
                  No invoices yet
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr
                        style={{
                          color: 'rgba(255,255,255,0.4)',
                          fontSize: '12px',
                          textTransform: 'uppercase',
                        }}
                      >
                        {['Date', 'Amount', 'Status', 'PDF'].map((h) => (
                          <th
                            key={h}
                            style={{
                              textAlign: 'left',
                              padding: '8px 12px',
                              fontWeight: '600',
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {billing.invoices.map((inv: any) => {
                        const isCpaCharge = JSON.stringify(inv.items).includes('CPA');
                        return (
                          <tr
                            key={inv.id}
                            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
                          >
                            <td
                              style={{
                                padding: '12px',
                                fontSize: '13px',
                                color: 'rgba(255,255,255,0.7)',
                              }}
                            >
                              {new Date(inv.createdAt).toLocaleDateString('en-GB')}
                            </td>
                            <td
                              style={{
                                padding: '12px',
                                fontSize: '14px',
                                fontWeight: '700',
                                color: isCpaCharge ? '#f87171' : '#6ee7b7',
                              }}
                            >
                              {isCpaCharge ? '-' : '+'}฿{(inv.amount / 100).toFixed(2)}
                            </td>
                            <td style={{ padding: '12px' }}>
                              <StatusBadge status={inv.status} />
                            </td>
                            <td style={{ padding: '12px' }}>
                              {inv.status === 'PAID' && (
                                <button
                                  onClick={() => downloadPdf(inv.id)}
                                  style={{
                                    background: 'rgba(6,182,212,0.15)',
                                    border: '1px solid rgba(6,182,212,0.2)',
                                    color: '#67E8F9',
                                    padding: '5px 12px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                  }}
                                >
                                  PDF
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
