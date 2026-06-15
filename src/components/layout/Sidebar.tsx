import {
  BriefcaseBusiness,
  Building2,
  LayoutDashboard,
  ListChecks,
  Network,
  Users,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { isAdminMaster, isFranchisee } from '../../lib/permissions';
import type { Profile } from '../../types';

type SidebarProps = {
  profile: Profile;
};

export function Sidebar({ profile }: SidebarProps) {
  const master = isAdminMaster(profile);
  const franchisee = isFranchisee(profile);
  const links = master
    ? [
        { label: 'Visão da rede', to: '/admin/master', icon: LayoutDashboard },
        { label: 'Franqueados', to: '/admin/master/franqueados', icon: Network },
        { label: 'Empresas clientes', to: '/admin/master/empresas', icon: Building2 },
        { label: 'Vagas', to: '/admin/master/vagas', icon: BriefcaseBusiness },
        { label: 'Candidatos', to: '/admin/master/candidatos', icon: ListChecks },
        { label: 'Usuários', to: '/admin/master/usuarios', icon: Users },
      ]
    : franchisee
      ? [
          { label: 'Minha operação', to: '/admin/franqueado', icon: LayoutDashboard },
          { label: 'Empresas clientes', to: '/admin/franqueado/empresas', icon: Building2 },
          { label: 'Vagas', to: '/admin/franqueado/vagas', icon: BriefcaseBusiness },
          { label: 'Candidatos', to: '/admin/franqueado/candidatos', icon: ListChecks },
        ]
      : [
          { label: 'Painel', to: '/admin/empresa', icon: LayoutDashboard },
          { label: 'Perfil público', to: '/admin/empresa/perfil', icon: Building2 },
          { label: 'Vagas', to: '/admin/empresa/vagas', icon: BriefcaseBusiness },
          { label: 'Candidaturas', to: '/admin/empresa/candidaturas', icon: ListChecks },
        ];

  return (
    <aside className="border-b border-surface-200 bg-ink-900 text-white lg:min-h-screen lg:w-64 lg:border-b-0 lg:border-r">
      <div className="flex items-center gap-3 px-4 py-5">
        <span className="flex h-11 w-36 items-center overflow-hidden">
          <img
            src="/imagens/logo/redde-people-jobs-white.png"
            alt="People Jobs"
            className="h-full w-full object-contain"
          />
        </span>
      </div>
      <p className="px-4 pb-3 text-xs font-semibold text-white/60">
        {master ? 'Admin Master' : franchisee ? 'Operação do franqueado' : 'Área da empresa'}
      </p>
      <nav className="flex gap-2 overflow-x-auto px-3 pb-4 lg:grid lg:overflow-visible">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={['/admin/master', '/admin/franqueado', '/admin/empresa'].includes(link.to)}
              className={({ isActive }) =>
                `flex min-w-max items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  isActive ? 'bg-redde-500 text-white' : 'text-white/75 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon size={17} />
              {link.label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
