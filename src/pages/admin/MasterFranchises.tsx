import { Building2, Edit, Plus, Power, UsersRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { FranchiseForm, type FranchiseFormValues } from '../../components/admin/FranchiseForm';
import { EmptyState } from '../../components/public/EmptyState';
import { LoadingState } from '../../components/public/LoadingState';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import {
  createAdminUser,
  listApplications,
  listCompanies,
  listFranchises,
  listJobs,
  upsertFranchise,
} from '../../lib/data';
import { franchiseStatusLabels } from '../../lib/formatters';
import type { Franchise } from '../../types';

function emptyToNull(value?: string) {
  return value?.trim() || null;
}

export function MasterFranchises() {
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [metrics, setMetrics] = useState<Record<string, { companies: number; jobs: number; applications: number }>>({});
  const [editing, setEditing] = useState<Franchise | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [franchiseData, companies, jobs, applications] = await Promise.all([
      listFranchises(),
      listCompanies(),
      listJobs(),
      listApplications(),
    ]);
    setFranchises(franchiseData);
    setMetrics(
      Object.fromEntries(
        franchiseData.map((franchise) => [
          franchise.id,
          {
            companies: companies.filter((company) => company.franchise_id === franchise.id).length,
            jobs: jobs.filter((job) => job.franchise_id === franchise.id).length,
            applications: applications.filter((application) => application.franchise_id === franchise.id).length,
          },
        ]),
      ),
    );
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(
    () =>
      franchises.filter(
        (franchise) =>
          !search ||
          franchise.name.toLowerCase().includes(search.toLowerCase()) ||
          franchise.city?.toLowerCase().includes(search.toLowerCase()),
      ),
    [franchises, search],
  );

  async function handleSave(values: FranchiseFormValues) {
    setError('');
    setFeedback('');

    if (!editing && Boolean(values.user_full_name?.trim()) !== Boolean(values.user_email?.trim())) {
      setError('Para criar o acesso inicial, informe nome e e-mail do usuário.');
      return;
    }

    try {
      const saved = await upsertFranchise({
        id: editing?.id,
        name: values.name.trim(),
        slug: values.slug.trim(),
        legal_name: emptyToNull(values.legal_name),
        document: emptyToNull(values.document),
        contact_name: emptyToNull(values.contact_name),
        contact_email: emptyToNull(values.contact_email),
        contact_phone: emptyToNull(values.contact_phone),
        city: emptyToNull(values.city),
        state: emptyToNull(values.state) ?? 'MA',
        status: values.status,
        created_at: editing?.created_at,
      });

      if (!editing && values.user_full_name?.trim() && values.user_email?.trim()) {
        const created = await createAdminUser({
          fullName: values.user_full_name.trim(),
          email: values.user_email.trim(),
          password: values.user_password?.trim() || undefined,
          role: 'franqueado',
          franchiseId: saved.id,
          permissions: {
            can_edit_company_page: true,
            can_manage_jobs: true,
            can_view_applications: true,
            can_download_resumes: true,
          },
        });
        setFeedback(
          created.temporaryPassword
            ? `Franqueado e usuário criados. Senha temporária: ${created.temporaryPassword}`
            : 'Franqueado e usuário criados com sucesso.',
        );
      } else {
        setFeedback(editing ? 'Franqueado atualizado.' : 'Franqueado cadastrado.');
      }

      setModalOpen(false);
      setEditing(null);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível salvar o franqueado.');
    }
  }

  async function toggleStatus(franchise: Franchise) {
    await upsertFranchise({
      ...franchise,
      status: franchise.status === 'active' ? 'inactive' : 'active',
    });
    await load();
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-black text-ink-900">Franqueados</h1>
          <p className="mt-2 text-ink-500">Cadastre unidades e acompanhe a operação de recrutamento da rede.</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          <Plus size={18} />
          Cadastrar franqueado
        </Button>
      </div>

      {feedback ? <div className="rounded-lg bg-redde-50 p-3 text-sm font-semibold text-redde-700">{feedback}</div> : null}
      {error ? <div className="rounded-lg bg-ink-900 p-3 text-sm font-semibold text-white">{error}</div> : null}

      <Card className="p-3">
        <Input
          aria-label="Buscar franqueado"
          placeholder="Buscar por unidade ou cidade"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </Card>

      {loading ? (
        <LoadingState label="Carregando franqueados..." />
      ) : filtered.length ? (
        <div className="grid gap-4">
          {filtered.map((franchise) => {
            const franchiseMetrics = metrics[franchise.id] ?? { companies: 0, jobs: 0, applications: 0 };
            return (
              <Card key={franchise.id} className="grid gap-4 p-5 xl:grid-cols-[1fr_auto] xl:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-black text-ink-900">{franchise.name}</h2>
                    <Badge variant={franchise.status === 'active' ? 'success' : 'neutral'}>
                      {franchiseStatusLabels[franchise.status]}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-ink-500">
                    {[franchise.city, franchise.state].filter(Boolean).join(', ') || 'Localidade não informada'}
                    {franchise.contact_name ? ` · ${franchise.contact_name}` : ''}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-4 text-sm text-ink-500">
                    <span className="flex items-center gap-1.5">
                      <Building2 size={15} /> {franchiseMetrics.companies} empresas
                    </span>
                    <span>{franchiseMetrics.jobs} vagas</span>
                    <span className="flex items-center gap-1.5">
                      <UsersRound size={15} /> {franchiseMetrics.applications} candidatos
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setEditing(franchise);
                      setModalOpen(true);
                    }}
                  >
                    <Edit size={16} />
                    Editar
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => void toggleStatus(franchise)}>
                    <Power size={16} />
                    {franchise.status === 'active' ? 'Desativar' : 'Ativar'}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState title="Nenhum franqueado encontrado." />
      )}

      <Modal
        open={modalOpen}
        title={editing ? 'Editar franqueado' : 'Cadastrar franqueado'}
        description="A unidade será usada para isolar empresas, vagas e candidatos."
        onClose={() => setModalOpen(false)}
      >
        <FranchiseForm franchise={editing} onSubmit={handleSave} />
      </Modal>
    </div>
  );
}
