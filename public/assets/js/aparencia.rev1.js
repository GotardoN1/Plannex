/* Aparência do site: modo noturno (escuro/claro) e visual (simples/site), como na Central.
   Roda no <head>, antes de desenhar, para a página não piscar; depois monta a pílula no canto.
   As escolhas ficam neste navegador e valem também na Central (mesmas chaves). */
(function () {
  'use strict';
  var raiz = document.documentElement;

  function ler(chave, padrao) {
    try { return localStorage.getItem(chave) || padrao; } catch (e) { return padrao; }
  }
  function gravar(chave, valor) {
    try { localStorage.setItem(chave, valor); } catch (e) { /* sem armazenamento: vale só nesta visita */ }
  }

  function aplicarTema(tema) {
    var claro = tema === 'claro';
    raiz.setAttribute('data-tema', claro ? 'claro' : 'escuro');
    var cor = document.querySelector('meta[name="theme-color"]');
    if (cor) cor.setAttribute('content', claro ? '#f3f5f9' : '#0b1422');
  }
  function aplicarVisual(visual) {
    var site = visual === 'site';
    raiz.setAttribute('data-visual', site ? 'site' : 'simples');
    var folha = document.querySelector('link[href*="simples.rev"]');
    if (folha) folha.media = site ? 'not all' : 'all';
  }

  var tema = ler('plannex-tema', 'escuro');
  var visual = ler('plannex-visual', 'simples');
  aplicarTema(tema);
  aplicarVisual(visual);

  var SVG = 'http://www.w3.org/2000/svg';
  function icone(caminho) {
    var s = document.createElementNS(SVG, 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('aria-hidden', 'true');
    s.setAttribute('fill', 'none');
    s.setAttribute('stroke', 'currentColor');
    s.setAttribute('stroke-width', '1.8');
    s.setAttribute('stroke-linecap', 'round');
    s.setAttribute('stroke-linejoin', 'round');
    var p = document.createElementNS(SVG, 'path');
    p.setAttribute('d', caminho);
    s.appendChild(p);
    return s;
  }
  var LUA = 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z';
  var SOL = 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4';

  function montar() {
    if (document.querySelector('.aparencia')) return;
    var caixa = document.createElement('div');
    caixa.className = 'aparencia';
    caixa.setAttribute('role', 'group');
    caixa.setAttribute('aria-label', 'Aparência do site');

    var botaoTema = document.createElement('button');
    botaoTema.type = 'button';
    botaoTema.className = 'aparencia-tema';
    function desenharTema() {
      var claro = raiz.getAttribute('data-tema') === 'claro';
      botaoTema.replaceChildren(icone(claro ? LUA : SOL));
      botaoTema.title = claro ? 'Ativar modo noturno' : 'Ativar modo claro';
      botaoTema.setAttribute('aria-label', botaoTema.title);
    }
    botaoTema.addEventListener('click', function () {
      var novo = raiz.getAttribute('data-tema') === 'claro' ? 'escuro' : 'claro';
      aplicarTema(novo);
      gravar('plannex-tema', novo);
      desenharTema();
    });
    desenharTema();

    var opcoes = document.createElement('div');
    opcoes.className = 'aparencia-visual';
    [['simples', 'Simples', 'Visual simples, igual ao da Central'], ['site', 'Site', 'Visual original do site, com brilhos e degradês']].forEach(function (op) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = op[1];
      b.title = op[2];
      b.setAttribute('data-visual', op[0]);
      b.setAttribute('aria-pressed', String(raiz.getAttribute('data-visual') === op[0]));
      b.addEventListener('click', function () {
        aplicarVisual(op[0]);
        gravar('plannex-visual', op[0]);
        Array.prototype.forEach.call(opcoes.children, function (outro) {
          outro.setAttribute('aria-pressed', String(outro === b));
        });
      });
      opcoes.appendChild(b);
    });

    caixa.appendChild(botaoTema);
    caixa.appendChild(opcoes);
    document.body.appendChild(caixa);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar);
  else montar();
})();
