/* ============================================================
   Checkbox · Legal Intake — demo modal toggle
   Opens the #demoModal on any [data-demo-trigger] element,
   closes on the ✕ button, on overlay click, or on Escape.
   Safe to load from <head> or before </body>: it waits for the DOM.
   ============================================================ */
(function () {
  function init() {
    var modal = document.getElementById('demoModal');
    if (!modal) return;

    document.querySelectorAll('[data-demo-trigger]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        modal.classList.add('open');
      });
    });

    function close() { modal.classList.remove('open'); }

    var closeBtn = document.getElementById('demoClose');
    if (closeBtn) closeBtn.addEventListener('click', close);

    modal.addEventListener('click', function (e) {
      if (e.target === modal) close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
