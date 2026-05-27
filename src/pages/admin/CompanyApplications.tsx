import { useEffect, useMemo, useState } from 'react';
import { CandidateTable } from '../../components/admin/CandidateTable';
import { EmptyState } from '../../components/public/EmptyState';
import { LoadingState } from '../../components/public/LoadingState';
import { Card } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import { getCompanyAccessForCurrentUser } from '../../lib/auth';
import { listApplications, listJobs, updateApplicationStatus } from '../../lib/data';
import { applicationStatusLabels } from '../../lib/formatters';
import type { Application, ApplicationStatus, CompanyUserAccess, Job } from '../../types';

export function CompanyApplications() {
  const [access, setAccess] = useState<CompanyUserAccess | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobId, setJobId] = useState('all');
  const [status, setStatus] = useState<ApplicationStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const accessData = await getCompanyAccessForCurrentUser();
    setAccess(accessData);
    if (accessData) {
      const [applicationData, jobData] = await Promise.all([
        listApplications({ companyId: accessData.company_id }),
        listJobs({ companyId: accessData.company_id }),
      ]);
      setApplications(applicationData);
      setJobs(jobData);
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    return applications
      .filter((application) => jobId === 'all' || application.job_id === jobId)
      .filter((application) => status === 'all' || application.status === status);
  }, [applications, jobId, status]);

  if (loading) return <LoadingState label="Carregando candidaturas..." />;
  if (!access) return <EmptyState title="Nenhuma empresa vinculada ao seu usuário." />;
  if (!access.can_view_applications) return <EmptyState title="Seu usuário não tem permissão para ver candidatos." />;

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-black text-ink-900">Candidaturas da empresa</h1>
        <p className="mt-2 text-ink-500">Visualize candidatos, baixe currículos e atualize status.</p>
      </div>

      <Card className="grid gap-3 p-3 md:grid-cols-2">
        <Select
          aria-label="Vaga"
          value={jobId}
          onChange={(event) => setJobId(event.target.value)}
          options={[{ label: 'Todas as vagas', value: 'all' }, ...jobs.map((job) => ({ label: job.title, value: job.id }))]}
        />
        <Select
          aria-label="Status"
          value={status}
          onChange={(event) => setStatus(event.target.value as ApplicationStatus | 'all')}
          options={[{ label: 'Todos os status', value: 'all' }, ...Object.entries(applicationStatusLabels).map(([value, label]) => ({ value, label }))]}
        />
      </Card>

      {filtered.length ? (
        <CandidateTable
          applications={filtered}
          canDownload={access.can_download_resumes}
          onStatusChange={async (applicationId, nextStatus) => {
            await updateApplicationStatus(applicationId, nextStatus);
            await load();
          }}
        />
      ) : (
        <EmptyState title="Ainda não há candidaturas para esta vaga." />
      )}
    </div>
  );
}
