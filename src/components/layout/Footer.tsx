import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="border-t border-surface-200 bg-white">
      <div className="container-page grid gap-6 py-10 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex h-12 w-40 items-center overflow-hidden rounded-lg bg-ink-900 px-2">
            <img src="/imagens/logo/redde-people-logo.png" alt="Redde People" className="h-10 w-full object-contain" />
          </div>
          <p className="mt-3 max-w-md text-sm leading-6 text-ink-500">
            Portal de oportunidades em empresas parceiras que valorizam processos seletivos claros,
            criteriosos e profissionais.
          </p>
        </div>
        <div>
          <p className="mb-3 text-sm font-bold text-ink-900">Candidatos</p>
          <div className="grid gap-2 text-sm text-ink-500">
            <Link to="/vagas">Ver vagas</Link>
            <Link to="/empresas">Empresas parceiras</Link>
          </div>
        </div>
        <div>
          <p className="mb-3 text-sm font-bold text-ink-900">Redde People</p>
          <div className="grid gap-2 text-sm text-ink-500">
            <a href="mailto:contato@reddepeople.com.br">contato@reddepeople.com.br</a>
            <Link to="/admin/login">Acesso administrativo</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
