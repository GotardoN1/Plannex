/* Privacidade e Termos: os atalhos rolam até a seção sem "#" no endereço (/privacidade e /termos). */
(function () {
  'use strict';
  var rolar = function (id, suave) {
    var alvo = document.getElementById(id);
    if (alvo) alvo.scrollIntoView({ behavior: suave ? 'smooth' : 'auto', block: 'start' });
  };
  document.querySelectorAll('[data-rolar]').forEach(function (link) {
    link.addEventListener('click', function (evento) {
      if (evento.ctrlKey || evento.metaKey || evento.shiftKey) return;
      evento.preventDefault();
      history.replaceState(null, '', link.getAttribute('href'));
      rolar(link.getAttribute('data-rolar'), !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    });
  });
  // Quem chega por /termos (ou por um endereço antigo com #termos) vai direto aos Termos de Uso.
  var caminho = location.pathname.replace(/\/+$/, '');
  if (caminho === '/termos' || location.hash === '#termos') {
    if (location.hash) history.replaceState(null, '', '/termos');
    window.addEventListener('load', function () { rolar('termos', false); }, { once: true });
  } else if (location.hash === '#privacidade') {
    history.replaceState(null, '', '/privacidade');
  }
})();
