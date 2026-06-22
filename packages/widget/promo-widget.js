(function () {
  'use strict';

  // Config is read from data attributes on the script tag
  const script = document.currentScript || (function () {
    const scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  const STORE_ID = script.getAttribute('data-store-id');
  const API_URL = script.getAttribute('data-api-url') || 'http://localhost:3001/api';
  const PLATFORM_URL = script.getAttribute('data-platform-url') || 'http://localhost:3000';

  if (!STORE_ID) return;

  // Widget styles
  const styles = `
    #promo-widget-btn {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9999;
      background: linear-gradient(135deg, #06B6D4, #F97316);
      color: white;
      border: none;
      border-radius: 50px;
      padding: 12px 20px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(6,182,212,0.4);
      display: flex;
      align-items: center;
      gap: 8px;
      font-family: 'Sarabun', sans-serif;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    #promo-widget-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 25px rgba(6,182,212,0.5);
    }
    #promo-widget-panel {
      position: fixed;
      bottom: 80px;
      right: 24px;
      z-index: 9998;
      width: 320px;
      max-height: 480px;
      background: #0F172A;
      border: 1px solid rgba(6,182,212,0.2);
      border-radius: 16px;
      box-shadow: 0 8px 40px rgba(0,0,0,0.4);
      overflow: hidden;
      display: none;
      flex-direction: column;
      font-family: 'Sarabun', sans-serif;
    }
    #promo-widget-panel.open { display: flex; }
    .pw-header {
      background: linear-gradient(135deg, #06B6D4, #F97316);
      padding: 16px;
      color: white;
      font-weight: 700;
      font-size: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .pw-close {
      background: none;
      border: none;
      color: white;
      font-size: 20px;
      cursor: pointer;
      line-height: 1;
    }
    .pw-body {
      overflow-y: auto;
      padding: 12px;
      flex: 1;
    }
    .pw-card {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px;
      padding: 12px;
      margin-bottom: 10px;
      color: white;
    }
    .pw-discount {
      font-size: 22px;
      font-weight: 800;
      color: #FBBF24;
      margin-bottom: 4px;
    }
    .pw-title {
      font-size: 13px;
      color: rgba(255,255,255,0.8);
      margin-bottom: 10px;
    }
    .pw-btn {
      background: #06B6D4;
      color: white;
      border: none;
      border-radius: 8px;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      width: 100%;
      transition: background 0.2s;
    }
    .pw-btn:hover { background: #0891b2; }
    .pw-code-box {
      background: rgba(6,182,212,0.15);
      border: 1px dashed #06B6D4;
      border-radius: 8px;
      padding: 10px;
      text-align: center;
      margin-top: 8px;
    }
    .pw-code {
      font-family: monospace;
      font-size: 18px;
      font-weight: 800;
      color: #FBBF24;
      letter-spacing: 2px;
    }
    .pw-copy-btn {
      background: none;
      border: 1px solid #06B6D4;
      color: #67E8F9;
      border-radius: 6px;
      padding: 4px 10px;
      font-size: 11px;
      cursor: pointer;
      margin-top: 6px;
    }
    .pw-empty {
      color: rgba(255,255,255,0.5);
      text-align: center;
      padding: 24px;
      font-size: 13px;
    }
    .pw-loading {
      color: rgba(255,255,255,0.5);
      text-align: center;
      padding: 24px;
      font-size: 13px;
    }
    .pw-footer {
      padding: 10px 12px;
      border-top: 1px solid rgba(255,255,255,0.08);
      text-align: center;
    }
    .pw-footer a {
      color: #67E8F9;
      font-size: 11px;
      text-decoration: none;
    }
  `;

  // Inject styles
  const styleEl = document.createElement('style');
  styleEl.textContent = styles;
  document.head.appendChild(styleEl);

  // Widget state
  const state = { campaigns: [], claimedCodes: {} };
  let panelOpen = false;

  // Create toggle button
  const btn = document.createElement('button');
  btn.id = 'promo-widget-btn';
  btn.innerHTML = '&#127873; Deals';

  // Create panel
  const panel = document.createElement('div');
  panel.id = 'promo-widget-panel';
  panel.innerHTML =
    '<div class="pw-header">' +
    '<span>&#127873; Exclusive Deals</span>' +
    '<button class="pw-close" id="pw-close-btn">&#x2715;</button>' +
    '</div>' +
    '<div class="pw-body" id="pw-body">' +
    '<div class="pw-loading">Loading deals...</div>' +
    '</div>' +
    '<div class="pw-footer">' +
    '<a href="' + PLATFORM_URL + '" target="_blank">Powered by Promo.th</a>' +
    '</div>';

  document.body.appendChild(btn);
  document.body.appendChild(panel);

  // Load campaigns for this store
  function loadCampaigns() {
    fetch(API_URL + '/stores/' + STORE_ID + '/campaigns')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        state.campaigns = Array.isArray(data) ? data : [];
        renderCampaigns();
      })
      .catch(function () {
        var body = document.getElementById('pw-body');
        if (body) body.innerHTML = '<div class="pw-empty">Failed to load deals</div>';
      });
  }

  function formatDiscount(campaign) {
    if (campaign.discountType === 'PERCENTAGE') return campaign.discountValue + '% OFF';
    if (campaign.discountType === 'FIXED') return '฿' + (campaign.discountValue / 100) + ' OFF';
    return 'FREE GIFT';
  }

  function renderCampaigns() {
    var body = document.getElementById('pw-body');
    if (!body) return;
    if (!state.campaigns.length) {
      body.innerHTML = '<div class="pw-empty">No active deals right now</div>';
      return;
    }

    body.innerHTML = state.campaigns.map(function (c) {
      var claimed = state.claimedCodes[c.id];
      if (claimed) {
        return '<div class="pw-card">' +
          '<div class="pw-discount">' + formatDiscount(c) + '</div>' +
          '<div class="pw-title">' + c.title + '</div>' +
          '<div class="pw-code-box">' +
          '<div class="pw-code">' + claimed + '</div>' +
          '<button class="pw-copy-btn" onclick="navigator.clipboard.writeText(\'' + claimed + '\')">Copy</button>' +
          '</div>' +
          '</div>';
      }
      return '<div class="pw-card">' +
        '<div class="pw-discount">' + formatDiscount(c) + '</div>' +
        '<div class="pw-title">' + c.title + '</div>' +
        '<button class="pw-btn" onclick="window.promoWidgetClaim(\'' + c.id + '\', this)">Get Code</button>' +
        '</div>';
    }).join('');
  }

  // Claim a promo code
  window.promoWidgetClaim = function (campaignId, btnEl) {
    var token = localStorage.getItem('token');
    if (!token) {
      window.location.href = PLATFORM_URL + '/auth/login';
      return;
    }
    btnEl.disabled = true;
    btnEl.textContent = 'Getting...';

    fetch(API_URL + '/campaigns/' + campaignId + '/claim', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
      },
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.code) {
          state.claimedCodes[campaignId] = data.code;
          renderCampaigns();
        } else {
          btnEl.disabled = false;
          btnEl.textContent = data.message || 'Error';
          setTimeout(function () { btnEl.textContent = 'Get Code'; }, 3000);
        }
      })
      .catch(function () {
        btnEl.disabled = false;
        btnEl.textContent = 'Error. Try again';
        setTimeout(function () { btnEl.textContent = 'Get Code'; }, 3000);
      });
  };

  // Toggle panel open/close
  btn.addEventListener('click', function () {
    panelOpen = !panelOpen;
    panel.classList.toggle('open', panelOpen);
    if (panelOpen && !state.campaigns.length) loadCampaigns();
  });

  // Close panel when clicking outside
  document.addEventListener('click', function (e) {
    if (!panel.contains(e.target) && e.target !== btn) {
      panelOpen = false;
      panel.classList.remove('open');
    }
  });

  // Close button inside panel (event delegation)
  panel.addEventListener('click', function (e) {
    if (e.target.id === 'pw-close-btn') {
      panelOpen = false;
      panel.classList.remove('open');
    }
  });

})();
