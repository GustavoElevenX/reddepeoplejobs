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
  const isPurple = isHome && scrolled && !open;
  const logoSrc = isPurple ? '/imagens/logo/redde-people-jobs-white.png' : '/imagens/logo/redde-people-jobs-color.png';

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
          ? 'border-b border-[#8300ea] bg-[#8300ea] shadow-sm'
          : 'border-b border-surface-200 bg-white/95 shadow-sm backdrop-blur'
      }`}
    >
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-3" aria-label="People Jobs">
          <span className="flex h-12 w-40 items-center overflow-hidden">
            <img src={logoSrc} alt="People Jobs" className="h-full w-full object-contain" />
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `text-sm font-semibold transition hover:text-redde-600 ${
                  isActive
                    ? isPurple
                      ? 'text-white'
                      : 'text-redde-600'
                    : isPurple
                      ? 'text-white/85 hover:text-white'
                      : 'text-ink-700'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <a href="/#para-empresas">
            <Button
              variant="secondary"
              className={
                isPurple
                  ? 'border-white bg-white text-[#8300ea] hover:bg-white/90'
                  : undefined
              }
            >
              Sou empresa
            </Button>
          </a>
          <Link to="/admin/login">
            <Button className={isPurple ? 'bg-white text-[#8300ea] hover:bg-white/90' : undefined}>Entrar</Button>
          </Link>
        </div>

        <button
          className={`focus-ring inline-flex h-10 w-10 items-center justify-center rounded-lg border md:hidden ${
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
