import { Link } from 'react-router-dom';

const candidateLinks = [
  { label: 'Ver vagas', to: '/vagas' },
  { label: 'Ver empresas', to: '/empresas' },
  { label: 'Enviar candidatura', to: '/vagas' },
  { label: 'Dúvidas frequentes', to: '/#como-funciona' },
];

const companyLinks = [
  { label: 'Sou empresa', to: '/#para-empresas' },
  { label: 'Publicar vagas', to: '/#para-empresas' },
  { label: 'Acessar painel', to: '/admin/login' },
  { label: 'Falar com o People Jobs', to: 'mailto:contato@peoplejobs.com.br' },
];

const institutionalLinks = [
  { label: 'Sobre o People Jobs', to: '/' },
  { label: 'Política de privacidade', to: '/#seguranca-lgpd' },
  { label: 'Termos de uso', to: '/#seguranca-lgpd' },
  { label: 'LGPD', to: '/#seguranca-lgpd' },
  { label: 'Contato', to: 'mailto:contato@peoplejobs.com.br' },
];

function FooterLink({ label, to }: { label: string; to: string }) {
  if (to.startsWith('mailto:')) {
    return <a href={to}>{label}</a>;
  }

  return <Link to={to}>{label}</Link>;
}

export function Footer() {
  return (
    <footer className="border-t border-surface-200 bg-white">
      <div className="container-page grid gap-8 py-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <div className="flex h-12 w-40 items-center overflow-hidden">
            <img
              src="/imagens/logo/redde-people-jobs-color.png"
              alt="People Jobs"
              className="h-full w-full object-contain"
            />
          </div>
          <p className="mt-3 max-w-md text-sm leading-6 text-ink-500">
            Portal de oportunidades em empresas parceiras que valorizam processos seletivos claros,
            criteriosos e profissionais.
          </p>
        </div>

        <div>
          <p className="mb-3 text-sm font-bold text-ink-900">Para candidatos</p>
          <div className="grid gap-2 text-sm text-ink-500">
            {candidateLinks.map((link) => (
              <FooterLink key={link.label} {...link} />
            ))}
          </div>
        </div>

        <div>
          <p className="mb-3 text-sm font-bold text-ink-900">Para empresas</p>
          <div className="grid gap-2 text-sm text-ink-500">
            {companyLinks.map((link) => (
              <FooterLink key={link.label} {...link} />
            ))}
          </div>
        </div>

        <div>
          <p className="mb-3 text-sm font-bold text-ink-900">Institucional</p>
          <div className="grid gap-2 text-sm text-ink-500">
            {institutionalLinks.map((link) => (
              <FooterLink key={link.label} {...link} />
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
