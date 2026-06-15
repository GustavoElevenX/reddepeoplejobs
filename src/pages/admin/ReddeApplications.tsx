import { useEffect, useMemo, useState } from 'react';
import { CandidateTable } from '../../components/admin/CandidateTable';
import { EmptyState } from '../../components/public/EmptyState';
import { LoadingState } from '../../components/public/LoadingState';
import { Card } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import { listApplications, listCompanies, listFranchises, listJobs, updateApplicationStatus } from '../../lib/data';
import { applicationStatusLabels } from '../../lib/formatters';
import type { Application, ApplicationStatus, Company, Franchise, Job } from '../../types';

export function ReddeApplications() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [franchiseId, setFranchiseId] = useState('all');
  const [companyId, setCompanyId] = useState('all');
  const [jobId, setJobId] = useState('all');
  const [status, setStatus] = useState<ApplicationStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [applicationData, companyData, franchiseData, jobData] = await Promise.all([
      listApplications(),
      listCompanies(),
      listFranchises(),
      listJobs(),
    ]);
    setApplications(applicationData);
    setCompanies(companyData);
    setFranchises(franchiseData);
    setJobs(jobData);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const filteredCompanies = useMemo(() => {
    return companies.filter((company) => franchiseId === 'all' || company.franchise_id === franchiseId);
  }, [companies, franchiseId]);

  const filteredJobs = useMemo(() => {
    return jobs
      .filter((job) => franchiseId === 'all' || job.franchise_id === franchiseId)
      .filter((job) => companyId === 'all' || job.company_id === companyId);
  }, [companyId, franchiseId, jobs]);

  const filteredApplications = useMemo(() => {
    return applications
      .filter((application) => franchiseId === 'all' || application.franchise_id === franchiseId)
      .filter((application) => companyId === 'all' || application.company_id === companyId)
      .filter((application) => jobId === 'all' || application.job_id === jobId)
      .filter((application) => status === 'all' || application.status === status);
  }, [applications, companyId, franchiseId, jobId, status]);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-black text-ink-900">Candidatos da rede</h1>
        <p className="mt-2 text-ink-500">Acompanhe candidatos de todos os franqueados, empresas e vagas.</p>
      </div>

      <Card className="grid gap-3 p-3 md:grid-cols-2 xl:grid-cols-4">
        <Select
          aria-label="Franqueado"
          value={franchiseId}
          onChange={(event) => {
            setFranchiseId(event.target.value);
            setCompanyId('all');
            setJobId('all');
          }}
          options={[
            { label: 'Todos os franqueados', value: 'all' },
            ...franchises.map((franchise) => ({ label: franchise.name, value: franchise.id })),
          ]}
        />
        <Select
          aria-label="Empresa"
          value={companyId}
          onChange={(event) => {
            setCompanyId(event.target.value);
            setJobId('all');
          }}
          options={[
            { label: 'Todas as empresas', value: 'all' },
            ...filteredCompanies.map((company) => ({ label: company.name, value: company.id })),
          ]}
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
