import { CalendarPlus, CheckCircle2, Send, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { EmptyState } from '../../components/public/EmptyState';
import { LoadingState } from '../../components/public/LoadingState';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import {
  getClientPortal,
  saveHiringDecision,
  saveNps,
  scheduleInterview,
  type FinalistRecord,
} from '../../lib/franchiseOps';
import { createApplicationRanking } from '../../lib/ranking';

type PortalData = Awaited<ReturnType<typeof getClientPortal>>;

export function ClientPortal() {
  const { token } = useParams();
  const [data, setData] = useState<PortalData>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFinalist, setSelectedFinalist] = useState<string | null>(null);
  const [decisionFinalist, setDecisionFinalist] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function load() {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setData(await getClientPortal(token));
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [token]);

  async function action(fn: () => Promise<unknown> | unknown, message: string) {
    setError('');
    setSuccess('');
    try {
      await fn();
      setSuccess(message);
      setSelectedFinalist(null);
      setDecisionFinalist(null);
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Não foi possível concluir.');
    }
  }

  if (loading) return <LoadingState label="Carregando portal do cliente..." />;
  if (!data) return <EmptyState title="Portal não encontrado ou link inválido." />;

  const selected = data.finalists.find((item) => item.id === selectedFinalist) ?? null;
  const decisionSelected = data.finalists.find((item) => item.id === decisionFinalist) ?? null;

  return (
    <main className="bg-surface-50 py-10">
      <div className="container-page grid gap-6">
        <Card className="p-6">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-redde-700">{data.company?.name ?? 'Cliente'}</p>
          <h1 className="mt-2 text-3xl font-black text-ink-900">{data.project.title}</h1>
          <p className="mt-2 text-ink-500">Analise finalistas, marque entrevistas e registre a decisão final dentro da plataforma.</p>
          {success ? <div className="mt-5 rounded-lg bg-redde-50 px-4 py-3 text-sm font-semibold text-redde-700">{success}</div> : null}
          {error ? <div className="mt-5 rounded-lg bg-redde-50 px-4 py-3 text-sm font-semibold text-redde-700">{error}</div> : null}
        </Card>

        <div className="grid gap-4">
          {data.finalists.length ? (
            data.finalists.map((finalist) => {
              const application = data.applications.find((item) => item.id === finalist.application_id);
              const ranking = application
                ? createApplicationRanking(application, data.job)
                : { score: 0, summary: 'Candidatura não localizada.', strengths: [], concerns: [] };
              const schedule = data.schedules.find((item) => item.finalist_id === finalist.id);
              const decision = data.decisions.find((item) => item.finalist_id === finalist.id);
              return (
                <Card key={finalist.id} className="p-5">
                  <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-black text-ink-900">{application?.candidate_name ?? 'Candidato'}</h2>
                        <Badge>{ranking.score}% aderência</Badge>
                        <Badge>{finalist.status}</Badge>
                      </div>
                      <p className="mt-2 text-sm text-ink-500">{application?.candidate_email} · {application?.candidate_phone}</p>
                      <p className="mt-4 whitespace-pre-line text-sm leading-6 text-ink-700">{finalist.ai_report}</p>
                      {finalist.franchise_opinion ? (
                        <p className="mt-3 text-sm text-ink-500"><strong>Parecer do franqueado:</strong> {finalist.franchise_opinion}</p>
                      ) : null}
                      {schedule ? (
                        <p className="mt-3 text-sm font-semibold text-redde-700">
                          Entrevista: {schedule.date} às {schedule.time} · {schedule.candidate_confirmed_at ? 'presença confirmada' : 'aguardando confirmação'}
                        </p>
                      ) : null}
                      {decision ? <p className="mt-2 text-sm font-semibold text-ink-700">Decisão: {decision.decision}</p> : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" onClick={() => setSelectedFinalist(finalist.id)}>
                        <CalendarPlus size={17} />
                        Marcar entrevista
                      </Button>
                      <Button onClick={() => setDecisionFinalist(finalist.id)}>
                        <CheckCircle2 size={17} />
                        Decisão final
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })
          ) : (
            <EmptyState title="Os finalistas ainda não foram liberados pelo franqueado." />
          )}
        </div>

        <Card className="p-5">
          <h2 className="text-xl font-black text-ink-900">NPS do processo</h2>
          <form
            className="mt-4 grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              void action(
                () =>
                  saveNps(token!, {
                    score: Number(form.get('score') || 10),
                    comment: String(form.get('comment') || ''),
                    positives: String(form.get('positives') || ''),
                    improvements: String(form.get('improvements') || ''),
                    referral_possible: form.get('referral_possible') === 'on',
                    referral_contacts: String(form.get('referral_contacts') || ''),
                  }),
                'NPS registrado. Obrigado pelo retorno.',
              );
            }}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Input name="score" label="De 0 a 10, quanto você recomendaria?" type="number" min="0" max="10" defaultValue={data.nps?.score ?? 10} required />
              <Input name="referral_contacts" label="Indicações, se houver" defaultValue={data.nps?.referral_contacts ?? ''} />
            </div>
            <Textarea name="comment" label="Comentário" rows={3} defaultValue={data.nps?.comment ?? ''} />
            <Textarea name="positives" label="Pontos positivos" rows={3} defaultValue={data.nps?.positives ?? ''} />
            <Textarea name="improvements" label="Pontos a melhorar" rows={3} defaultValue={data.nps?.improvements ?? ''} />
            <label className="flex items-center gap-3 rounded-lg bg-surface-50 p-3 text-sm font-semibold text-ink-700">
              <input name="referral_possible" type="checkbox" className="h-4 w-4 accent-redde-500" defaultChecked={data.nps?.referral_possible ?? false} />
              Posso indicar outra empresa
            </label>
            <Button type="submit">
              <Send size={18} />
              Enviar NPS
            </Button>
          </form>
        </Card>

        {selected ? (
          <ScheduleForm
            portalToken={token!}
            finalist={selected}
            onSubmit={(fn) => action(fn, 'Entrevista agendada. O candidato já pode confirmar presença pelo link gerado.')}
          />
        ) : null}
        {decisionSelected ? (
          <DecisionForm
            portalToken={token!}
            finalist={decisionSelected}
            onSubmit={(fn) => action(fn, 'Decisão registrada com sucesso.')}
          />
        ) : null}
      </div>
    </main>
  );
}

function ScheduleForm({
  finalist,
  portalToken,
  onSubmit,
}: {
  finalist: FinalistRecord;
  portalToken: string;
  onSubmit: (fn: () => unknown) => void;
}) {
  return (
    <Card className="p-5">
      <h2 className="text-xl font-black text-ink-900">Agendar entrevista</h2>
      <form
        className="mt-4 grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          onSubmit(() =>
            scheduleInterview(
              finalist.id,
              {
                date: String(form.get('date') || ''),
                time: String(form.get('time') || ''),
                duration_minutes: Number(form.get('duration') || 45),
                format: String(form.get('format') || 'online') as 'presencial' | 'online' | 'telefone',
                location_or_link: String(form.get('location') || ''),
                notes: String(form.get('notes') || ''),
              },
              portalToken,
            ),
          );
        }}
      >
        <div className="grid gap-4 md:grid-cols-4">
          <Input name="date" label="Data" type="date" required />
          <Input name="time" label="Horário" type="time" required />
          <Input name="duration" label="Duração" type="number" defaultValue={45} required />
          <Select
            name="format"
            label="Formato"
            options={[
              { label: 'Online', value: 'online' },
              { label: 'Presencial', value: 'presencial' },
              { label: 'Telefone', value: 'telefone' },
            ]}
          />
        </div>
        <Input name="location" label="Local ou link da reunião" required />
        <Textarea name="notes" label="Observações" rows={3} />
        <Button type="submit">
          <CalendarPlus size={18} />
          Confirmar entrevista
        </Button>
      </form>
    </Card>
  );
}

function DecisionForm({
  finalist,
  portalToken,
  onSubmit,
}: {
  finalist: FinalistRecord;
  portalToken: string;
  onSubmit: (fn: () => Promise<unknown>) => void;
}) {
  const [decision, setDecision] = useState<'approved' | 'rejected' | 'undecided'>('approved');
  return (
    <Card className="p-5">
      <h2 className="text-xl font-black text-ink-900">Decisão final</h2>
      <form
        className="mt-4 grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          onSubmit(() =>
            saveHiringDecision(
              finalist.id,
              {
                decision,
                start_date: String(form.get('start_date') || '') || null,
                internal_responsible_name: String(form.get('responsible_name') || ''),
                internal_responsible_email: String(form.get('responsible_email') || ''),
                internal_responsible_phone: String(form.get('responsible_phone') || ''),
                admission_notes: String(form.get('admission_notes') || ''),
                required_documents: String(form.get('required_documents') || ''),
                rejection_reason: String(form.get('rejection_reason') || ''),
              },
              portalToken,
            ),
          );
        }}
      >
        <Select
          label="Resultado"
          value={decision}
          onChange={(event) => setDecision(event.target.value as 'approved' | 'rejected' | 'undecided')}
          options={[
            { label: 'Aprovado', value: 'approved' },
            { label: 'Reprovado', value: 'rejected' },
            { label: 'Em dúvida', value: 'undecided' },
          ]}
        />
        {decision === 'approved' ? (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <Input name="start_date" label="Data prevista de início" type="date" required />
              <Input name="responsible_name" label="Responsável interno" required />
              <Input name="responsible_email" label="E-mail do responsável" type="email" required />
              <Input name="responsible_phone" label="WhatsApp do responsável" required />
            </div>
            <Textarea name="admission_notes" label="Observações para admissão" rows={3} />
            <Textarea name="required_documents" label="Documentos exigidos" rows={3} />
          </>
        ) : (
          <Select
            name="rejection_reason"
            label="Motivo"
            options={[
              { label: 'Perfil técnico insuficiente', value: 'perfil_tecnico' },
              { label: 'Perfil comportamental inadequado', value: 'perfil_comportamental' },
              { label: 'Pretensão salarial', value: 'pretensao_salarial' },
              { label: 'Disponibilidade', value: 'disponibilidade' },
              { label: 'Localização', value: 'localizacao' },
              { label: 'Outro', value: 'outro' },
            ]}
          />
        )}
        <Button type="submit">
          {decision === 'rejected' ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
          Registrar decisão
        </Button>
      </form>
    </Card>
  );
}
