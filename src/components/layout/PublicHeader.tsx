import { Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Button } from '../ui/Button';

const links = [
  { label: 'Início', to: '/' },
  { label: 'Empresas', to: '/empresas' },
  { label: 'Vagas', to: '/vagas' },
  { label: 'Para empresas', to: '/#para-empresas' },
];

export function PublicHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();
  const isHome = pathname === '/';
  // Roxo quando está no topo da home (sem scroll), branco quando deu scroll ou em outra página
  const isPurple = isHome && !scrolled && !open;
  const logoSrc = '/imagens/logo/logo-nova.png';

  useEffect(() => {
    function updateHeaderState() {
      setScrolled(window.scrollY > 16);
    }

    updateHeaderState();
    window.addEventListener('scroll', updateHeaderState, { passive: true });
    return () => window.removeEventListener('scroll', updateHeaderState);
  }, [pathname]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition duration-300 ${
        isPurple
          ? 'border-b border-[#800084] bg-[#800084] shadow-sm'
          : 'border-b border-surface-200 bg-white/95 shadow-sm backdrop-blur'
      }`}
    >
      {/* Grid de 3 colunas simétricas: logo | nav centralizado | botões */}
      <div className="container-page grid h-16 items-center gap-4" style={{gridTemplateColumns: '1fr auto 1fr'}}>
        <Link to="/" className="flex items-center gap-3 justify-self-start" aria-label="People Jobs">
          <img
            src={logoSrc}
            alt="Recruitfy"
            className={`h-10 w-auto object-contain ${isPurple ? 'brightness-0 invert' : ''}`}
          />
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `text-sm font-semibold transition hover:text-redde-600 ${
                  isPurple
                    ? 'text-white hover:text-white'
                    : isActive
                      ? 'text-redde-600'
                      : 'text-redde-600 hover:text-redde-700'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 justify-self-end md:flex">
          <a
            href="/#para-empresas"
            className={`focus-ring inline-flex h-11 min-w-28 items-center justify-center rounded-lg border px-5 text-sm font-bold transition ${
              isPurple
                ? 'border-white bg-white text-[#800084] hover:bg-white/90'
                : 'border-surface-200 bg-white text-ink-900 hover:border-redde-100 hover:bg-redde-50'
            }`}
          >
            Sou empresa
          </a>
          <Link
            to="/admin/login"
            className={`focus-ring inline-flex h-11 min-w-24 items-center justify-center rounded-lg border px-5 text-sm font-bold transition ${
              isPurple
                ? 'border-white bg-white text-[#800084] hover:bg-white/90'
                : 'border-transparent bg-redde-500 text-white hover:bg-redde-600'
            }`}
          >
            Entrar
          </Link>
        </div>

        <button
          className={`focus-ring col-start-3 inline-flex h-10 w-10 items-center justify-center justify-self-end rounded-lg border md:hidden ${
            isPurple ? 'border-white/30 text-white' : 'border-surface-200 text-ink-900'
          }`}
          onClick={() => setOpen((value) => !value)}
          aria-label="Abrir menu"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-surface-200 bg-white md:hidden">
          <div className="container-page grid gap-2 py-4">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-ink-700 hover:bg-surface-100"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link to="/admin/login" onClick={() => setOpen(false)}>
              <Button className="w-full">Entrar</Button>
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
