import { CheckCircle2, Circle, Clock3, Route } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { getPublicApplicationTracking } from '../../lib/data';
import { applicationStageLabels, applicationStatusLabels, formatDate } from '../../lib/formatters';
import type { ApplicationStage, PublicApplicationTracking } from '../../types';

const orderedStages: ApplicationStage[] = ['qualificacao', 'testes', 'entrevista', 'finalistas', 'contratacao'];

export function ApplicationTracking() {
  const { token = '' } = useParams();
  const [tracking, setTracking] = useState<PublicApplicationTracking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getPublicApplicationTracking(token)
      .then((data) => {
        if (!active) return;
        if (!data) setError('Endereço de acompanhamento inválido ou não encontrado.');
        else setTracking(data);
      })
      .catch(() => active && setError('Não foi possível consultar a candidatura agora.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [token]);

  if (loading) return <main className="min-h-[60vh] bg-surface-50 py-16"><p className="container-page text-center font-semibold text-ink-500">Consultando candidatura...</p></main>;

  if (!tracking || error) {
    return <main className="min-h-[60vh] bg-surface-50 py-16"><div className="container-page max-w-xl rounded-2xl border bg-white p-8 text-center shadow-card"><Route className="mx-auto text-redde-600" size={34}/><h1 className="mt-5 text-2xl font-black">Acompanhamento indisponível</h1><p className="mt-3 text-ink-500">{error}</p><Link to="/vagas" className="mt-6 inline-flex"><Button variant="secondary">Ver vagas abertas</Button></Link></div></main>;
  }

  const currentIndex = orderedStages.indexOf(tracking.stage);
  const disqualified = tracking.stage === 'desclassificados';

  return (
    <main className="bg-surface-50 py-12 sm:py-16">
      <div className="container-page max-w-3xl">
        <div className="rounded-2xl border border-surface-200 bg-white p-6 shadow-card sm:p-8">
          <span className="text-xs font-black uppercase tracking-[0.14em] text-redde-700">Acompanhamento seguro</span>
          <h1 className="mt-3 text-3xl font-black text-ink-900">Olá, {tracking.candidate_first_name}.</h1>
          <p className="mt-2 text-ink-500">{tracking.job_title} · {tracking.company_name}</p>
          <div className="mt-6 rounded-xl bg-redde-50 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-redde-700">Situação atual</p>
            <p className="mt-1 text-lg font-black text-ink-900">{applicationStatusLabels[tracking.status]}</p>
            <p className="mt-1 text-sm text-ink-600">Atualizada em {formatDate(tracking.updated_at)}</p>
          </div>

          <div className="mt-8 grid gap-3">
            <div className="flex items-center gap-3 rounded-xl border border-surface-200 p-4">
              <CheckCircle2 className="text-emerald-600" size={22}/><div><p className="font-black">Candidatura enviada</p><p className="text-sm text-ink-500">{formatDate(tracking.submitted_at)}</p></div>
            </div>
            {orderedStages.map((stage, index) => {
              const reached = !disqualified && index <= currentIndex;
              const event = tracking.timeline.find((item) => item.stage === stage);
              return <div key={stage} className={`flex items-center gap-3 rounded-xl border p-4 ${reached ? 'border-redde-100 bg-redde-50/40' : 'border-surface-200'}`}>
                {reached ? <CheckCircle2 className="text-redde-600" size={22}/> : <Circle className="text-surface-300" size={22}/>}<div><p className="font-black text-ink-900">{applicationStageLabels[stage]}</p><p className="text-sm text-ink-500">{event ? formatDate(event.created_at) : reached ? 'Etapa atual' : 'Aguardando avanço'}</p></div>
              </div>;
            })}
            {disqualified ? <div className="flex items-center gap-3 rounded-xl border border-surface-200 bg-surface-50 p-4"><Clock3 className="text-ink-500" size={22}/><div><p className="font-black">Processo encerrado</p><p className="text-sm text-ink-500">A empresa concluiu a análise desta candidatura.</p></div></div> : null}
          </div>
        </div>
      </div>
    </main>
  );
}
