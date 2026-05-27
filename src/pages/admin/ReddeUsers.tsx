import { ShieldCheck, UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { EmptyState } from '../../components/public/EmptyState';
import { LoadingState } from '../../components/public/LoadingState';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { listCompanies, listCompanyAccess, listProfiles } from '../../lib/data';
import type { Company, CompanyUserAccess, Profile } from '../../types';

export function ReddeUsers() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [access, setAccess] = useState<CompanyUserAccess[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [profileData, accessData, companyData] = await Promise.all([listProfiles(), listCompanyAccess(), listCompanies()]);
      setProfiles(profileData);
      setAccess(accessData);
      setCompanies(companyData);
      setLoading(false);
    }

    void load();
  }, []);

  function companyName(companyId: string) {
    return companies.find((company) => company.id === companyId)?.name ?? 'Empresa';
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-black text-ink-900">Usuários</h1>
        <p className="mt-2 text-ink-500">Gerencie acessos internos Redde e usuários administradores das empresas.</p>
      </div>

      <Card className="grid gap-4 p-5 lg:grid-cols-[auto_1fr]">
        <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-redde-50 text-redde-600">
          <UserPlus size={24} />
        </span>
        <div>
          <h2 className="text-xl font-black text-ink-900">Criação segura de usuários</h2>
          <p className="mt-2 text-sm leading-6 text-ink-500">
            A tela está pronta para operar com a Edge Function <code>create-company-user</code>. Para o MVP inicial,
            cadastre usuários manualmente no Supabase Auth e vincule em <code>profiles</code> e <code>company_user_access</code>,
            sem expor <code>SUPABASE_SERVICE_ROLE_KEY</code> no front-end.
          </p>
        </div>
      </Card>

      {loading ? (
        <LoadingState label="Carregando usuários..." />
      ) : profiles.length ? (
        <div className="grid gap-4">
          {profiles.map((profile) => {
            const links = access.filter((item) => item.user_id === profile.id);
            return (
              <Card key={profile.id} className="p-4">
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-black text-ink-900">{profile.full_name}</h2>
                      <Badge variant={profile.is_active ? 'success' : 'danger'}>{profile.is_active ? 'Ativo' : 'Inativo'}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-ink-500">{profile.email}</p>
                  </div>
                  <Badge variant="info">{profile.role}</Badge>
                </div>
                {links.length ? (
                  <div className="mt-4 grid gap-2">
                    {links.map((item) => (
                      <div key={item.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-surface-50 p-3 text-sm text-ink-500">
                        <ShieldCheck size={16} className="text-redde-600" />
                        <strong className="text-ink-900">{companyName(item.company_id)}</strong>
                        <span>Editar página: {item.can_edit_company_page ? 'sim' : 'não'}</span>
                        <span>Vagas: {item.can_manage_jobs ? 'sim' : 'não'}</span>
                        <span>Candidatos: {item.can_view_applications ? 'sim' : 'não'}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState title="Nenhum usuário encontrado." />
      )}
    </div>
  );
}
