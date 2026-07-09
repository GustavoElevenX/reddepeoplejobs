import { Building2, Save, ShieldCheck, Trash2, UserPlus } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { EmptyState } from '../../components/public/EmptyState';
import { LoadingState } from '../../components/public/LoadingState';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import {
  assignCompanyAccess,
  createAdminUser,
  deleteUser,
  listCompanies,
  listCompanyAccess,
  listFranchises,
  listProfiles,
  updateProfileFranchise,
  updateCompanyAccess,
  type UserPermissionInput,
} from '../../lib/data';
import { roleLabels } from '../../lib/formatters';
import type { Company, CompanyUserAccess, Franchise, Profile } from '../../types';

const defaultPermissions: UserPermissionInput = {
  can_edit_company_page: true,
  can_manage_jobs: true,
  can_view_applications: true,
  can_download_resumes: true,
};

const permissionLabels: Array<{ key: keyof UserPermissionInput; label: string }> = [
  { key: 'can_edit_company_page', label: 'Editar página da empresa' },
  { key: 'can_manage_jobs', label: 'Gerenciar vagas' },
  { key: 'can_view_applications', label: 'Ver candidatos' },
  { key: 'can_download_resumes', label: 'Baixar currículos' },
];

type CreateUserForm = {
  fullName: string;
  email: string;
  password: string;
  role: 'admin_master' | 'franqueado' | 'empresa_cliente' | 'redde_admin' | 'company_admin' | 'company_recruiter';
  franchiseId: string;
  companyId: string;
  permissions: UserPermissionInput;
};

type AssignForm = {
  userId: string;
  companyId: string;
  permissions: UserPermissionInput;
};

const initialCreateForm: CreateUserForm = {
  fullName: '',
  email: '',
  password: '',
  role: 'franqueado',
  franchiseId: '',
  companyId: '',
  permissions: defaultPermissions,
};

const initialAssignForm: AssignForm = {
  userId: '',
  companyId: '',
  permissions: defaultPermissions,
};

export function ReddeUsers() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [access, setAccess] = useState<CompanyUserAccess[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [permissionDrafts, setPermissionDrafts] = useState<Record<string, UserPermissionInput>>({});
  const [franchiseDrafts, setFranchiseDrafts] = useState<Record<string, string>>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateUserForm>(initialCreateForm);
  const [assignForm, setAssignForm] = useState<AssignForm>(initialAssignForm);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [profileData, accessData, companyData, franchiseData] = await Promise.all([
      listProfiles(),
      listCompanyAccess(),
      listCompanies(),
      listFranchises(),
    ]);
    setProfiles(profileData);
    setAccess(accessData);
    setCompanies(companyData);
    setFranchises(franchiseData);
    setPermissionDrafts(
      Object.fromEntries(
        accessData.map((item) => [
          item.id,
          {
            can_edit_company_page: item.can_edit_company_page,
            can_manage_jobs: item.can_manage_jobs,
            can_view_applications: item.can_view_applications,
            can_download_resumes: item.can_download_resumes,
          },
        ]),
      ),
    );
    setFranchiseDrafts(
      Object.fromEntries(
        profileData
          .filter((profile) => profile.role === 'franqueado')
          .map((profile) => [profile.id, profile.franchise_id ?? '']),
      ),
    );
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  function companyName(companyId: string) {
    return companies.find((company) => company.id === companyId)?.name ?? 'Empresa';
  }

  function franchiseName(franchiseId?: string | null) {
    return franchises.find((franchise) => franchise.id === franchiseId)?.name ?? 'Franqueado não informado';
  }

  function updateCreatePermission(key: keyof UserPermissionInput, value: boolean) {
    setCreateForm((current) => ({
      ...current,
      permissions: { ...current.permissions, [key]: value },
    }));
  }

  function updateAssignPermission(key: keyof UserPermissionInput, value: boolean) {
    setAssignForm((current) => ({
      ...current,
      permissions: { ...current.permissions, [key]: value },
    }));
  }

  function updateDraftPermission(accessId: string, key: keyof UserPermissionInput, value: boolean) {
    setPermissionDrafts((current) => ({
      ...current,
      [accessId]: {
        ...current[accessId],
        [key]: value,
      },
    }));
  }

  async function handleCreateUser(event: FormEvent) {
    event.preventDefault();
    setError('');
    setFeedback('');

    if (!createForm.fullName.trim() || !createForm.email.trim()) {
      setError('Informe nome e e-mail para criar o usuário.');
      return;
    }

    if (createForm.role === 'franqueado' && !createForm.franchiseId) {
      setError('Selecione o franqueado deste usuário.');
      return;
    }

    if (['empresa_cliente', 'company_admin', 'company_recruiter'].includes(createForm.role) && !createForm.companyId) {
      setError('Selecione uma empresa para usuários de cliente.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await createAdminUser({
        fullName: createForm.fullName.trim(),
        email: createForm.email.trim(),
        password: createForm.password.trim() || undefined,
        role: createForm.role,
        franchiseId: createForm.role === 'franqueado' ? createForm.franchiseId : undefined,
        companyId: ['empresa_cliente', 'company_admin', 'company_recruiter'].includes(createForm.role)
          ? createForm.companyId
          : undefined,
        permissions: createForm.permissions,
      });

      setFeedback(
        created.temporaryPassword
          ? `Usuário criado. Senha temporária: ${created.temporaryPassword}`
          : 'Usuário criado com sucesso.',
      );
      setCreateForm(initialCreateForm);
      setCreateOpen(false);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível criar o usuário.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAssignAccess(event: FormEvent) {
    event.preventDefault();
    setError('');
    setFeedback('');

    if (!assignForm.userId || !assignForm.companyId) {
      setError('Selecione usuário e empresa para atribuir acesso.');
      return;
    }

    setSubmitting(true);
    try {
      await assignCompanyAccess(assignForm.userId, assignForm.companyId, assignForm.permissions);
      setFeedback('Acesso atribuído com sucesso.');
      setAssignForm(initialAssignForm);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível atribuir acesso.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveAccess(item: CompanyUserAccess) {
    setError('');
    setFeedback('');
    setSubmitting(true);
    try {
      await updateCompanyAccess(item.id, permissionDrafts[item.id]);
      setFeedback('Permissões atualizadas.');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível atualizar permissões.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveFranchise(profile: Profile) {
    setError('');
    setFeedback('');

    const franchiseId = franchiseDrafts[profile.id] || '';
    if (!franchiseId) {
      setError('Selecione uma franquia para este usuário franqueado.');
      return;
    }

    setSubmitting(true);
    try {
      await updateProfileFranchise(profile.id, franchiseId);
      setFeedback('Franquia do usuário atualizada.');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível atualizar a franquia do usuário.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteUser(profileId: string) {
    setError('');
    setFeedback('');
    setSubmitting(true);
    try {
      await deleteUser(profileId);
      setFeedback('Usuário removido com sucesso.');
      setDeleteConfirmId(null);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível remover o usuário.');
      setDeleteConfirmId(null);
    } finally {
      setSubmitting(false);
    }
  }

  const companyUsers = profiles.filter((profile) =>
    ['empresa_cliente', 'company_admin', 'company_recruiter'].includes(profile.role),
  );

  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-black text-ink-900">Usuários</h1>
          <p className="mt-2 text-ink-500">
            Crie contas, atribua empresas e defina permissões de página, vagas, candidatos e currículos.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <UserPlus size={18} />
          Criar usuário
        </Button>
      </div>

      {feedback ? <div className="rounded-lg bg-redde-50 p-3 text-sm font-semibold text-redde-700">{feedback}</div> : null}
      {error ? <div className="rounded-lg bg-ink-900 p-3 text-sm font-semibold text-white">{error}</div> : null}

      <Card className="p-5">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-redde-50 text-redde-600">
            <Building2 size={20} />
          </span>
          <div>
            <h2 className="text-xl font-black text-ink-900">Atribuir acesso a empresa</h2>
            <p className="text-sm text-ink-500">Use para vincular ou alterar o acesso de um usuário já criado.</p>
          </div>
        </div>

        <form onSubmit={handleAssignAccess} className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="Usuário"
              value={assignForm.userId}
              onChange={(event) => setAssignForm((current) => ({ ...current, userId: event.target.value }))}
              options={[
                { label: 'Selecione um usuário de cliente', value: '' },
                ...companyUsers.map((profile) => ({ label: `${profile.full_name} · ${profile.email}`, value: profile.id })),
              ]}
            />
            <Select
              label="Empresa"
              value={assignForm.companyId}
              onChange={(event) => setAssignForm((current) => ({ ...current, companyId: event.target.value }))}
              options={[
                { label: 'Selecione uma empresa', value: '' },
                ...companies.map((company) => ({ label: company.name, value: company.id })),
              ]}
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {permissionLabels.map((permission) => (
              <label key={permission.key} className="flex items-center gap-2 rounded-lg bg-surface-50 p-3 text-sm font-semibold text-ink-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-redde-500"
                  checked={assignForm.permissions[permission.key]}
                  onChange={(event) => updateAssignPermission(permission.key, event.target.checked)}
                />
                {permission.label}
              </label>
            ))}
          </div>

          <Button type="submit" disabled={submitting} className="w-fit">
            <ShieldCheck size={18} />
            Atribuir acesso
          </Button>
        </form>
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
                    {profile.role === 'franqueado' ? (
                      <p className="mt-1 text-xs font-semibold text-redde-600">{franchiseName(profile.franchise_id)}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="info">{roleLabels[profile.role]}</Badge>
                    {deleteConfirmId === profile.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-ink-500">Confirmar remoção?</span>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                          onClick={() => void handleDeleteUser(profile.id)}
                          disabled={submitting}
                        >
                          Sim, remover
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => setDeleteConfirmId(null)} disabled={submitting}>
                          Cancelar
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="border-red-200 text-red-600 hover:bg-red-50"
                        onClick={() => setDeleteConfirmId(profile.id)}
                        disabled={submitting}
                        title="Remover usuário"
                      >
                        <Trash2 size={15} />
                        Remover
                      </Button>
                    )}
                  </div>
                </div>

                {profile.role === 'franqueado' ? (
                  <div className="mt-4 grid gap-3 rounded-lg bg-surface-50 p-3 md:grid-cols-[1fr_auto] md:items-end">
                    <Select
                      label="Franquia vinculada"
                      value={franchiseDrafts[profile.id] ?? ''}
                      onChange={(event) =>
                        setFranchiseDrafts((current) => ({ ...current, [profile.id]: event.target.value }))
                      }
                      options={[
                        { label: 'Selecione uma franquia', value: '' },
                        ...franchises.map((franchise) => ({
                          label: `${franchise.name} (${franchise.status === 'active' ? 'Ativa' : 'Inativa'})`,
                          value: franchise.id,
                        })),
                      ]}
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => void handleSaveFranchise(profile)}
                      disabled={submitting || (franchiseDrafts[profile.id] ?? '') === (profile.franchise_id ?? '')}
                    >
                      <Save size={15} />
                      Salvar franquia
                    </Button>
                  </div>
                ) : null}

                {links.length ? (
                  <div className="mt-4 grid gap-3">
                    {links.map((item) => {
                      const draft = permissionDrafts[item.id] ?? defaultPermissions;
                      return (
                        <div key={item.id} className="rounded-lg bg-surface-50 p-3">
                          <div className="mb-3 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                            <div className="flex items-center gap-2 text-sm">
                              <ShieldCheck size={16} className="text-redde-600" />
                              <strong className="text-ink-900">{companyName(item.company_id)}</strong>
                            </div>
                            <Button variant="secondary" size="sm" onClick={() => handleSaveAccess(item)} disabled={submitting}>
                              <Save size={15} />
                              Salvar permissões
                            </Button>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                            {permissionLabels.map((permission) => (
                              <label key={permission.key} className="flex items-center gap-2 text-sm text-ink-700">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 accent-redde-500"
                                  checked={draft[permission.key]}
                                  onChange={(event) => updateDraftPermission(item.id, permission.key, event.target.checked)}
                                />
                                {permission.label}
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : ['empresa_cliente', 'company_admin', 'company_recruiter'].includes(profile.role) ? (
                  <p className="mt-4 rounded-lg bg-surface-50 p-3 text-sm text-ink-500">Usuário ainda não vinculado a uma empresa.</p>
                ) : null}
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState title="Nenhum usuário encontrado." />
      )}

      <Modal
        open={createOpen}
        title="Criar usuário"
        description="Crie uma conta interna People Jobs ou uma conta de cliente com empresa e permissões."
        onClose={() => setCreateOpen(false)}
      >
        <form onSubmit={handleCreateUser} className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Nome completo"
              value={createForm.fullName}
              onChange={(event) => setCreateForm((current) => ({ ...current, fullName: event.target.value }))}
            />
            <Input
              label="E-mail"
              type="email"
              value={createForm.email}
              onChange={(event) => setCreateForm((current) => ({ ...current, email: event.target.value }))}
            />
            <Input
              label="Senha"
              type="password"
              placeholder="Opcional; pode ser definida depois"
              value={createForm.password}
              onChange={(event) => setCreateForm((current) => ({ ...current, password: event.target.value }))}
            />
            <Select
              label="Papel"
              value={createForm.role}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  role: event.target.value as CreateUserForm['role'],
                }))
              }
              options={[
                { label: 'Admin Master', value: 'admin_master' },
                { label: 'Franqueado', value: 'franqueado' },
                { label: 'Empresa cliente', value: 'empresa_cliente' },
                { label: 'Administrador geral', value: 'redde_admin' },
                { label: 'Administrador da empresa', value: 'company_admin' },
                { label: 'Recrutador da empresa', value: 'company_recruiter' },
              ]}
            />
            {createForm.role === 'franqueado' ? (
              <Select
                label="Franqueado"
                value={createForm.franchiseId}
                onChange={(event) => setCreateForm((current) => ({ ...current, franchiseId: event.target.value }))}
                options={[
                  { label: 'Selecione um franqueado', value: '' },
                  ...franchises.map((franchise) => ({ label: franchise.name, value: franchise.id })),
                ]}
              />
            ) : null}
            {['empresa_cliente', 'company_admin', 'company_recruiter'].includes(createForm.role) ? (
              <Select
                label="Empresa"
                value={createForm.companyId}
                onChange={(event) => setCreateForm((current) => ({ ...current, companyId: event.target.value }))}
                options={[
                  { label: 'Selecione uma empresa', value: '' },
                  ...companies.map((company) => ({ label: company.name, value: company.id })),
                ]}
              />
            ) : null}
          </div>

          {['empresa_cliente', 'company_admin', 'company_recruiter'].includes(createForm.role) ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {permissionLabels.map((permission) => (
                <label key={permission.key} className="flex items-center gap-2 rounded-lg bg-surface-50 p-3 text-sm font-semibold text-ink-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-redde-500"
                    checked={createForm.permissions[permission.key]}
                    onChange={(event) => updateCreatePermission(permission.key, event.target.checked)}
                  />
                  {permission.label}
                </label>
              ))}
            </div>
          ) : null}

          <Button type="submit" disabled={submitting}>
            <UserPlus size={18} />
            Criar usuário
          </Button>
        </form>
      </Modal>
    </div>
  );
}
