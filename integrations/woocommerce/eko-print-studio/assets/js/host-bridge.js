/**
 * Eko Print Studio — WooCommerce Host Bridge (product page).
 * Thin commercial glue only. Talks to the editor via postMessage and to WP via REST.
 * Does NOT contain editor / Core logic.
 */
(function () {
  'use strict';

  var cfg = window.EkoPsHost || {};
  var config = cfg.config || {};

  function qs(sel, root) {
    return (root || document).querySelector(sel);
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

  function buildEditorUrl(context, sessionId) {
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

  function listenForPayload(onCart) {
    function handler(event) {
      var origin = config.targetOrigin || '*';
      if (origin !== '*' && event.origin !== origin) return;
      var data = event.data;
      if (!data || data.source !== 'eko-print-studio') return;
      if (data.type === 'woocommerce.cart.add' || data.type === 'commerce.cart.ready') {
        onCart(data.payload && data.payload.eko_personalization ? data.payload.eko_personalization : data.payload);
      }
      if (data.type === 'woocommerce.editor.close' || data.type === 'embed.close') {
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
    var existingSession = btn.getAttribute('data-session-id') || '';
    try {
      var payload = await fetchContext(productId, existingSession);
      var context = payload.product;
      var url = buildEditorUrl(context, payload.sessionId || existingSession);
      var mode = config.embedMode || 'modal';
      var unlisten = listenForPayload(function (cart) {
        addToCart(cart)
          .then(function (result) {
            audit('customization.finalized', { sessionId: cart.sessionId });
            unlisten();
            closeShell();
            window.alert((cfg.i18n && cfg.i18n.added) || 'OK');
            if (result.cartUrl) window.location.href = result.cartUrl;
          })
          .catch(function (err) {
            console.error(err);
            window.alert((cfg.i18n && cfg.i18n.error) || 'Error');
          });
      });
      openEmbed(url, mode);
      audit('customization.started', { productId: productId, templateId: context.templateId });
    } catch (err) {
      console.error(err);
      window.alert((cfg.i18n && cfg.i18n.error) || 'Error');
    }
  }

  document.addEventListener('click', function (event) {
    var btn = event.target.closest('[data-eko-personalize]');
    if (!btn) return;
    event.preventDefault();
    startPersonalization(btn);
  });
})();
