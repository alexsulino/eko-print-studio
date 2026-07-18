/**
 * Eko Print Studio — WooCommerce Host Bridge.
 * Thin commercial glue. Official reopen source = Customization (REST), not sessionStorage.
 * sessionStorage is optional UX cache only.
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

  /** Optional UX cache — never the source of truth for reopen. */
  function loadCache(productId) {
    try {
      var raw = sessionStorage.getItem(storageKey(productId));
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (e) {
      return null;
    }
  }

  function saveCache(productId, state) {
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

  /** Escape text before interpolating into innerHTML (INV-13). */
  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
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

  /**
   * Build editor URL. Always pass customizationId first when reopening;
   * sessionId is resolved identity for SDK resume (v1: same value).
   */
  function buildEditorUrl(context, customization, persistence) {
    var base = (config.editorUrl || '').replace(/\/$/, '');
    if (!base) {
      throw new Error('editor_url missing');
    }
    var params = new URLSearchParams({
      embed: config.embedMode || 'modal',
      productId: context.productId,
      templateId: context.templateId || (customization && customization.templateId) || '',
      theme: config.theme || 'canva',
      lang: config.language || 'pt-BR',
      hostOrigin: window.location.origin,
      autosaveMs: String(config.autosaveMs || 15000),
    });
    if (customization) {
      var cid = customization.customizationId || customization.sessionId || '';
      var sid = customization.sessionId || cid;
      if (cid) params.set('customizationId', cid);
      if (sid) params.set('sessionId', sid);
    }
    if (context.variationId) params.set('variationId', context.variationId);
    if (persistence && persistence.restUrl) params.set('restUrl', persistence.restUrl);
    if (persistence && persistence.token) params.set('persistenceToken', persistence.token);
    var finalUrl = base + (base.indexOf('?') >= 0 ? '&' : '?') + params.toString();
    return finalUrl;
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
    if (!root) {
      return;
    }
    root.hidden = true;
    root.innerHTML = '';
    audit('editor.closed', {});
  }

  function openEmbed(url, mode) {
    try {
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
    } catch (err) {
      throw err;
    }
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
    var lifecycle = state && state.lifecycleStatus;
    // After cart_attached/ordered, PDP "Personalizar" must start a NEW customization
    // (Maria vs João). Edit of an existing line is only via cart/order edit buttons.
    var lockedToCart = lifecycle === 'cart_attached' || lifecycle === 'ordered';
    if (state && (state.customizationId || state.sessionId) && !lockedToCart) {
      var id = state.customizationId || state.sessionId;
      btn.setAttribute('data-customization-id', id);
      btn.setAttribute('data-session-id', state.sessionId || id);
      btn.textContent = i18n('edit', 'Editar Personalização');
    } else {
      btn.removeAttribute('data-customization-id');
      btn.removeAttribute('data-session-id');
      btn.textContent = i18n(
        'personalize',
        (cfg.config && cfg.config.buttonLabel) || 'Personalizar'
      );
    }
  }

  function stateFromCustomization(c) {
    if (!c) return null;
    return {
      customizationId: c.customizationId || c.sessionId,
      sessionId: c.sessionId || c.customizationId,
      preview: c.preview || null,
      summary: c.summary || null,
      savedAt: c.savedAt || null,
      masterId: c.templateId || null,
      lifecycleStatus: c.lifecycle || null,
      source: c.source || 'remote',
    };
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
    var name = escapeHtml(
      (state.summary && state.summary.documentName) || i18n('personalized', 'Personalizado'),
    );
    var time = escapeHtml(formatTime(state.savedAt));
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
      escapeHtml(i18n('completed', 'Personalização concluída')) +
      '</p>' +
      (thumb ? '<div class="eko-ps-pdp-status__media">' + thumb + '</div>' : '') +
      '<p class="eko-ps-pdp-status__meta"><strong>' +
      name +
      '</strong></p>' +
      '<p class="eko-ps-pdp-status__meta">' +
      escapeHtml(i18n('updatedAt', 'Última atualização:')) +
      ' <time>' +
      time +
      '</time></p>' +
      (cfg.cartUrl
        ? '<p class="eko-ps-pdp-status__actions"><a class="button" href="' +
          cfg.cartUrl +
          '">' +
          escapeHtml(i18n('viewCart', 'Ver carrinho')) +
          '</a></p>'
        : '') +
      '</div>';

    applyButtonState(productId, state);
  }

  async function fetchContext(productId, customizationHint) {
    var params = new URLSearchParams({
      quantity: String(getQuantity()),
      variation_id: String(getVariationId() || ''),
      session_id: customizationHint || '',
      customization_id: customizationHint || '',
    });
    var attrs = getAttributes();
    Object.keys(attrs).forEach(function (k) {
      params.append('attributes[' + k + ']', attrs[k]);
    });
    var requestUrl = cfg.restUrl + '/product-context/' + productId + '?' + params.toString();
    var res = await fetch(requestUrl, {
      headers: { 'X-WP-Nonce': cfg.nonce || '' },
      credentials: 'same-origin',
    });
    var bodyText = await res.text();
    var bodyJson = null;
    try {
      bodyJson = bodyText ? JSON.parse(bodyText) : null;
    } catch (parseErr) {
      bodyJson = { _raw: bodyText, _parseError: String(parseErr) };
    }
    if (!res.ok) throw new Error('product-context failed');
    return bodyJson;
  }

  /** Official Customization lookup — cart / repository (not sessionStorage). */
  async function fetchCustomizationById(customizationId) {
    if (!customizationId || !cfg.restUrl) return null;
    var res = await fetch(cfg.restUrl + '/customizations/' + encodeURIComponent(customizationId), {
      headers: { 'X-WP-Nonce': cfg.nonce || '' },
      credentials: 'same-origin',
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error('customization lookup failed');
    var json = await res.json();
    return json.customization || null;
  }

  async function fetchProductCustomization(productId) {
    if (!productId || !cfg.restUrl) return null;
    var res = await fetch(cfg.restUrl + '/products/' + encodeURIComponent(productId) + '/customization', {
      headers: { 'X-WP-Nonce': cfg.nonce || '' },
      credentials: 'same-origin',
    });
    if (!res.ok) return null;
    var json = await res.json();
    return json.customization || null;
  }

  /**
   * Resolve Customization for reopen:
   * 1) hint from button / cache (fast path hint only)
   * 2) product-context (cart + repository)
   * 3) dedicated REST by id / product
   */
  async function resolveCustomization(productId, hintId) {
    var payload = await fetchContext(productId, hintId || '');
    if (payload.customization && payload.customization.customizationId) {
      return { context: payload.product, persistence: payload.persistence, customization: payload.customization };
    }
    if (hintId) {
      var byId = await fetchCustomizationById(hintId);
      if (byId) {
        return { context: payload.product, persistence: payload.persistence, customization: byId };
      }
    }
    var byProduct = await fetchProductCustomization(productId);
    if (byProduct) {
      return { context: payload.product, persistence: payload.persistence, customization: byProduct };
    }
    return { context: payload.product, persistence: payload.persistence, customization: null };
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

  function listenForPayload(onCart) {
    function handler(event) {
      var origin = config.targetOrigin || '*';
      if (origin !== '*' && event.origin !== origin) return;
      var data = event.data;
      if (!data || data.source !== 'eko-print-studio') return;
      if (
        data.type === 'woocommerce.cart.add' ||
        data.type === 'commerce.cart.add' ||
        data.type === 'commerce.cart.ready'
      ) {
        var p = data.payload;
        var cart = (p && p.eko_personalization) || (p && p.cart) || p;
        onCart(cart);
      }
      if (
        data.type === 'woocommerce.editor.close' ||
        data.type === 'commerce.editor.close' ||
        data.type === 'embed.close'
      ) {
        closeShell();
      }
    }
    window.addEventListener('message', handler);
    return function () {
      window.removeEventListener('message', handler);
    };
  }

  async function openEditorForProduct(productId, hintCustomizationId) {
    var hint = hintCustomizationId || '';
    var resolved = await resolveCustomization(productId, hint);
    var context = resolved.context;
    // Resume ONLY when an explicit customization id is requested (cart/order Edit).
    // Without a hint, always start a new personalization — never reuse product's cart line.
    var customization = null;
    if (hint) {
      customization = resolved.customization || null;
      var matched =
        customization &&
        (String(customization.customizationId || '') === hint ||
          String(customization.sessionId || '') === hint);
      if (!matched) {
        customization = await fetchCustomizationById(hint);
        matched =
          customization &&
          (String(customization.customizationId || '') === hint ||
            String(customization.sessionId || '') === hint);
      }
      if (!matched) {
        throw new Error('customization not found');
      }
    }
    var url = buildEditorUrl(context, customization, resolved.persistence || null);
    var mode = config.embedMode || 'modal';
    var unlisten = listenForPayload(function (cart) {
      addToCart(cart)
        .then(function () {
          audit('customization.finalized', {
            sessionId: cart.sessionId,
            customizationId: cart.customizationId || cart.sessionId,
          });
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
            source: 'cache',
          };
          saveCache(productId, state);
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
      customizationId: customization ? customization.customizationId : null,
      resume: Boolean(customization && (customization.sessionId || customization.customizationId)),
      source: customization ? customization.source : 'new',
    });
  }

  async function startPersonalization(btn) {
    var productId = btn.getAttribute('data-product-id') || cfg.productId;
    // Explicit button attrs only (continue editing). Never resume from sessionStorage cache alone.
    var hint =
      btn.getAttribute('data-customization-id') || btn.getAttribute('data-session-id') || '';
    try {
      await openEditorForProduct(productId, hint);
    } catch (err) {
      console.error(err);
      window.alert(i18n('error', 'Error'));
    }
  }

  /** Cart / checkout "Editar" — uses data-customization-id from line item (official). */
  async function startFromCartEdit(btn) {
    var productId = btn.getAttribute('data-product-id') || '';
    var customizationId = btn.getAttribute('data-customization-id') || btn.getAttribute('data-session-id') || '';
    if (!productId) {
      window.alert(i18n('error', 'Error'));
      return;
    }
    if (!customizationId) {
      window.alert(i18n('error', 'Error'));
      return;
    }
    try {
      await openEditorForProduct(productId, customizationId);
    } catch (err) {
      console.error(err);
      window.alert(i18n('error', 'Error'));
    }
  }

  async function hydratePdp() {
    var nodes = document.querySelectorAll('[data-eko-pdp]');
    var tasks = [];
    nodes.forEach(function (node) {
      var productId = node.getAttribute('data-product-id') || cfg.productId;
      if (!productId) return;
      // Paint cache immediately for UX, then reconcile with official Customization.
      var cache = loadCache(productId);
      if (cache) renderPdpStatus(productId, cache);
      tasks.push(
        fetchProductCustomization(productId)
          .then(function (c) {
            if (!c) {
              // Keep cache UI if remote empty (first visit); button stays Personalizar if no cache.
              if (!cache) applyButtonState(productId, null);
              return;
            }
            var state = stateFromCustomization(c);
            saveCache(productId, state);
            renderPdpStatus(productId, state);
          })
          .catch(function () {
            /* keep cache */
          })
      );
    });
    if (!nodes.length && cfg.productId) {
      var cached = loadCache(cfg.productId);
      if (cached) applyButtonState(cfg.productId, cached);
      tasks.push(
        fetchProductCustomization(cfg.productId).then(function (c) {
          if (c) {
            var state = stateFromCustomization(c);
            saveCache(cfg.productId, state);
            applyButtonState(cfg.productId, state);
          }
        })
      );
    }
    await Promise.all(tasks);
  }

  document.addEventListener('click', function (event) {
    var editCart = event.target.closest('[data-eko-edit-customization]');
    if (editCart) {
      event.preventDefault();
      startFromCartEdit(editCart);
      return;
    }
    var btn = event.target.closest('[data-eko-personalize]');
    if (!btn) return;
    event.preventDefault();
    startPersonalization(btn);
  });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      void hydratePdp();
    });
  } else {
    void hydratePdp();
  }
})();
