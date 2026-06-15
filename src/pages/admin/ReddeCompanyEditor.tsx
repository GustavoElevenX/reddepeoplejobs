import { ArrowLeft, BriefcaseBusiness, Eye, UsersRound } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CompanyForm, type CompanyFormAssets, type CompanyFormValues } from '../../components/admin/CompanyForm';
import { CandidateTable } from '../../components/admin/CandidateTable';
import { EmptyState } from '../../components/public/EmptyState';
import { LoadingState } from '../../components/public/LoadingState';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { getCompanyById, listApplications, listJobs, updateApplicationStatus, updateCompanyImages, upsertCompany } from '../../lib/data';
import { toCompanyPayload } from '../../lib/formPayloads';
import { companyPageStatusLabels, jobStatusLabels } from '../../lib/formatters';
import { uploadCompanyAsset } from '../../lib/storage';
import type { Application, Company, Job } from '../../types';

export function ReddeCompanyEditor() {
  const { id } = useParams();
  const [company, setCompany] = useState<Company | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const companyData = await getCompanyById(id);
    setCompany(companyData);
    if (companyData) {
      const [jobData, applicationData] = await Promise.all([
        listJobs({ companyId: companyData.id }),
        listApplications({ companyId: companyData.id }),
      ]);
      setJobs(jobData);
      setApplications(applicationData);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave(values: CompanyFormValues, assets: CompanyFormAssets) {
    if (!company) return;
    let saved = await upsertCompany(toCompanyPayload(values, company));
    const imageUpdates: Partial<Pick<Company, 'logo_url' | 'cover_image_url'>> = {};

    if (assets.logoFile) {
      imageUpdates.logo_url = await uploadCompanyAsset(assets.logoFile, saved.id, 'logo');
    }

    if (assets.bannerFile) {
      imageUpdates.cover_image_url = await uploadCompanyAsset(assets.bannerFile, saved.id, 'banner');
    }

    if (Object.keys(imageUpdates).length > 0) {
      saved = await updateCompanyImages(saved.id, imageUpdates);
    }

    setCompany(saved);
    await load();
  }

  if (loading) return <LoadingState label="Carregando empresa..." />;
  if (!company) return <EmptyState title="Empresa não encontrada." />;

  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <Link to="/admin/master/empresas" className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-redde-600">
            <ArrowLeft size={16} />
            Voltar para empresas
          </Link>
          <h1 className="text-3xl font-black text-ink-900">{company.name}</h1>
          <p className="mt-2 text-ink-500">Editor completo, vagas, candidatos e usuários vinculados.</p>
        </div>
        <Link to={`/empresa/${company.slug}`} target="_blank">
          <Button variant="secondary">
            <Eye size={18} />
            Ver página pública
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <BriefcaseBusiness className="text-redde-600" />
          <p className="mt-3 text-3xl font-black text-ink-900">{jobs.length}</p>
          <p className="text-sm text-ink-500">Vagas cadastradas</p>
        </Card>
        <Card className="p-5">
          <UsersRound className="text-redde-600" />
          <p className="mt-3 text-3xl font-black text-ink-900">{applications.length}</p>
          <p className="text-sm text-ink-500">Candidatos recebidos</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-semibold text-ink-500">Status</p>
          <p className="mt-3 text-3xl font-black text-ink-900">{companyPageStatusLabels[company.page_status]}</p>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="mb-4 text-xl font-black text-ink-900">Dados públicos da empresa</h2>
        <CompanyForm company={company} onSubmit={handleSave} submitLabel="Salvar alterações" />
      </Card>

      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-black text-ink-900">Vagas da empresa</h2>
          <Link to="/admin/master/vagas">
            <Button variant="secondary" size="sm">Gerenciar vagas</Button>
          </Link>
        </div>
        <div className="grid gap-3">
          {jobs.length ? (
            jobs.map((job) => (
              <div key={job.id} className="rounded-lg border border-surface-200 p-3">
                <p className="font-bold text-ink-900">{job.title}</p>
                <p className="text-sm text-ink-500">{jobStatusLabels[job.status]}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-ink-500">Nenhuma vaga cadastrada.</p>
          )}
        </div>
      </Card>

      <div>
        <h2 className="mb-4 text-xl font-black text-ink-900">Candidatos da empresa</h2>
        {applications.length ? (
          <CandidateTable
            applications={applications}
            onStatusChange={async (applicationId, status) => {
              await updateApplicationStatus(applicationId, status);
              await load();
            }}
          />
        ) : (
          <EmptyState title="Ainda não há candidaturas para esta empresa." />
        )}
      </div>
    </div>
  );
}
