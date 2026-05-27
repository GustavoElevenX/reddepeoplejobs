import { Download, ExternalLink } from 'lucide-react';
import { applicationStatusLabels, formatDate } from '../../lib/formatters';
import { createResumeSignedUrl } from '../../lib/storage';
import type { Application, ApplicationStatus } from '../../types';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { ApplicationStatusBadge } from './ApplicationStatusBadge';

type CandidateTableProps = {
  applications: Application[];
  showCompany?: boolean;
  onStatusChange: (id: string, status: ApplicationStatus) => Promise<void> | void;
  canDownload?: boolean;
};

const statusOptions = Object.entries(applicationStatusLabels).map(([value, label]) => ({ value, label }));

export function CandidateTable({ applications, showCompany = false, onStatusChange, canDownload = true }: CandidateTableProps) {
  async function handleDownload(application: Application) {
    const url = await createResumeSignedUrl(application.resume_file_path);
    if (url === '#') {
      window.alert('Em modo local, o download real depende do bucket privado resumes no Supabase.');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="overflow-hidden rounded-lg border border-surface-200 bg-white shadow-card">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-surface-200 text-sm">
          <thead className="bg-surface-50">
            <tr className="text-left text-xs font-black uppercase tracking-[0.08em] text-ink-500">
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Vaga</th>
              {showCompany ? <th className="px-4 py-3">Empresa</th> : null}
              <th className="px-4 py-3">Contato</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-200">
            {applications.map((application) => (
              <tr key={application.id} className="align-top">
                <td className="px-4 py-3">
                  <p className="font-bold text-ink-900">{application.candidate_name}</p>
                  {application.candidate_city ? <p className="text-xs text-ink-500">{application.candidate_city}</p> : null}
                </td>
                <td className="px-4 py-3 text-ink-700">{application.job?.title ?? '-'}</td>
                {showCompany ? <td className="px-4 py-3 text-ink-700">{application.company?.name ?? '-'}</td> : null}
                <td className="px-4 py-3">
                  <p className="text-ink-700">{application.candidate_phone}</p>
                  <a className="text-xs font-semibold text-redde-600" href={`mailto:${application.candidate_email}`}>
                    {application.candidate_email}
                  </a>
                </td>
                <td className="px-4 py-3">
                  <div className="grid gap-2">
                    <ApplicationStatusBadge status={application.status} />
                    <Select
                      aria-label="Alterar status"
                      value={application.status}
                      onChange={(event) => onStatusChange(application.id, event.target.value as ApplicationStatus)}
                      options={statusOptions}
                      className="h-9 min-w-36"
                    />
                  </div>
                </td>
                <td className="px-4 py-3 text-ink-500">{formatDate(application.created_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" size="sm" onClick={() => handleDownload(application)} disabled={!canDownload}>
                      <Download size={15} />
                      Currículo
                    </Button>
                    {application.linkedin_url ? (
                      <a href={application.linkedin_url} target="_blank" rel="noreferrer">
                        <Button variant="ghost" size="sm">
                          <ExternalLink size={15} />
                        </Button>
                      </a>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
