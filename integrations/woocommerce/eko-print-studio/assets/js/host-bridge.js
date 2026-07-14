/**
 * Eko Print Studio — WooCommerce Host Bridge (product page).
 * Thin commercial glue only. Talks to the editor via postMessage and to WP via REST.
 * Consumes ExportProvider preview from cart payload — never regenerates images.
 */
(function () {
  'use strict';

  var cfg = window.EkoPsHost || {};
  var config = cfg.config || {};
  var STORAGE_PREFIX = 'eko_ps_pdp_';

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function i18n(key, fallback) {
    return (cfg.i18n && cfg.i18n[key]) || fallback;
  }

  function storageKey(productId) {
    return STORAGE_PREFIX + String(productId || '');
  }

  function loadState(productId) {
    try {
      var raw = sessionStorage.getItem(storageKey(productId));
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (e) {
      return null;
    }
  }

  function saveState(productId, state) {
    try {
      sessionStorage.setItem(storageKey(productId), JSON.stringify(state));
    } catch (e) {
      /* private mode */
    }
  }

  function isRasterPreview(preview) {
    if (!preview || !preview.data) return false;
    if (preview.fidelity === 'raster') return true;
    if (preview.filename === 'preview.png') return true;
    if (String(preview.data).indexOf('data:image') === 0) return true;
    return String(preview.mimeType || '').indexOf('image') >= 0;
  }

  function formatTime(iso) {
    try {
      var d = iso ? new Date(iso) : new Date();
      if (Number.isNaN(d.getTime())) d = new Date();
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  }

  function audit(event, context) {
    if (!cfg.restUrl) return;
    fetch(cfg.restUrl + '/audit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': cfg.nonce || '',
      },
      body: JSON.stringify({ event: event, context: context || {} }),
      credentials: 'same-origin',
    }).catch(function () {});
  }

  function getQuantity() {
    var input = qs('form.cart input.qty') || qs('input.qty');
    var n = input ? parseInt(input.value, 10) : 1;
    return Number.isFinite(n) && n > 0 ? n : 1;
  }

  function getVariationId() {
    var input = qs('form.cart input[name="variation_id"]');
    var n = input ? parseInt(input.value, 10) : 0;
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  function getAttributes() {
    var form = qs('form.cart');
    if (!form) return {};
    var attrs = {};
    form.querySelectorAll('select[name^="attribute_"]').forEach(function (el) {
      attrs[el.name] = el.value;
    });
    return attrs;
  }

  function buildEditorUrl(context, sessionId, persistence) {
    var base = (config.editorUrl || '').replace(/\/$/, '');
    if (!base) throw new Error('editor_url missing');
    var params = new URLSearchParams({
      embed: config.embedMode || 'modal',
      productId: context.productId,
      templateId: context.templateId,
      theme: config.theme || 'canva',
      lang: config.language || 'pt-BR',
      hostOrigin: window.location.origin,
      autosaveMs: String(config.autosaveMs || 15000),
    });
    if (sessionId) params.set('sessionId', sessionId);
    if (context.variationId) params.set('variationId', context.variationId);
    if (persistence && persistence.restUrl) params.set('restUrl', persistence.restUrl);
    if (persistence && persistence.token) params.set('persistenceToken', persistence.token);
    return base + (base.indexOf('?') >= 0 ? '&' : '?') + params.toString();
  }

  function ensureShell() {
    var root = qs('#eko-ps-host-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'eko-ps-host-root';
      document.body.appendChild(root);
    }
    root.hidden = false;
    root.innerHTML =
      '<div class="eko-ps-overlay" data-eko-overlay>' +
      '<div class="eko-ps-overlay__panel" role="dialog" aria-modal="true" aria-label="Eko Print Studio">' +
      '<button type="button" class="eko-ps-overlay__close" data-eko-close aria-label="Fechar">&times;</button>' +
      '<iframe class="eko-ps-overlay__frame" title="Eko Print Studio" allow="clipboard-read; clipboard-write"></iframe>' +
      '</div></div>';
    return root;
  }

  function closeShell() {
    var root = qs('#eko-ps-host-root');
    if (!root) return;
    root.hidden = true;
    root.innerHTML = '';
    audit('editor.closed', {});
  }

  function openEmbed(url, mode) {
    if (mode === 'page') {
      window.location.href =
        (window.location.origin.replace(/\/$/, '') +
          '/eko-print-studio/editor/?' +
          url.split('?')[1]) ||
        url;
      return null;
    }
    var root = ensureShell();
    var frame = qs('.eko-ps-overlay__frame', root);
    frame.src = url;
    qs('[data-eko-close]', root).addEventListener('click', closeShell);
    audit('editor.opened', { mode: mode, url: url });
    return frame;
  }

  function findPdp(productId) {
    return (
      qs('[data-eko-pdp][data-product-id="' + productId + '"]') ||
      qs('[data-eko-pdp]') ||
      null
    );
  }

  function applyButtonState(productId, state) {
    var root = findPdp(productId);
    if (!root) return;
    var btn = qs('[data-eko-personalize]', root) || qs('[data-eko-personalize]');
    if (!btn) return;
    if (state && (state.sessionId || state.customizationId)) {
      btn.setAttribute('data-session-id', state.customizationId || state.sessionId);
      btn.setAttribute('data-customization-id', state.customizationId || state.sessionId);
      btn.textContent = i18n('edit', 'Editar Personalização');
    } else {
      btn.removeAttribute('data-customization-id');
      btn.removeAttribute('data-session-id');
      btn.textContent = i18n('personalize', cfg.config && cfg.config.buttonLabel ? cfg.config.buttonLabel : 'Personalizar');
    }
  }

  function renderPdpStatus(productId, state) {
    var root = findPdp(productId);
    if (!root) return;
    var panel = qs('[data-eko-pdp-status]', root);
    if (!panel) return;

    if (!state || !(state.sessionId || state.customizationId)) {
      panel.hidden = true;
      panel.innerHTML = '';
      applyButtonState(productId, null);
      return;
    }

    var preview = state.preview || {};
    var name = (state.summary && state.summary.documentName) || i18n('personalized', 'Personalizado');
    var time = formatTime(state.savedAt);
    var thumb = '';
    if (isRasterPreview(preview)) {
      thumb =
        '<img class="eko-ps-pdp-status__thumb" src="' +
        String(preview.data).replace(/"/g, '&quot;') +
        '" alt="preview.png" />';
    }

    panel.hidden = false;
    panel.innerHTML =
      '<div class="eko-ps-pdp-status__card">' +
      '<p class="eko-ps-pdp-status__title">' +
      '<span class="eko-ps-pdp-status__check" aria-hidden="true">✓</span> ' +
      i18n('completed', 'Personalização concluída') +
      '</p>' +
      (thumb ? '<div class="eko-ps-pdp-status__media">' + thumb + '</div>' : '') +
      '<p class="eko-ps-pdp-status__meta"><strong>' +
      name +
      '</strong></p>' +
      '<p class="eko-ps-pdp-status__meta">' +
      i18n('updatedAt', 'Última atualização:') +
      ' <time>' +
      time +
      '</time></p>' +
      (cfg.cartUrl
        ? '<p class="eko-ps-pdp-status__actions"><a class="button" href="' +
          cfg.cartUrl +
          '">' +
          i18n('viewCart', 'Ver carrinho') +
          '</a></p>'
        : '') +
      '</div>';

    applyButtonState(productId, state);
  }

  function hydratePdp() {
    var nodes = document.querySelectorAll('[data-eko-pdp]');
    nodes.forEach(function (node) {
      var productId = node.getAttribute('data-product-id') || cfg.productId;
      if (!productId) return;
      var state = loadState(productId);
      if (state) renderPdpStatus(productId, state);
    });
    // Fallback when markup lacks data-eko-pdp wrapper (legacy).
    if (!nodes.length && cfg.productId) {
      var state = loadState(cfg.productId);
      if (state) {
        applyButtonState(cfg.productId, state);
      }
    }
  }

  function listenForPayload(onCart) {
    function handler(event) {
      var origin = config.targetOrigin || '*';
      if (origin !== '*' && event.origin !== origin) return;
      var data = event.data;
      if (!data || data.source !== 'eko-print-studio') return;
      if (
        data.type === 'woocommerce.cart.add' ||
        data.type === 'commerce.cart.add' ||
        // Legacy alias kept for older editor builds
        data.type === 'commerce.cart.ready'
      ) {
        var p = data.payload;
        // CommerceProvider: { cart } | Woo legacy: { eko_personalization } | raw cart
        var cart =
          (p && p.eko_personalization) ||
          (p && p.cart) ||
          p;
        onCart(cart);
      }
      if (
        data.type === 'woocommerce.editor.close' ||
        data.type === 'commerce.editor.close' ||
        data.type === 'embed.close'
      ) {
        closeShell();
      }
      if (data.type === 'commerce.preview.generated') {
        audit('preview.generated', { fidelity: (data.payload && data.payload.fidelity) || null });
      }
    }
    window.addEventListener('message', handler);
    return function () {
      window.removeEventListener('message', handler);
    };
  }

  async function fetchContext(productId, sessionId) {
    var params = new URLSearchParams({
      quantity: String(getQuantity()),
      variation_id: String(getVariationId() || ''),
      session_id: sessionId || '',
    });
    var attrs = getAttributes();
    Object.keys(attrs).forEach(function (k) {
      params.append('attributes[' + k + ']', attrs[k]);
    });
    var res = await fetch(cfg.restUrl + '/product-context/' + productId + '?' + params.toString(), {
      headers: { 'X-WP-Nonce': cfg.nonce || '' },
      credentials: 'same-origin',
    });
    if (!res.ok) throw new Error('product-context failed');
    return res.json();
  }

  async function addToCart(cart) {
    var res = await fetch(cfg.restUrl + '/add-to-cart', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': cfg.nonce || '',
      },
      body: JSON.stringify({ cart: cart }),
      credentials: 'same-origin',
    });
    var json = await res.json();
    if (!res.ok) throw new Error((json && json.message) || 'add-to-cart failed');
    return json;
  }

  async function startPersonalization(btn) {
    var productId = btn.getAttribute('data-product-id') || cfg.productId;
    var stored = loadState(productId);
    var existingSession =
      btn.getAttribute('data-session-id') ||
      (stored && (stored.customizationId || stored.sessionId)) ||
      '';
    try {
      var payload = await fetchContext(productId, existingSession);
      var context = payload.product;
      // Resume the same Customization / session — never spawn a duplicate while active.
      var sessionId = existingSession || payload.sessionId || '';
      var url = buildEditorUrl(context, sessionId, payload.persistence || null);
      var mode = config.embedMode || 'modal';
      var unlisten = listenForPayload(function (cart) {
        addToCart(cart)
          .then(function () {
            audit('customization.finalized', { sessionId: cart.sessionId });
            unlisten();
            closeShell();
            var state = {
              sessionId: cart.sessionId,
              customizationId: cart.customizationId || cart.sessionId,
              lifecycleStatus: cart.lifecycleStatus || 'cart_attached',
              preview: cart.preview || null,
              summary: cart.summary || null,
              savedAt: cart.savedAt || new Date().toISOString(),
              masterId: cart.masterId || null,
            };
            saveState(productId, state);
            renderPdpStatus(productId, state);
          })
          .catch(function (err) {
            console.error(err);
            window.alert(i18n('error', 'Error'));
          });
      });
      openEmbed(url, mode);
      audit('customization.started', {
        productId: productId,
        templateId: context.templateId,
        resume: Boolean(sessionId),
      });
    } catch (err) {
      console.error(err);
      window.alert(i18n('error', 'Error'));
    }
  }

  document.addEventListener('click', function (event) {
    var btn = event.target.closest('[data-eko-personalize]');
    if (!btn) return;
    event.preventDefault();
    startPersonalization(btn);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hydratePdp);
  } else {
    hydratePdp();
  }
})();
