import { Edit, Eye, Plus, Search } from 'lucide-react';
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
import { listCompanies, listFranchises, updateCompanyImages, upsertCompany } from '../../lib/data';
import { toCompanyPayload } from '../../lib/formPayloads';
import { companyCommercialStatusLabels, companyPageStatusLabels, formatLocation } from '../../lib/formatters';
import { uploadCompanyAsset } from '../../lib/storage';
import type { Company, CompanyPageStatus, Franchise } from '../../types';

export function ReddeCompanies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [editing, setEditing] = useState<Company | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [franchiseId, setFranchiseId] = useState('all');
  const [status, setStatus] = useState<CompanyPageStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [companyData, franchiseData] = await Promise.all([listCompanies(), listFranchises()]);
    setCompanies(companyData);
    setFranchises(franchiseData);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    return companies
      .filter((company) => !search || company.name.toLowerCase().includes(search.toLowerCase()))
      .filter((company) => franchiseId === 'all' || company.franchise_id === franchiseId)
      .filter((company) => status === 'all' || company.page_status === status);
  }, [companies, franchiseId, search, status]);

  async function handleSave(values: CompanyFormValues, assets: CompanyFormAssets) {
    const saved = await upsertCompany(toCompanyPayload(values, editing));
    const imageUpdates: Partial<Pick<Company, 'logo_url' | 'cover_image_url'>> = {};

    if (assets.logoFile) {
      imageUpdates.logo_url = await uploadCompanyAsset(assets.logoFile, saved.id, 'logo');
    }

    if (assets.bannerFile) {
      imageUpdates.cover_image_url = await uploadCompanyAsset(assets.bannerFile, saved.id, 'banner');
    }

    if (Object.keys(imageUpdates).length > 0) {
      await updateCompanyImages(saved.id, imageUpdates);
    }

    setModalOpen(false);
    setEditing(null);
    await load();
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-black text-ink-900">Empresas clientes</h1>
          <p className="mt-2 text-ink-500">Acompanhe as empresas de todos os franqueados.</p>
        </div>
        <Button
          disabled={!franchises.length}
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          <Plus size={18} />
          Criar empresa cliente
        </Button>
      </div>

      {!franchises.length && !loading ? (
        <div className="rounded-lg bg-redde-50 p-3 text-sm font-semibold text-redde-700">
          Cadastre um franqueado antes de criar a primeira empresa cliente.
        </div>
      ) : null}

      <Card className="grid gap-3 p-3 md:grid-cols-[1fr_220px_220px]">
        <Input
          placeholder="Buscar por nome"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Buscar empresa"
        />
        <Select
          aria-label="Filtrar franqueado"
          value={franchiseId}
          onChange={(event) => setFranchiseId(event.target.value)}
          options={[
            { label: 'Todos os franqueados', value: 'all' },
            ...franchises.map((franchise) => ({ label: franchise.name, value: franchise.id })),
          ]}
        />
        <Select
          aria-label="Filtrar status"
          value={status}
          onChange={(event) => setStatus(event.target.value as CompanyPageStatus | 'all')}
          options={[
            { label: 'Todos os status', value: 'all' },
            { label: 'Rascunho', value: 'draft' },
            { label: 'Publicada', value: 'published' },
            { label: 'Arquivada', value: 'archived' },
          ]}
        />
      </Card>

      {loading ? (
        <LoadingState label="Carregando empresas..." />
      ) : filtered.length ? (
        <div className="grid gap-4">
          {filtered.map((company) => (
            <Card key={company.id} className="grid gap-4 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-black text-ink-900">{company.name}</h2>
                  <Badge variant={company.page_status === 'published' ? 'success' : 'neutral'}>{companyPageStatusLabels[company.page_status]}</Badge>
                  <Badge variant="info">{companyCommercialStatusLabels[company.commercial_status]}</Badge>
                  {company.is_featured ? <Badge variant="info">Destaque</Badge> : null}
                </div>
                <p className="mt-1 text-sm text-ink-500">
                  {company.franchise?.name ?? 'Sem franqueado'} · {company.segment ?? 'Sem segmento'} · {formatLocation(company.city, company.state)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link to={`/empresa/${company.slug}`} target="_blank">
                  <Button variant="secondary" size="sm">
                    <Eye size={16} />
                    Ver página
                  </Button>
                </Link>
                <Link to={`/admin/master/empresas/${company.id}`}>
                  <Button variant="secondary" size="sm">
                    <Search size={16} />
                    Gerenciar
                  </Button>
                </Link>
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
        <EmptyState title="Nenhuma empresa encontrada." />
      )}

      <Modal
        open={modalOpen}
        title={editing ? 'Editar empresa' : 'Criar empresa'}
        description="Todos os textos públicos da empresa ficam editáveis aqui."
        onClose={() => setModalOpen(false)}
      >
        <CompanyForm company={editing} franchises={franchises} onSubmit={handleSave} />
      </Modal>
    </div>
  );
}
