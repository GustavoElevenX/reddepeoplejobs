import { useCallback, useEffect, useState } from 'react';
import { listHiredApplications, registerApplicationHire } from '../../../lib/recruitmentPipeline';
import type { Application, ApplicationHire } from '../../../types';
import { formatDate } from '../../../lib/formatters';
import { EmptyState } from '../../public/EmptyState';
import { Button } from '../../ui/Button';

type Props = { jobId: string; fallbackApplications: Application[]; canManage: boolean; onOpen: (application: Application) => void };
const admissionLabels: Record<ApplicationHire['admission_status'], string> = { approved: 'Aprovado', awaiting_documents: 'Aguardando documentos', scheduled_to_start: 'Início agendado', started: 'Iniciado', withdrawn: 'Desistiu', no_show: 'Não compareceu', cancelled: 'Cancelado' };

export function ProcessHiredTab({ jobId, fallbackApplications, canManage, onOpen }: Props) {
  const [hires, setHires] = useState<ApplicationHire[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setHires(await listHiredApplications(jobId)); }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar as contratações.'); }
    finally { setLoading(false); }
  }, [jobId]);
  useEffect(() => { void load(); }, [load]);
  async function updateHire(hire: ApplicationHire) {
    const nextStatus = window.prompt(`Status da admissão (${Object.keys(admissionLabels).join(', ')}):`, hire.admission_status) as ApplicationHire['admission_status'] | null;
    if (!nextStatus) return;
    if (!admissionLabels[nextStatus]) { window.alert('Status de admissão inválido.'); return; }
    const expected = window.prompt('Início previsto (AAAA-MM-DD):', hire.expected_start_date ?? '') || null;
    const actual = nextStatus === 'started' ? window.prompt('Início efetivo (AAAA-MM-DD):', hire.actual_start_date ?? '') || null : hire.actual_start_date;
    setSavingId(hire.id); setError('');
    try { await registerApplicationHire({ ...hire, admission_status: nextStatus, expected_start_date: expected, actual_start_date: actual }); await load(); }
    catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'Não foi possível atualizar a admissão.'); }
    finally { setSavingId(''); }
  }
  if (loading) return <p className="rounded-xl border border-surface-200 bg-white p-5 text-sm font-semibold text-ink-500">Carregando contratações...</p>;
  if (error && !hires.length) return <div className="grid gap-3 rounded-xl bg-red-50 p-5 text-red-700"><p className="font-bold">{error}</p><Button className="w-fit" variant="secondary" onClick={() => void load()}>Tentar novamente</Button></div>;
  if (!hires.length && !fallbackApplications.length) return <EmptyState title="Nenhuma contratação registrada." />;
  return <div className="grid gap-3">{error ? <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}<div className="overflow-x-auto rounded-xl border border-surface-200 bg-white shadow-card"><table className="min-w-[1200px] w-full text-sm"><thead className="bg-surface-50 text-left text-xs font-black uppercase text-ink-500"><tr><th className="p-3">Candidato</th><th className="p-3">Aprovação</th><th className="p-3">Início previsto</th><th className="p-3">Início efetivo</th><th className="p-3">Responsável da empresa</th><th className="p-3">Admissão</th><th className="p-3">Documentos</th><th className="p-3">Ações</th></tr></thead><tbody className="divide-y divide-surface-200">{hires.map((hire) => <tr key={hire.id} className="align-top hover:bg-surface-50"><td className="p-3"><button type="button" onClick={() => hire.application && onOpen(hire.application)} className="font-black hover:text-redde-700">{hire.application?.candidate_name ?? 'Candidato'}</button></td><td className="p-3">{formatDate(hire.approved_at)}</td><td className="p-3">{formatDate(hire.expected_start_date)}</td><td className="p-3">{formatDate(hire.actual_start_date)}</td><td className="p-3">{hire.internal_responsible_name ?? '-'}<p className="text-xs text-ink-500">{hire.internal_responsible_email ?? ''}</p></td><td className="p-3 font-bold">{admissionLabels[hire.admission_status]}</td><td className="max-w-xs p-3">{hire.required_documents || 'Sem pendências registradas'}</td><td className="p-3">{canManage ? <Button size="sm" variant="secondary" disabled={savingId === hire.id} onClick={() => void updateHire(hire)}>{savingId === hire.id ? 'Salvando...' : 'Atualizar admissão'}</Button> : null}</td></tr>)}</tbody></table></div></div>;
}
