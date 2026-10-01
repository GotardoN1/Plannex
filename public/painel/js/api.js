// Chamadas à API da Central. Uma sessão expirada leva de volta ao login.
let aoExpirar = () => {};
export const quandoExpirar = funcao => { aoExpirar = funcao; };

export async function api(caminho, opcoes = {}) {
  const resposta = await fetch(caminho, {
    method: opcoes.method || 'GET',
    headers: opcoes.corpo ? { 'Content-Type': 'application/json' } : {},
    body: opcoes.corpo ? JSON.stringify(opcoes.corpo) : undefined,
    credentials: 'same-origin',
    cache: 'no-store',
  });
  const dados = await resposta.json().catch(() => ({}));
  if (resposta.status === 401 && !opcoes.semRedirecionar) {
    aoExpirar();
    throw new Error(dados.erro || 'Sessão expirada.');
  }
  if (!resposta.ok) throw new Error(dados.erro || 'Não foi possível concluir. Tente novamente.');
  return dados;
}
