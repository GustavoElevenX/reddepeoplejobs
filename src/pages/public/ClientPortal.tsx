import { CalendarPlus, CheckCircle2, Send, XCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { EmptyState } from '../../components/public/EmptyState';
import { LoadingState } from '../../components/public/LoadingState';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { Modal } from '../../components/ui/Modal';
import { formatOperationalValue } from '../../lib/formatters';
import {
  finalizeHiringDecisions,
  getClientPortal,
  saveHiringDecision,
  saveNps,
  scheduleInterview,
  type FinalistRecord,
} from '../../lib/franchiseOps';

type PortalData = Awaited<ReturnType<typeof getClientPortal>>;

export function ClientPortal() {
  const { token } = useParams();
  const [data, setData] = useState<PortalData>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFinalist, setSelectedFinalist] = useState<string | null>(null);
  const [decisionFinalist, setDecisionFinalist] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmFinalize, setConfirmFinalize] = useState(false);

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setData(await getClientPortal(token));
    setLoading(false);
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

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
  if (!data) return <EmptyState title="Portal não encontrado ou endereço inválido." />;

  const selected = data.finalists.find((item) => item.id === selectedFinalist) ?? null;
  const decisionSelected = data.finalists.find((item) => item.id === decisionFinalist) ?? null;
  const decisionsByFinalist = new Map(data.decisions.map((item) => [item.finalist_id, item]));
  const canFinalize = data.finalists.length > 0 && data.finalists.every((item) => {
    const decision = decisionsByFinalist.get(item.id);
    return decision && ['approved', 'rejected'].includes(decision.decision)
      && (decision.decision !== 'approved' || (decision.start_date && decision.internal_responsible_name));
  });
  const finalized = data.client_decision_status === 'finalized';

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
              const schedule = data.schedules.find((item) => item.finalist_id === finalist.id);
              const decision = data.decisions.find((item) => item.finalist_id === finalist.id);
              return (
                <Card key={finalist.id} className="p-5">
                  <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-black text-ink-900">{application?.candidate_name ?? 'Candidato'}</h2>
                        <Badge>{formatOperationalValue(finalist.status)}</Badge>
                      </div>
                      <p className="mt-4 whitespace-pre-line text-sm leading-6 text-ink-700">{finalist.ai_report}</p>
                      {schedule ? (
                        <p className="mt-3 text-sm font-semibold text-redde-700">
                          Entrevista: {schedule.date} às {schedule.time} · {schedule.candidate_confirmed_at ? 'presença confirmada' : 'aguardando confirmação'}
                        </p>
                      ) : null}
                      {decision ? <p className="mt-2 text-sm font-semibold text-ink-700">Decisão: {formatOperationalValue(decision.decision)}</p> : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" disabled={finalized} onClick={() => setSelectedFinalist(finalist.id)}>
                        <CalendarPlus size={17} />
                        Marcar entrevista
                      </Button>
                      <Button disabled={finalized} onClick={() => setDecisionFinalist(finalist.id)}>
                        <CheckCircle2 size={17} />
                        {decision ? 'Editar decisão salva' : 'Salvar decisão'}
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
          <h2 className="text-xl font-black text-ink-900">Resumo das decisões</h2>
          <div className="mt-4 grid gap-2">{data.finalists.map((finalist) => {
            const application = data.applications.find((item) => item.id === finalist.application_id);
            const decision = decisionsByFinalist.get(finalist.id);
            return <div key={finalist.id} className="flex justify-between rounded-lg bg-surface-50 p-3 text-sm"><span>{application?.candidate_name ?? 'Candidato'}</span><strong>{formatOperationalValue(decision?.decision, 'Pendente')}</strong></div>;
          })}</div>
          <Button className="mt-4 w-full" disabled={!canFinalize || finalized} onClick={() => setConfirmFinalize(true)}>
            <CheckCircle2 size={18}/>{finalized ? 'Decisão conjunta finalizada' : 'Finalizar decisão dos candidatos'}
          </Button>
          {!canFinalize && !finalized ? <p className="mt-2 text-sm text-ink-500">Decida todos os finalistas e preencha os dados obrigatórios dos aprovados.</p> : null}
        </Card>

        <Card className="p-5">
          <h2 className="text-xl font-black text-ink-900">Pesquisa de satisfação do processo</h2>
          {data.nps ? <div className="mt-4 rounded-lg bg-surface-50 p-4"><p className="font-black">Nota registrada: {data.nps.score}/10</p><p className="mt-1 text-sm text-ink-500">{data.nps.comment || 'Sem comentário'}</p></div> : data.can_submit_nps ? <form
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
                'Pesquisa de satisfação registrada. Obrigado pelo retorno.',
              );
            }}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Input name="score" label="De 0 a 10, quanto você recomendaria?" type="number" min="0" max="10" defaultValue={10} required />
              <Input name="referral_contacts" label="Indicações, se houver" />
            </div>
            <Textarea name="comment" label="Comentário" rows={3} />
            <Textarea name="positives" label="Pontos positivos" rows={3} />
            <Textarea name="improvements" label="Pontos a melhorar" rows={3} />
            <label className="flex items-center gap-3 rounded-lg bg-surface-50 p-3 text-sm font-semibold text-ink-700">
              <input name="referral_possible" type="checkbox" className="h-4 w-4 accent-redde-500" />
              Posso indicar outra empresa
            </label>
            <Button type="submit">
              <Send size={18} />
              Enviar avaliação
            </Button>
          </form> : <p className="mt-3 text-sm text-ink-500">A pesquisa de satisfação será liberada somente depois que todas as decisões forem finalizadas em conjunto e houver ao menos um candidato aprovado.</p>}
        </Card>

        {selected ? (
          <ScheduleForm
            portalToken={token!}
            finalist={selected}
            onSubmit={(fn) => action(fn, 'Entrevista agendada. O candidato já pode confirmar presença pelo endereço gerado.')}
          />
        ) : null}
        {decisionSelected ? (
          <DecisionForm
            portalToken={token!}
            finalist={decisionSelected}
            onSubmit={(fn) => action(fn, 'Decisão salva. O processo só será encerrado após a finalização conjunta.')}
          />
        ) : null}
        <Modal open={confirmFinalize} onClose={() => setConfirmFinalize(false)} title="Finalizar decisão dos candidatos" description="Esta ação encerra a etapa de decisão do cliente.">
          <div className="grid gap-3">{data.decisions.map((decision) => {
            const application = data.applications.find((item) => item.id === decision.application_id);
            return <div key={decision.id} className="rounded-lg border p-3"><p className="font-bold">{application?.candidate_name} · {formatOperationalValue(decision.decision)}</p>{decision.decision === 'approved' ? <p className="text-sm text-ink-500">Início: {decision.start_date} · Responsável: {decision.internal_responsible_name}</p> : null}</div>;
          })}<Button onClick={() => { setConfirmFinalize(false); void action(() => finalizeHiringDecisions(token!), 'Decisões finalizadas em conjunto.'); }}>Confirmar finalização</Button></div>
        </Modal>
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
              { label: 'Virtual', value: 'online' },
              { label: 'Presencial', value: 'presencial' },
              { label: 'Telefone', value: 'telefone' },
            ]}
          />
        </div>
        <Input name="location" label="Local ou endereço da reunião" required />
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
      <h2 className="text-xl font-black text-ink-900">Salvar decisão deste candidato</h2>
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
          Salvar decisão
        </Button>
      </form>
    </Card>
  );
}
