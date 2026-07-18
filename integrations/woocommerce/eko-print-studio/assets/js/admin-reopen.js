/**
 * Admin reopen — same logical Edit flow as cart (data-eko-edit-customization).
 * Identity + product-context persistence params; no sessionStorage; no second contract.
 */
(function () {
  'use strict';
  var cfg = window.EkoPsAdmin || {};

  /** Same source as cart reopen: product-context → persistence.restUrl + token. */
  async function fetchPersistence(productId, customizationId) {
    if (!cfg.restUrl || !productId) return null;
    var params = new URLSearchParams({
      quantity: '1',
      variation_id: '',
      session_id: customizationId || '',
      customization_id: customizationId || '',
    });
    var res = await fetch(
      cfg.restUrl + '/product-context/' + encodeURIComponent(productId) + '?' + params.toString(),
      {
        headers: { 'X-WP-Nonce': cfg.nonce || '' },
        credentials: 'same-origin',
      }
    );
    if (!res.ok) return null;
    var json = await res.json();
    return json.persistence || null;
  }

  /** Same query keys as host-bridge buildEditorUrl (cart Edit). */
  function openEditor(customizationId, sessionId, templateId, productId, persistence) {
    var base = (cfg.editorUrl || '').replace(/\/$/, '');
    if (!base) {
      window.alert('Configure a URL do Editor.');
      return;
    }
    var cid = customizationId || sessionId || '';
    var sid = sessionId || customizationId || '';
    if (!cid) {
      window.alert('Customization id ausente.');
      return;
    }
    var params = new URLSearchParams({
      embed: cfg.embedMode || 'page',
      hostOrigin: window.location.origin,
    });
    params.set('customizationId', cid);
    params.set('sessionId', sid);
    if (templateId) params.set('templateId', templateId);
    if (productId) params.set('productId', productId);
    if (persistence && persistence.restUrl) params.set('restUrl', persistence.restUrl);
    if (persistence && persistence.token) params.set('persistenceToken', persistence.token);
    var url = base + (base.indexOf('?') >= 0 ? '&' : '?') + params.toString();
    if ((cfg.embedMode || 'page') === 'page') {
      window.open('/eko-print-studio/editor/?' + params.toString(), '_blank', 'noopener');
    } else {
      window.open(url, '_blank', 'noopener');
    }
  }

  /** Same entry as cart: data-eko-edit-customization + ids on the button. */
  async function startFromCartEdit(btn) {
    var productId = btn.getAttribute('data-product-id') || '';
    var customizationId =
      btn.getAttribute('data-customization-id') || btn.getAttribute('data-session-id') || '';
    var sessionId = btn.getAttribute('data-session-id') || customizationId;
    var templateId = btn.getAttribute('data-template-id') || '';
    if (!productId || !customizationId) {
      window.alert('Não foi possível reabrir a personalização.');
      return;
    }
    var persistence = await fetchPersistence(productId, customizationId);
    openEditor(customizationId, sessionId, templateId, productId, persistence);
  }

  document.addEventListener('click', function (event) {
    var editBtn = event.target.closest('[data-eko-edit-customization]');
    if (!editBtn) return;
    event.preventDefault();
    startFromCartEdit(editBtn).catch(function (err) {
      console.error(err);
      window.alert('Não foi possível reabrir a personalização.');
    });
  });
})();
