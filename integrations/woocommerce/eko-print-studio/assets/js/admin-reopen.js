/**
 * Admin reopen — loads order payload via REST and opens editor shell with sessionId.
 * Editing happens only in the SDK editor app.
 */
(function () {
  'use strict';
  var cfg = window.EkoPsAdmin || {};

  async function fetchOrderPayload(orderId, itemId) {
    var res = await fetch(cfg.restUrl + '/order-payload/' + orderId + '/' + itemId, {
      headers: { 'X-WP-Nonce': cfg.nonce || '' },
      credentials: 'same-origin',
    });
    if (!res.ok) throw new Error('order payload failed');
    return res.json();
  }

  function openEditor(sessionId, templateId) {
    var base = (cfg.editorUrl || '').replace(/\/$/, '');
    if (!base) {
      window.alert('Configure a URL do Editor.');
      return;
    }
    var params = new URLSearchParams({
      embed: cfg.embedMode || 'page',
      sessionId: sessionId || '',
      templateId: templateId || '',
      hostOrigin: window.location.origin,
    });
    var url = base + (base.indexOf('?') >= 0 ? '&' : '?') + params.toString();
    if ((cfg.embedMode || 'page') === 'page') {
      window.open('/eko-print-studio/editor/?' + params.toString(), '_blank', 'noopener');
    } else {
      window.open(url, '_blank', 'noopener');
    }
  }

  document.addEventListener('click', function (event) {
    var reopen = event.target.closest('.eko-ps-reopen');
    if (reopen) {
      event.preventDefault();
      var orderId = reopen.getAttribute('data-order-id');
      var itemId = reopen.getAttribute('data-item-id');
      fetchOrderPayload(orderId, itemId)
        .then(function (order) {
          var cart = order.cart || {};
          openEditor(cart.sessionId, cart.masterId);
        })
        .catch(function (err) {
          console.error(err);
          window.alert('Não foi possível reabrir a personalização.');
        });
      return;
    }
    var openBtn = event.target.closest('.eko-ps-open-editor');
    if (openBtn) {
      event.preventDefault();
      openEditor(openBtn.getAttribute('data-session-id'), openBtn.getAttribute('data-template-id'));
    }
  });
})();
