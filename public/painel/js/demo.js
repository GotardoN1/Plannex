// Ambiente de demonstração: escolha de perfil no lugar do login e a faixa amarela no topo.
// Só aparece quando o servidor responde /api/demo/perfis (o Worker plannex-demo); na Central real dá 404.
import { api } from './api.js';
import { estado } from './estado.js';
import { el, botao, icone, avatar, PAPEIS } from './util.js';

let perfis = null;

// Descobre (uma vez) se este servidor é a demonstração.
export async function perfisDemo() {
  if (perfis !== null) return perfis;
  try {
    const resposta = await fetch('/api/demo/perfis', { credentials: 'same-origin', cache: 'no-store' });
    perfis = resposta.ok ? (await resposta.json()).perfis : [];
  } catch {
    perfis = [];
  }
  return perfis;
}

export async function entrarComo(usuario) {
  await api('/api/demo/entrar', { method: 'POST', corpo: { usuario }, semRedirecionar: true });
}

// Tela de entrada da demonstração: cartões de perfil e um roteiro sugerido.
export function desenharEscolha(raiz, aoEntrar) {
  const grupo = (titulo, papel) => el('section', 'demo-grupo',
    el('h2', '', titulo),
    el('ul', 'demo-perfis', perfis.filter(p => p.papel === papel).map(p => {
      const cartao = el('button', `demo-perfil demo-perfil--${p.papel}`,
        avatar(p.nome, 'avatar--medio'),
        el('span', 'demo-perfil-texto', el('strong', '', p.nome), el('span', `papel papel--${p.papel}`, icone(p.papel === 'admin' ? 'escudo' : 'usuario'), PAPEIS[p.papel].nome), el('small', '', p.dica)),
        icone('seta_dir'));
      cartao.type = 'button';
      cartao.addEventListener('click', async () => {
        cartao.disabled = true;
        cartao.classList.add('is-entrando');
        try {
          await entrarComo(p.usuario);
          await aoEntrar();
        } finally {
          cartao.disabled = false;
          cartao.classList.remove('is-entrando');
        }
      });
      return el('li', '', cartao);
    })));

  raiz.replaceChildren(
    el('div', 'demo-topo',
      el('img', 'login-logo'),
      el('p', 'demo-selo', 'Central · Demonstração'),
      el('h1', '', 'Escolha um perfil para explorar'),
      el('p', '', 'Veja a Central como cada pessoa da equipe veria. Os dados são fictícios e voltam ao exemplo toda madrugada. Dá para trocar de perfil a qualquer momento pela faixa amarela no topo.')),
    el('div', 'demo-cartao', grupo('Administradores', 'admin'), grupo('Funcionários', 'funcionario')),
    el('div', 'demo-cartao demo-roteiro',
      el('h2', '', 'Sugestão de roteiro'),
      el('ol', '',
        el('li', '', el('b', '', 'Carla'), ' abre a Visão geral, vê o que precisa de atenção e move um contato da Caixa de entrada para Pedido.'),
        el('li', '', 'No Andamento, ', el('b', '', 'Paulo'), ' filtra por responsável, abre um cartão em Notas e ordens e anexa a nota fiscal.'),
        el('li', '', el('b', '', 'Fernanda'), ' entra e vê só as demandas dela, sem valores nem notas e ordens; avança uma até "Concluir demanda" e confere a aba Concluídos.'),
        el('li', '', el('b', '', 'Juliana'), ' mostra uma demanda atrasada na Agenda; na Equipe, Carla muda o acesso de alguém.'))));
  const logo = raiz.querySelector('.login-logo');
  logo.src = '../assets/img/logo-plannex-full-white.rev83.png?v=83';
  logo.alt = 'Plannex';
}

// Faixa amarela: troca de perfil e reinício dos dados.
export function desenharFaixa(faixa, { aoTrocar, aoReiniciar, aoSair }) {
  const seletor = el('select');
  seletor.setAttribute('aria-label', 'Trocar de perfil');
  for (const p of perfis) {
    const opcao = el('option', '', `${p.nome} · ${PAPEIS[p.papel].nome}`);
    opcao.value = p.usuario;
    opcao.selected = p.usuario === estado.usuario?.usuario;
    seletor.append(opcao);
  }
  seletor.addEventListener('change', async () => {
    seletor.disabled = true;
    try {
      await entrarComo(seletor.value);
      await aoTrocar();
    } finally {
      seletor.disabled = false;
    }
  });
  faixa.replaceChildren(
    el('span', 'faixa-demo-texto', icone('alerta'), el('strong', '', 'Ambiente de demonstração'), el('span', 'some-no-celular', ' · dados fictícios')),
    el('label', 'faixa-demo-perfil', el('span', 'some-no-celular', 'Perfil:'), seletor),
    botao('Reiniciar dados', 'faixa-demo-botao', aoReiniciar, { icone: 'restaurar', titulo: 'Volta todos os dados ao exemplo inicial' }),
    botao('Todos os perfis', 'faixa-demo-botao', aoSair, { icone: 'equipe' }));
  faixa.hidden = false;
  document.body.classList.add('com-demo');
}
