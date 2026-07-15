import {
  BadgeDollarSign,
  Building2,
  CalendarDays,
  FileText,
  LayoutDashboard,
  MessageSquareText,
  Network,
  ReceiptText,
  Settings,
  Star,
  Users,
  UsersRound,
  Workflow,
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
        { label: 'Processos seletivos', to: '/admin/processos', icon: Workflow },
        { label: 'Usuários', to: '/admin/master/usuarios', icon: Users },
      ]
    : franchisee
      ? [
          { label: 'Dashboard', to: '/admin/franqueado', icon: LayoutDashboard },
          { label: 'CRM de vendas', to: '/admin/franqueado/crm', icon: Workflow },
          { label: 'Clientes', to: '/admin/franqueado/clientes', icon: Building2 },
          { label: 'Projetos', to: '/admin/franqueado/projetos', icon: Network },
          { label: 'Processos seletivos', to: '/franqueado/processos', icon: Workflow },
          { label: 'Vagas', to: '/admin/franqueado/vagas', icon: FileText },
          { label: 'Candidatos', to: '/admin/franqueado/candidatos', icon: UsersRound },
          { label: 'Agenda', to: '/admin/franqueado/agenda', icon: CalendarDays },
          { label: 'Chat', to: '/admin/franqueado/chat', icon: MessageSquareText },
          { label: 'Contratos', to: '/admin/franqueado/contratos', icon: FileText },
          { label: 'Financeiro', to: '/admin/franqueado/financeiro', icon: BadgeDollarSign },
          { label: 'Notas fiscais', to: '/admin/franqueado/notas-fiscais', icon: ReceiptText },
          { label: 'Documentos', to: '/admin/franqueado/documentos', icon: FileText },
          { label: 'Pós-venda', to: '/admin/franqueado/pos-venda', icon: Star },
          { label: 'Relatórios', to: '/admin/franqueado/relatorios', icon: FileText },
          { label: 'Configurações', to: '/admin/franqueado/configuracoes', icon: Settings },
        ]
      : [
          { label: 'Painel', to: '/admin/empresa', icon: LayoutDashboard },
          { label: 'Perfil público', to: '/admin/empresa/perfil', icon: Building2 },
          { label: 'Processos seletivos', to: '/empresa/processos', icon: Workflow },
        ];

  return (
    <aside className="border-b border-surface-200 bg-ink-900 text-white lg:min-h-screen lg:w-64 lg:border-b-0 lg:border-r">
      <div className="flex items-center gap-3 px-4 py-5">
        <span className="flex h-11 w-36 items-center overflow-hidden">
          <img
            src="/imagens/logo/logo-nova.png"
            alt="Recruitify"
            className="h-full w-full object-contain brightness-0 invert"
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
