import { BriefcaseBusiness, Building2, ClipboardList, UsersRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminStatCard } from '../../components/admin/AdminStatCard';
import { CandidateTable } from '../../components/admin/CandidateTable';
import { EmptyState } from '../../components/public/EmptyState';
import { LoadingState } from '../../components/public/LoadingState';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { getCompanyAccessForCurrentUser } from '../../lib/auth';
import { getCompanyById, getDashboardStats, listApplications, listJobs, updateApplicationStatus } from '../../lib/data';
import type { Application, Company, CompanyUserAccess, DashboardStats, Job } from '../../types';

export function CompanyDashboard() {
  const [access, setAccess] = useState<CompanyUserAccess | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const accessData = await getCompanyAccessForCurrentUser();
    setAccess(accessData);
    if (accessData) {
      const [companyData, statsData, applicationData, jobData] = await Promise.all([
        getCompanyById(accessData.company_id),
        getDashboardStats(accessData.company_id),
        listApplications({ companyId: accessData.company_id }),
        listJobs({ companyId: accessData.company_id }),
      ]);
      setCompany(companyData);
      setStats(statsData);
      setApplications(applicationData.slice(0, 6));
      setJobs(jobData.slice(0, 6));
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  if (loading) return <LoadingState label="Carregando painel da empresa..." />;
  if (!access || !company || !stats) return <EmptyState title="Nenhuma empresa vinculada ao seu usuário." />;

  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-black text-ink-900">{company.name}</h1>
          <p className="mt-2 text-ink-500">Painel da empresa com vagas e candidatos próprios.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/empresa/vagas">
            <Button>
              <BriefcaseBusiness size={18} />
              Criar vaga
            </Button>
          </Link>
          {access.can_edit_company_page ? (
            <Link to="/admin/empresa/perfil">
              <Button variant="secondary">
                <Building2 size={18} />
                Editar página
              </Button>
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard title="Vagas abertas" value={stats.openJobs} icon={BriefcaseBusiness} />
        <AdminStatCard title="Candidaturas" value={stats.totalApplications} icon={ClipboardList} />
        <AdminStatCard title="Novas" value={applications.filter((item) => item.status === 'novo').length} icon={UsersRound} />
        <AdminStatCard title="Vagas cadastradas" value={jobs.length} icon={Building2} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div>
          <h2 className="mb-3 text-xl font-black text-ink-900">Últimos candidatos</h2>
          {applications.length ? (
            <CandidateTable
              applications={applications}
              canDownload={access.can_download_resumes}
              onStatusChange={async (id, status) => {
                await updateApplicationStatus(id, status);
                await load();
              }}
            />
          ) : (
            <EmptyState title="Ainda não há candidaturas para esta vaga." />
          )}
        </div>
        <Card className="p-5">
          <h2 className="text-xl font-black text-ink-900">Vagas da empresa</h2>
          <div className="mt-4 grid gap-3">
            {jobs.length ? (
              jobs.map((job) => (
                <Link key={job.id} to="/admin/empresa/vagas" className="rounded-lg border border-surface-200 p-3 hover:bg-surface-50">
                  <p className="font-bold text-ink-900">{job.title}</p>
                  <p className="text-sm text-ink-500">{job.status}</p>
                </Link>
              ))
            ) : (
              <p className="text-sm text-ink-500">Nenhuma vaga cadastrada.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
