import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Button } from '../ui/Button';

const links = [
  { label: 'Início', to: '/' },
  { label: 'Empresas', to: '/empresas' },
  { label: 'Vagas', to: '/vagas' },
  { label: 'Para empresas', to: '/#para-empresas' },
];

export function PublicHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-surface-200 bg-white/95 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-3" aria-label="Redde People Jobs">
          <span className="flex h-11 w-36 items-center overflow-hidden rounded-lg bg-ink-900 px-2">
            <img src="/imagens/logo/redde-people-logo.png" alt="Redde People" className="h-9 w-full object-contain" />
          </span>
          <span className="hidden rounded-full bg-redde-50 px-2.5 py-1 text-xs font-black uppercase tracking-[0.14em] text-redde-700 sm:inline-flex">
            Jobs
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `text-sm font-semibold transition hover:text-redde-600 ${
                  isActive ? 'text-redde-600' : 'text-ink-700'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link to="/#para-empresas">
            <Button variant="secondary">Sou empresa</Button>
          </Link>
          <Link to="/admin/login">
            <Button>Entrar</Button>
          </Link>
        </div>

        <button
          className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-lg border border-surface-200 md:hidden"
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
