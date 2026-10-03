// Estado compartilhado da Central e as ações que as telas podem pedir.
// O app.js preenche as ações; as telas só chamam.
export const estado = {
  usuario: null,
  contatos: [],
  usuarios: [],
  recentes: [],
  atualizadoEm: null,
  filtros: { servico: '', responsavel: '', naoLidos: false },
};

export const acoes = {
  abrirFicha: () => {},
  alterar: async () => {},
  mover: async () => {},
  recusar: async () => {},
  recarregar: async () => {},
  navegar: () => {},
  avisar: () => {},
  novoContato: () => {},
};

// Administrador vê e faz tudo; funcionário só as demandas dele (o servidor já manda só essas).
export const eAdmin = () => estado.usuario?.papel === 'admin';

export const contatoPorId = id => estado.contatos.find(c => c.id === id);
export const usuarioPorId = id => estado.usuarios.find(u => u.id === id);

// Contatos que não estão no arquivo nem em Recusados.
export const ativos = () => estado.contatos.filter(c => !c.arquivado_em && !c.recusado_em);

export function aplicarFiltros(lista) {
  const { servico, responsavel } = estado.filtros;
  return lista.filter(c =>
    (!servico || c.servico === servico) &&
    (!responsavel || (responsavel === 'eu' ? c.responsavel_id === estado.usuario?.id : responsavel === 'ninguem' ? !c.responsavel_id : true))
  );
}

// Etiquetas pessoais da própria pessoa, por demanda.
export const etiquetasDe = contatoId => (estado.etiquetas || []).filter(e => e.contato_id === contatoId);
