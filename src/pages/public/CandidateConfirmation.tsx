import { CheckCircle2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { EmptyState } from '../../components/public/EmptyState';
import { LoadingState } from '../../components/public/LoadingState';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { confirmCandidatePresence, getCandidateConfirmation } from '../../lib/franchiseOps';

type ConfirmationData = Awaited<ReturnType<typeof getCandidateConfirmation>>;

export function CandidateConfirmation() {
  const { token } = useParams();
  const [data, setData] = useState<ConfirmationData>(null);
  const [loading, setLoading] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const result = await getCandidateConfirmation(token);
    setData(result);
    setConfirmed(Boolean(result?.schedule.candidate_confirmed_at));
    setLoading(false);
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function confirm() {
    if (!token) return;
    setError('');
    try {
      await confirmCandidatePresence(token);
      setConfirmed(true);
      await load();
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : 'Não foi possível confirmar presença.');
    }
  }

  if (loading) return <LoadingState label="Carregando entrevista..." />;
  if (!data) return <EmptyState title="Convite de entrevista não encontrado." />;

  return (
    <main className="bg-surface-50 py-10">
      <div className="container-page max-w-3xl">
        <Card className="p-6">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-redde-700">Recruitfy</p>
          <h1 className="mt-2 text-3xl font-black text-ink-900">Confirmação de entrevista</h1>
          <p className="mt-3 text-ink-500">
            {data.application?.candidate_name}, sua entrevista com {data.company?.name ?? 'a empresa'} está agendada para{' '}
            <strong>{data.schedule.date}</strong> às <strong>{data.schedule.time}</strong>.
          </p>
          <div className="mt-5 rounded-lg border border-surface-200 bg-surface-50 p-4 text-sm text-ink-700">
            <p><strong>Formato:</strong> {data.schedule.format}</p>
            <p className="mt-2"><strong>Local/link:</strong> {data.schedule.location_or_link}</p>
            {data.schedule.notes ? <p className="mt-2"><strong>Observações:</strong> {data.schedule.notes}</p> : null}
          </div>
          {error ? <div className="mt-5 rounded-lg bg-redde-50 px-4 py-3 text-sm font-semibold text-redde-700">{error}</div> : null}
          {confirmed ? (
            <div className="mt-5 rounded-lg bg-redde-50 px-4 py-3 text-sm font-semibold text-redde-700">
              Presença confirmada. As orientações foram registradas para acompanhamento da equipe.
            </div>
          ) : (
            <Button className="mt-6" size="lg" onClick={confirm}>
              <CheckCircle2 size={18} />
              Confirmar presença
            </Button>
          )}
        </Card>
      </div>
    </main>
  );
}
