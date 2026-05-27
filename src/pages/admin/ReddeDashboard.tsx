import { BriefcaseBusiness, Building2, ClipboardList, Sparkles, UsersRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminStatCard } from '../../components/admin/AdminStatCard';
import { CandidateTable } from '../../components/admin/CandidateTable';
import { EmptyState } from '../../components/public/EmptyState';
import { LoadingState } from '../../components/public/LoadingState';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { getDashboardStats, listApplications, listJobs, updateApplicationStatus } from '../../lib/data';
import type { Application, DashboardStats, Job } from '../../types';

export function ReddeDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [statsData, applicationData, jobData] = await Promise.all([
      getDashboardStats(),
      listApplications(),
      listJobs({ limit: 6 }),
    ]);
    setStats(statsData);
    setApplications(applicationData.slice(0, 6));
    setJobs(jobData.slice(0, 6));
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  if (loading || !stats) return <LoadingState label="Carregando painel Redde..." />;

  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-black text-ink-900">Dashboard Redde People</h1>
          <p className="mt-2 text-ink-500">Visão global de empresas, vagas e candidaturas.</p>
        </div>
        <Link to="/admin/redde/empresas">
          <Button>
            <Building2 size={18} />
            Nova empresa
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <AdminStatCard title="Empresas" value={stats.totalCompanies} icon={Building2} />
        <AdminStatCard title="Publicadas" value={stats.publishedCompanies} icon={Sparkles} />
        <AdminStatCard title="Vagas abertas" value={stats.openJobs} icon={BriefcaseBusiness} />
        <AdminStatCard title="Candidaturas" value={stats.totalApplications} icon={ClipboardList} />
        <AdminStatCard title="Últimos 7 dias" value={stats.applicationsLast7Days} icon={UsersRound} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-black text-ink-900">Últimas candidaturas</h2>
            <Link to="/admin/redde/candidaturas" className="text-sm font-bold text-redde-600">
              Ver todas
            </Link>
          </div>
          {applications.length ? (
            <CandidateTable
              applications={applications}
              showCompany
              onStatusChange={async (id, status) => {
                await updateApplicationStatus(id, status);
                await load();
              }}
            />
          ) : (
            <EmptyState title="Ainda não há candidaturas." />
          )}
        </div>

        <Card className="p-5">
          <h2 className="text-xl font-black text-ink-900">Últimas vagas criadas</h2>
          <div className="mt-4 grid gap-3">
            {jobs.length ? (
              jobs.map((job) => (
                <Link key={job.id} to="/admin/redde/vagas" className="rounded-lg border border-surface-200 p-3 hover:bg-surface-50">
                  <p className="font-bold text-ink-900">{job.title}</p>
                  <p className="text-sm text-ink-500">{job.company?.name ?? 'Empresa'}</p>
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
