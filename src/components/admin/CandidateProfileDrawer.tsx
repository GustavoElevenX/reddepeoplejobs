import { Download, ExternalLink, Mail, MapPin, Phone, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  addApplicationNote,
  listApplicationNotes,
  listApplicationStageHistory,
} from '../../lib/data';
import { applicationStageLabels, formatDate } from '../../lib/formatters';
import { createResumeSignedUrl } from '../../lib/storage';
import type { Application, ApplicationNote, ApplicationStage, ApplicationStageHistory } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { CommentComposer } from './CommentComposer';
import { HistoryTimeline } from './HistoryTimeline';

type CandidateDrawerTab = 'curriculo' | 'perguntas' | 'comentarios' | 'email' | 'arquivos' | 'historico';

const tabs: { id: CandidateDrawerTab; label: string }[] = [
  { id: 'curriculo', label: 'Currículo' },
  { id: 'perguntas', label: 'Perguntas' },
  { id: 'comentarios', label: 'Comentários' },
  { id: 'email', label: 'E-mail' },
  { id: 'arquivos', label: 'Arquivos' },
  { id: 'historico', label: 'Histórico' },
];

type CandidateProfileDrawerProps = {
  application: Application | null;
  canDownload?: boolean;
  onStageChange?: (application: Application, stage: ApplicationStage) => Promise<void> | void;
  onClose: () => void;
};

export function CandidateProfileDrawer({
  application,
  canDownload = true,
  onStageChange,
  onClose,
}: CandidateProfileDrawerProps) {
  const [activeTab, setActiveTab] = useState<CandidateDrawerTab>('curriculo');
  const [notes, setNotes] = useState<ApplicationNote[]>([]);
  const [history, setHistory] = useState<ApplicationStageHistory[]>([]);

  useEffect(() => {
    if (!application) return;
    setActiveTab('curriculo');
    void Promise.all([
      listApplicationNotes(application.id).then(setNotes),
      listApplicationStageHistory(application.id).then(setHistory),
    ]);
  }, [application]);

  if (!application) return null;
  const currentApplication = application;

  async function downloadResume() {
    const url = await createResumeSignedUrl(currentApplication.resume_file_path);
    if (url === '#') {
      window.alert('O download real de currículos fica disponível no ambiente publicado.');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink-900/45" onMouseDown={onClose}>
      <aside
        className="h-full w-full max-w-2xl overflow-y-auto bg-white shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="sticky top-0 z-10 border-b border-surface-200 bg-white px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-black text-ink-900">{application.candidate_name}</h2>
                {application.is_new ? <Badge variant="info">Novo</Badge> : null}
              </div>
              <p className="mt-1 text-sm font-semibold text-redde-700">{applicationStageLabels[application.stage]}</p>
            </div>
            <Button variant="ghost" size="sm" aria-label="Fechar candidato" onClick={onClose}>
              <X size={20} />
            </Button>
          </div>

          <div className="mt-4 grid gap-2 text-sm text-ink-500 sm:grid-cols-2">
            <a href={`tel:${application.candidate_phone}`} className="flex items-center gap-2 hover:text-redde-700">
              <Phone size={15} />
              {application.candidate_phone}
            </a>
            <a href={`mailto:${application.candidate_email}`} className="flex items-center gap-2 hover:text-redde-700">
              <Mail size={15} />
              {application.candidate_email}
            </a>
            <span className="flex items-center gap-2">
              <MapPin size={15} />
              {application.candidate_city ?? 'Localização não informada'}
            </span>
            <span>Pretensão: {application.salary_expectation ?? 'Não informada'}</span>
          </div>
          {onStageChange ? (
            <Select
              className="mt-4"
              aria-label="Etapa do candidato"
              value={application.stage}
              onChange={(event) => void onStageChange(application, event.target.value as ApplicationStage)}
              options={Object.entries(applicationStageLabels).map(([value, label]) => ({ value, label }))}
            />
          ) : null}
        </header>

        <div className="overflow-x-auto border-b border-surface-200 px-4">
          <div className="flex min-w-max">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`border-b-2 px-3 py-3 text-sm font-bold ${
                  activeTab === tab.id
                    ? 'border-redde-500 text-redde-700'
                    : 'border-transparent text-ink-500 hover:text-ink-900'
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-5">
          {activeTab === 'curriculo' ? (
            <div className="grid gap-4">
              <div className="rounded-xl border border-surface-200 bg-surface-50 p-4">
                <h3 className="font-black text-ink-900">Resumo da candidatura</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-700">
                  {application.message ?? 'O candidato não adicionou uma apresentação.'}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-surface-200 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-ink-500">Aderência</p>
                  <p className="mt-2 text-3xl font-black text-redde-700">
                    {application.adhesion_score ?? application.match_score ?? 0}%
                  </p>
                </div>
                <div className="rounded-xl border border-surface-200 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-ink-500">Disponibilidade</p>
                  <p className="mt-2 text-lg font-black text-ink-900">{application.availability ?? 'Não informada'}</p>
                </div>
              </div>
              <Button onClick={downloadResume} disabled={!canDownload}>
                <Download size={17} />
                Baixar currículo
              </Button>
            </div>
          ) : null}

          {activeTab === 'perguntas' ? (
            <div className="grid gap-3">
              {[
                ['Mensagem de apresentação', application.message],
                ['Disponibilidade', application.availability],
                ['Pretensão salarial', application.salary_expectation],
                ['Origem da candidatura', application.source],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-surface-200 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-ink-500">{label}</p>
                  <p className="mt-2 text-sm text-ink-700">{value || 'Não informado'}</p>
                </div>
              ))}
            </div>
          ) : null}

          {activeTab === 'comentarios' ? (
            <div className="grid gap-5">
              <CommentComposer
                onSubmit={async (comment) => {
                  await addApplicationNote(application.id, comment);
                  setNotes(await listApplicationNotes(application.id));
                }}
              />
              <div className="grid gap-3">
                {notes.map((note) => (
                  <div key={note.id} className="rounded-xl border border-surface-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-black text-ink-900">{note.author?.full_name ?? 'Equipe People Jobs'}</p>
                      <span className="text-xs text-ink-500">{formatDate(note.created_at)}</span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-ink-700">{note.note}</p>
                  </div>
                ))}
                {!notes.length ? <p className="text-sm text-ink-500">Nenhum comentário sobre este candidato.</p> : null}
              </div>
            </div>
          ) : null}

          {activeTab === 'email' ? (
            <div className="rounded-xl border border-surface-200 bg-surface-50 p-5">
              <Mail className="text-redde-700" size={24} />
              <h3 className="mt-3 text-lg font-black text-ink-900">Entrar em contato</h3>
              <p className="mt-1 text-sm text-ink-500">
                Abra seu cliente de e-mail com o endereço do candidato preenchido.
              </p>
              <a href={`mailto:${application.candidate_email}?subject=Processo seletivo - ${application.job?.title ?? ''}`}>
                <Button className="mt-4">Escrever e-mail</Button>
              </a>
            </div>
          ) : null}

          {activeTab === 'arquivos' ? (
            <div className="grid gap-3">
              <button
                type="button"
                onClick={downloadResume}
                disabled={!canDownload}
                className="flex items-center justify-between rounded-xl border border-surface-200 p-4 text-left hover:bg-surface-50 disabled:opacity-60"
              >
                <span>
                  <span className="block font-black text-ink-900">Currículo</span>
                  <span className="text-sm text-ink-500">Arquivo enviado na candidatura</span>
                </span>
                <Download size={18} />
              </button>
              {application.portfolio_url ? (
                <a
                  href={application.portfolio_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-xl border border-surface-200 p-4 hover:bg-surface-50"
                >
                  <span>
                    <span className="block font-black text-ink-900">Portfólio</span>
                    <span className="text-sm text-ink-500">{application.portfolio_url}</span>
                  </span>
                  <ExternalLink size={18} />
                </a>
              ) : null}
              {application.linkedin_url ? (
                <a
                  href={application.linkedin_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-xl border border-surface-200 p-4 hover:bg-surface-50"
                >
                  <span>
                    <span className="block font-black text-ink-900">LinkedIn</span>
                    <span className="text-sm text-ink-500">{application.linkedin_url}</span>
                  </span>
                  <ExternalLink size={18} />
                </a>
              ) : null}
            </div>
          ) : null}

          {activeTab === 'historico' ? (
            <HistoryTimeline
              items={[
                ...history.map((item) => ({
                  id: item.id,
                  title: `Movido para ${applicationStageLabels[item.to_stage]}`,
                  description: item.from_stage
                    ? `Etapa anterior: ${applicationStageLabels[item.from_stage]} · ${item.actor?.full_name ?? 'Equipe'}`
                    : item.actor?.full_name,
                  createdAt: item.created_at,
                })),
                {
                  id: `created-${application.id}`,
                  title: 'Candidatura recebida',
                  description: application.source ? `Origem: ${application.source}` : null,
                  createdAt: application.created_at,
                },
              ]}
            />
          ) : null}
        </div>
      </aside>
    </div>
  );
}
