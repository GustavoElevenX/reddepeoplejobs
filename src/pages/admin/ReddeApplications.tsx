import { useEffect, useMemo, useState } from 'react';
import { CandidateTable } from '../../components/admin/CandidateTable';
import { EmptyState } from '../../components/public/EmptyState';
import { LoadingState } from '../../components/public/LoadingState';
import { Card } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import { listApplications, listCompanies, listJobs, updateApplicationStatus } from '../../lib/data';
import { applicationStatusLabels } from '../../lib/formatters';
import type { Application, ApplicationStatus, Company, Job } from '../../types';

export function ReddeApplications() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [companyId, setCompanyId] = useState('all');
  const [jobId, setJobId] = useState('all');
  const [status, setStatus] = useState<ApplicationStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [applicationData, companyData, jobData] = await Promise.all([listApplications(), listCompanies(), listJobs()]);
    setApplications(applicationData);
    setCompanies(companyData);
    setJobs(jobData);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => companyId === 'all' || job.company_id === companyId);
  }, [companyId, jobs]);

  const filteredApplications = useMemo(() => {
    return applications
      .filter((application) => companyId === 'all' || application.company_id === companyId)
      .filter((application) => jobId === 'all' || application.job_id === jobId)
      .filter((application) => status === 'all' || application.status === status);
  }, [applications, companyId, jobId, status]);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-black text-ink-900">Candidaturas</h1>
        <p className="mt-2 text-ink-500">Acompanhe candidatos de todas as empresas e vagas.</p>
      </div>

      <Card className="grid gap-3 p-3 md:grid-cols-3">
        <Select
          aria-label="Empresa"
          value={companyId}
          onChange={(event) => {
            setCompanyId(event.target.value);
            setJobId('all');
          }}
          options={[{ label: 'Todas as empresas', value: 'all' }, ...companies.map((company) => ({ label: company.name, value: company.id }))]}
        />
        <Select
          aria-label="Vaga"
          value={jobId}
          onChange={(event) => setJobId(event.target.value)}
          options={[{ label: 'Todas as vagas', value: 'all' }, ...filteredJobs.map((job) => ({ label: job.title, value: job.id }))]}
        />
        <Select
          aria-label="Status"
          value={status}
          onChange={(event) => setStatus(event.target.value as ApplicationStatus | 'all')}
          options={[{ label: 'Todos os status', value: 'all' }, ...Object.entries(applicationStatusLabels).map(([value, label]) => ({ value, label }))]}
        />
      </Card>

      {loading ? (
        <LoadingState label="Carregando candidaturas..." />
      ) : filteredApplications.length ? (
        <CandidateTable
          applications={filteredApplications}
          showCompany
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
