import { Check, ClipboardCopy, ExternalLink, Save } from 'lucide-react';
import { useMemo, useState } from 'react';
import { getJobDistribution, upsertJobDistribution } from '../../lib/data';
import { contractTypeLabels, formatJobSalary, modalityLabels } from '../../lib/formatters';
import { getJobUrl, withUtm } from '../../lib/jobUrls';
import type { Job, JobDistributionStatus } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';

export function buildInfoJobsText(job: Job) {
  const companySlug = job.company?.slug;
  const applicationUrl = companySlug
    ? withUtm(
        getJobUrl(companySlug, job.slug),
        'infojobs',
        'jobboard',
        'manual_distribution',
      )
    : '';

  return [
    `Título da vaga: ${job.title}`,
    `Empresa: ${job.company?.name ?? 'Empresa parceira Redde People'}`,
    `Cidade/Estado: ${[job.city, job.state].filter(Boolean).join('/') || 'Remoto'}`,
    `Bairro: ${job.neighborhood || 'Não informado'}`,
    `Tipo de contrato: ${contractTypeLabels[job.contract_type]}`,
    `Modalidade: ${modalityLabels[job.modality]}`,
    `Jornada: ${job.work_schedule || 'Não informada'}`,
    `Salário: ${formatJobSalary(job) || 'Não informado'}`,
    '',
    'Benefícios:',
    job.benefits || 'Não informados',
    '',
    'Descrição:',
    job.about_job || job.description || job.short_description || '',
    '',
    'Responsabilidades:',
    job.responsibilities || 'Não informadas',
    '',
    'Requisitos:',
    job.requirements || 'Não informados',
    '',
    `Link de candidatura: ${applicationUrl}`,
  ].join('\n');
}

async function copyToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
}

export function InfoJobsExport({ job }: { job: Job }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<JobDistributionStatus>('manual_required');
  const [externalUrl, setExternalUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const text = useMemo(() => buildInfoJobsText(job), [job]);

  async function openModal() {
    setOpen(true);
    setCopied(false);
    const distribution = await getJobDistribution(job.id, 'infojobs');
    setStatus(distribution?.status ?? 'manual_required');
    setExternalUrl(distribution?.external_url ?? '');
  }

  async function saveDistribution(nextStatus = status) {
    setSaving(true);
    try {
      await upsertJobDistribution({
        job_id: job.id,
        channel: 'infojobs',
        status: nextStatus,
        external_url: externalUrl.trim() || null,
        last_synced_at: nextStatus === 'published' ? new Date().toISOString() : null,
      });
      setStatus(nextStatus);
    } finally {
      setSaving(false);
    }
  }

  async function handleCopy() {
    await copyToClipboard(text);
    setCopied(true);
    if (status === 'pending' || status === 'manual_required') {
      await saveDistribution('ready');
    }
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => void openModal()}>
        <ClipboardCopy size={16} />
        Copiar texto para InfoJobs
      </Button>

      <Modal
        open={open}
        title="Exportar para InfoJobs"
        description="Revise o conteúdo, copie para a Área da Empresa e registre a publicação manual."
        onClose={() => setOpen(false)}
      >
        <div className="grid gap-4">
          <Textarea label="Texto formatado" value={text} readOnly rows={18} />

          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="Status interno"
              value={status}
              onChange={(event) => setStatus(event.target.value as JobDistributionStatus)}
              options={[
                { label: 'Pendente', value: 'pending' },
                { label: 'Pronta para publicação', value: 'ready' },
                { label: 'Publicada manualmente', value: 'published' },
                { label: 'Falhou', value: 'failed' },
                { label: 'Removida', value: 'removed' },
                { label: 'Ação manual necessária', value: 'manual_required' },
              ]}
            />
            <Input
              label="URL da vaga no InfoJobs"
              type="url"
              placeholder="https://..."
              value={externalUrl}
              onChange={(event) => setExternalUrl(event.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void handleCopy()}>
              {copied ? <Check size={18} /> : <ClipboardCopy size={18} />}
              {copied ? 'Texto copiado' : 'Copiar para a área de transferência'}
            </Button>
            <Button variant="secondary" disabled={saving} onClick={() => void saveDistribution()}>
              <Save size={18} />
              Salvar status e URL
            </Button>
            {externalUrl ? (
              <a href={externalUrl} target="_blank" rel="noreferrer">
                <Button variant="ghost">
                  <ExternalLink size={18} />
                  Abrir no InfoJobs
                </Button>
              </a>
            ) : null}
          </div>
        </div>
      </Modal>
    </>
  );
}
