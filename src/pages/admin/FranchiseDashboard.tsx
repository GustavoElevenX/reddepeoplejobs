import { BriefcaseBusiness, Building2, ClipboardCheck, ListChecks, Send, UsersRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminStatCard } from '../../components/admin/AdminStatCard';
import { CandidateTable } from '../../components/admin/CandidateTable';
import { EmptyState } from '../../components/public/EmptyState';
import { LoadingState } from '../../components/public/LoadingState';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { getCurrentFranchise } from '../../lib/auth';
import {
  getFranchiseDashboardStats,
  listApplications,
  listJobs,
  updateApplicationStatus,
} from '../../lib/data';
import { jobStatusLabels } from '../../lib/formatters';
import type { Application, Franchise, FranchiseDashboardStats, Job } from '../../types';

export function FranchiseDashboard() {
  const [franchise, setFranchise] = useState<Franchise | null>(null);
  const [stats, setStats] = useState<FranchiseDashboardStats | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const franchiseData = await getCurrentFranchise();
    setFranchise(franchiseData);
    if (franchiseData) {
      const [statsData, applicationData, jobData] = await Promise.all([
        getFranchiseDashboardStats(franchiseData.id),
        listApplications({ franchiseId: franchiseData.id }),
        listJobs({ franchiseId: franchiseData.id, limit: 6 }),
      ]);
      setStats(statsData);
      setApplications(applicationData.slice(0, 6));
      setJobs(jobData);
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  if (loading) return <LoadingState label="Carregando operação do franqueado..." />;
  if (!franchise || !stats) return <EmptyState title="Seu usuário não está vinculado a um franqueado ativo." />;

  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-black text-ink-900">{franchise.name}</h1>
          <p className="mt-2 text-ink-500">
            Gerencie vagas, candidatos, clientes e sua operação de recrutamento em um só lugar.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/franqueado/empresas">
            <Button variant="secondary">
              <Building2 size={18} />
              Nova empresa
            </Button>
          </Link>
          <Link to="/admin/franqueado/vagas">
            <Button>
              <BriefcaseBusiness size={18} />
              Abrir vaga
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard title="Vagas abertas" value={stats.openJobs} icon={BriefcaseBusiness} />
        <AdminStatCard title="Candidatos recebidos" value={stats.totalApplications} icon={UsersRound} />
        <AdminStatCard title="Empresas clientes" value={stats.totalCompanies} icon={Building2} />
        <AdminStatCard title="Em triagem" value={stats.candidatesInScreening} icon={ListChecks} />
        <AdminStatCard title="Encaminhados" value={stats.candidatesForwarded} icon={Send} />
        <AdminStatCard title="Vagas fechadas no mês" value={stats.closedJobsThisMonth} icon={ClipboardCheck} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-black text-ink-900">Candidatos recentes</h2>
            <Link to="/admin/franqueado/candidatos" className="text-sm font-bold text-redde-600">
              Ver todos
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
            <EmptyState title="Ainda não há candidatos nesta unidade." />
          )}
        </div>

        <Card className="p-5">
          <h2 className="text-xl font-black text-ink-900">Vagas recentes</h2>
          <div className="mt-4 grid gap-3">
            {jobs.length ? (
              jobs.map((job) => (
                <Link
                  key={job.id}
                  to="/admin/franqueado/vagas"
                  className="rounded-lg border border-surface-200 p-3 hover:bg-surface-50"
                >
                  <p className="font-bold text-ink-900">{job.title}</p>
                  <p className="text-sm text-ink-500">
                    {job.company?.name ?? 'Empresa'} · {jobStatusLabels[job.status]}
                  </p>
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
