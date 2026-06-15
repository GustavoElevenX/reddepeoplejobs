import { Edit, Eye, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CompanyForm, type CompanyFormAssets, type CompanyFormValues } from '../../components/admin/CompanyForm';
import { EmptyState } from '../../components/public/EmptyState';
import { LoadingState } from '../../components/public/LoadingState';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { getCurrentFranchise } from '../../lib/auth';
import { listCompanies, updateCompanyImages, upsertCompany } from '../../lib/data';
import { toCompanyPayload } from '../../lib/formPayloads';
import {
  companyCommercialStatusLabels,
  companyPageStatusLabels,
  formatLocation,
} from '../../lib/formatters';
import { uploadCompanyAsset } from '../../lib/storage';
import type { Company, CompanyCommercialStatus, Franchise } from '../../types';

export function FranchiseCompanies() {
  const [franchise, setFranchise] = useState<Franchise | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [editing, setEditing] = useState<Company | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [commercialStatus, setCommercialStatus] = useState<CompanyCommercialStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const franchiseData = await getCurrentFranchise();
    setFranchise(franchiseData);
    setCompanies(franchiseData ? await listCompanies({ franchiseId: franchiseData.id }) : []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(
    () =>
      companies
        .filter((company) => !search || company.name.toLowerCase().includes(search.toLowerCase()))
        .filter((company) => commercialStatus === 'all' || company.commercial_status === commercialStatus),
    [commercialStatus, companies, search],
  );

  async function handleSave(values: CompanyFormValues, assets: CompanyFormAssets) {
    if (!franchise) return;
    let saved = await upsertCompany({
      ...toCompanyPayload(values, editing),
      franchise_id: franchise.id,
    });
    const imageUpdates: Partial<Pick<Company, 'logo_url' | 'cover_image_url'>> = {};

    if (assets.logoFile) imageUpdates.logo_url = await uploadCompanyAsset(assets.logoFile, saved.id, 'logo');
    if (assets.bannerFile) imageUpdates.cover_image_url = await uploadCompanyAsset(assets.bannerFile, saved.id, 'banner');
    if (Object.keys(imageUpdates).length) saved = await updateCompanyImages(saved.id, imageUpdates);

    setEditing(null);
    setModalOpen(false);
    await load();
  }

  if (loading) return <LoadingState label="Carregando empresas clientes..." />;
  if (!franchise) return <EmptyState title="Seu usuário não está vinculado a um franqueado." />;

  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-black text-ink-900">Empresas clientes</h1>
          <p className="mt-2 text-ink-500">Cadastre clientes e acompanhe o estágio comercial de cada conta.</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          <Plus size={18} />
          Nova empresa cliente
        </Button>
      </div>

      <Card className="grid gap-3 p-3 md:grid-cols-[1fr_220px]">
        <Input
          aria-label="Buscar empresa cliente"
          placeholder="Buscar por nome"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Select
          aria-label="Status comercial"
          value={commercialStatus}
          onChange={(event) => setCommercialStatus(event.target.value as CompanyCommercialStatus | 'all')}
          options={[
            { label: 'Todos os status', value: 'all' },
            ...Object.entries(companyCommercialStatusLabels).map(([value, label]) => ({ value, label })),
          ]}
        />
      </Card>

      {filtered.length ? (
        <div className="grid gap-4">
          {filtered.map((company) => (
            <Card key={company.id} className="grid gap-4 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-black text-ink-900">{company.name}</h2>
                  <Badge variant={company.commercial_status === 'active_client' ? 'success' : 'neutral'}>
                    {companyCommercialStatusLabels[company.commercial_status]}
                  </Badge>
                  <Badge variant={company.page_status === 'published' ? 'info' : 'neutral'}>
                    {companyPageStatusLabels[company.page_status]}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-ink-500">
                  {company.segment ?? 'Sem segmento'} · {formatLocation(company.city, company.state)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {company.page_status === 'published' ? (
                  <Link to={`/empresa/${company.slug}`} target="_blank">
                    <Button variant="secondary" size="sm">
                      <Eye size={16} />
                      Página pública
                    </Button>
                  </Link>
                ) : null}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setEditing(company);
                    setModalOpen(true);
                  }}
                >
                  <Edit size={16} />
                  Editar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="Nenhuma empresa cliente encontrada." />
      )}

      <Modal
        open={modalOpen}
        title={editing ? 'Editar empresa cliente' : 'Nova empresa cliente'}
        description={`Esta empresa ficará vinculada à unidade ${franchise.name}.`}
        onClose={() => setModalOpen(false)}
      >
        <CompanyForm
          company={editing}
          fixedFranchiseId={franchise.id}
          onSubmit={handleSave}
        />
      </Modal>
    </div>
  );
}
