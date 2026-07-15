import { ArrowDown, ArrowUp, Edit, Plus, ToggleLeft, ToggleRight } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { listJobStageSlaSettings, listJobTests, upsertJobStageSlaSettings, upsertJobTest } from '../../../lib/recruitmentPipeline';
import { applicationStageLabels } from '../../../lib/formatters';
import type { ApplicationStage, JobStageSlaSetting, JobTest, JobTestType } from '../../../types';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Select';
import { Textarea } from '../../ui/Textarea';

type Props = { jobId: string; franchiseId: string | null; canManage: boolean };
const typeOptions: { label: string; value: JobTestType }[] = [
  { label: 'Manual', value: 'manual' }, { label: 'Endereço externo', value: 'external_link' },
  { label: 'Formulário', value: 'form' }, { label: 'Envio de arquivo', value: 'file_upload' },
  { label: 'Somente nota', value: 'score_only' },
];
const emptyForm = { id: '', name: '', type: 'manual' as JobTestType, passingScore: '', required: true, description: '', instructions: '', externalUrl: '' };

export function ProcessJobTestsPanel({ jobId, franchiseId, canManage }: Props) {
  const [tests, setTests] = useState<JobTest[]>([]);
  const [slaSettings, setSlaSettings] = useState<JobStageSlaSetting[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const activeStages: Exclude<ApplicationStage, 'desclassificados'>[] = ['qualificacao', 'testes', 'entrevista', 'finalistas', 'contratacao'];

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [testData, slaData] = await Promise.all([listJobTests(jobId), listJobStageSlaSettings(jobId)]);
      setTests(testData); setSlaSettings(slaData);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar testes e SLAs.');
    } finally { setLoading(false); }
  }, [jobId]);
  useEffect(() => { void load(); }, [load]);

  function editTest(test: JobTest) {
    setForm({ id: test.id, name: test.name, type: test.test_type, passingScore: test.passing_score?.toString() ?? '', required: test.is_required, description: test.description ?? '', instructions: test.instructions ?? '', externalUrl: test.external_url ?? '' });
    setEditing(true);
  }

  async function saveTest() {
    if (!franchiseId || !form.name.trim()) return;
    setSaving(true); setError('');
    try {
      await upsertJobTest({ id: form.id || undefined, job_id: jobId, franchise_id: franchiseId, name: form.name.trim(), test_type: form.type, passing_score: form.passingScore ? Number(form.passingScore) : null, is_required: form.required, description: form.description.trim() || null, instructions: form.instructions.trim() || null, external_url: form.externalUrl.trim() || null, sort_order: form.id ? tests.find((test) => test.id === form.id)?.sort_order ?? tests.length : tests.length });
      setForm(emptyForm); setEditing(false); await load();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'Não foi possível salvar o teste.'); }
    finally { setSaving(false); }
  }

  async function updateTest(test: JobTest, changes: Partial<JobTest>) {
    setSaving(true); setError('');
    try { await upsertJobTest({ ...test, ...changes }); await load(); }
    catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'Não foi possível atualizar o teste.'); }
    finally { setSaving(false); }
  }

  async function moveTest(test: JobTest, direction: -1 | 1) {
    const index = tests.findIndex((item) => item.id === test.id);
    const sibling = tests[index + direction];
    if (!sibling) return;
    setSaving(true); setError('');
    try {
      await Promise.all([upsertJobTest({ ...test, sort_order: sibling.sort_order }), upsertJobTest({ ...sibling, sort_order: test.sort_order })]);
      await load();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'Não foi possível reordenar os testes.'); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="rounded-xl border border-surface-200 bg-white p-5 text-sm font-semibold text-ink-500">Carregando testes e SLAs...</div>;
  return <div className="grid gap-3">
    {error ? <div className="flex items-center justify-between gap-3 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700"><span>{error}</span><Button size="sm" variant="secondary" onClick={() => void load()}>Tentar novamente</Button></div> : null}
    <section className="rounded-xl border border-surface-200 bg-white shadow-card">
      <div className="flex items-center justify-between gap-3 px-4 py-3"><div><h3 className="font-black text-ink-900">Testes da vaga</h3><p className="text-xs text-ink-500">Defina conteúdo, obrigatoriedade, nota mínima e ordem.</p></div>{canManage ? <Button size="sm" variant="secondary" onClick={() => { setForm(emptyForm); setEditing((value) => !value); }}><Plus size={15} />Novo teste</Button> : null}</div>
      {editing ? <div className="grid gap-3 border-t border-surface-200 bg-surface-50 p-4 sm:grid-cols-2"><Input label="Nome do teste" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /><Select label="Tipo" value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as JobTestType }))} options={typeOptions} /><Textarea label="Descrição" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /><Textarea label="Instruções" value={form.instructions} onChange={(event) => setForm((current) => ({ ...current, instructions: event.target.value }))} /><Input label="URL externa" type="url" value={form.externalUrl} onChange={(event) => setForm((current) => ({ ...current, externalUrl: event.target.value }))} /><Input label="Nota mínima" type="number" value={form.passingScore} onChange={(event) => setForm((current) => ({ ...current, passingScore: event.target.value }))} /><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.required} onChange={(event) => setForm((current) => ({ ...current, required: event.target.checked }))} className="accent-redde-500" />Obrigatório</label><Button size="sm" disabled={saving || !form.name.trim() || !franchiseId} onClick={() => void saveTest()}>{saving ? 'Salvando...' : 'Salvar teste'}</Button></div> : null}
      <div className="divide-y divide-surface-200 border-t border-surface-200">{tests.map((test, index) => <div key={test.id} className="flex items-start justify-between gap-3 px-4 py-3"><div><p className="font-bold text-ink-900">{test.name}</p><p className="text-xs text-ink-500">{typeOptions.find((option) => option.value === test.test_type)?.label} • {test.is_required ? 'Obrigatório' : 'Opcional'} • nota mínima {test.passing_score ?? 'não definida'}</p>{test.description ? <p className="mt-1 text-xs text-ink-600">{test.description}</p> : null}{test.external_url ? <a className="mt-1 block text-xs font-bold text-redde-700 underline" href={test.external_url} target="_blank" rel="noreferrer">Abrir teste externo</a> : null}</div>{canManage ? <div className="flex items-center gap-1"><button type="button" aria-label={`Subir ${test.name}`} disabled={saving || index === 0} onClick={() => void moveTest(test, -1)} className="rounded-lg p-2 hover:bg-redde-50 disabled:opacity-30"><ArrowUp size={17} /></button><button type="button" aria-label={`Descer ${test.name}`} disabled={saving || index === tests.length - 1} onClick={() => void moveTest(test, 1)} className="rounded-lg p-2 hover:bg-redde-50 disabled:opacity-30"><ArrowDown size={17} /></button><button type="button" aria-label={`Editar ${test.name}`} onClick={() => editTest(test)} className="rounded-lg p-2 hover:bg-redde-50"><Edit size={17} /></button><button type="button" aria-label={test.is_active ? `Desativar ${test.name}` : `Ativar ${test.name}`} disabled={saving} onClick={() => void updateTest(test, { is_active: !test.is_active })} className="rounded-lg p-2 text-redde-700 hover:bg-redde-50">{test.is_active ? <ToggleRight /> : <ToggleLeft />}</button></div> : null}</div>)}{!tests.length ? <p className="px-4 py-5 text-sm text-ink-500">Nenhum teste configurado. A etapa poderá ser pulada mediante confirmação explícita.</p> : null}</div>
    </section>
    <section className="rounded-xl border border-surface-200 bg-white shadow-card"><div className="px-4 py-3"><h3 className="font-black text-ink-900">SLA por etapa</h3><p className="text-xs text-ink-500">O prazo é recalculado automaticamente a cada movimentação.</p></div><div className="divide-y divide-surface-200 border-t border-surface-200">{activeStages.map((stage) => { const setting = slaSettings.find((item) => item.stage === stage); return <div key={stage} className="grid items-end gap-3 px-4 py-3 sm:grid-cols-[1fr_120px_120px_auto]"><p className="pb-2 text-sm font-bold text-ink-900">{applicationStageLabels[stage]}</p><Input aria-label={`SLA de ${applicationStageLabels[stage]}`} label="Dias" type="number" min={0} value={setting?.sla_days ?? ''} onChange={(event) => { const value = Number(event.target.value); setSlaSettings((current) => [...current.filter((item) => item.stage !== stage), { id: setting?.id ?? '', franchise_id: franchiseId, job_id: jobId, stage, sla_days: value, warning_days: setting?.warning_days ?? 1, created_at: setting?.created_at ?? '', updated_at: setting?.updated_at ?? '' }]); }} /><Input aria-label={`Alerta de ${applicationStageLabels[stage]}`} label="Alerta" type="number" min={0} value={setting?.warning_days ?? 1} onChange={(event) => { const value = Number(event.target.value); setSlaSettings((current) => [...current.filter((item) => item.stage !== stage), { id: setting?.id ?? '', franchise_id: franchiseId, job_id: jobId, stage, sla_days: setting?.sla_days ?? 0, warning_days: value, created_at: setting?.created_at ?? '', updated_at: setting?.updated_at ?? '' }]); }} />{canManage ? <Button size="sm" variant="secondary" disabled={saving || !franchiseId || setting?.sla_days === undefined} onClick={async () => { if (!setting) return; setSaving(true); setError(''); try { await upsertJobStageSlaSettings([{ franchise_id: franchiseId, job_id: jobId, stage, sla_days: setting.sla_days, warning_days: setting.warning_days }]); await load(); } catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'Não foi possível salvar o SLA.'); } finally { setSaving(false); } }}>Salvar</Button> : null}</div>; })}</div></section>
  </div>;
}
