import { ArrowRight, Search, Sparkles, UserX } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Application } from '../../../types';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Select';
import { Badge } from '../../ui/Badge';
import { EmptyState } from '../../public/EmptyState';
import { formatDate, formatOperationalValue } from '../../../lib/formatters';

type Props = {
  applications: Application[];
  canManage: boolean;
  onOpen: (application: Application) => void;
  onAnalyze: (application: Application) => Promise<void> | void;
  onAdvance: (applications: Application[]) => Promise<void> | void;
  onDisqualify: (applications: Application[]) => Promise<void> | void;
};

export function ProcessScreeningTab({ applications, canManage, onOpen, onAnalyze, onAdvance, onDisqualify }: Props) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('score_desc');
  const [analysisStatus, setAnalysisStatus] = useState('all');
  const [city, setCity] = useState('');
  const [source, setSource] = useState('');
  const [scoreMin, setScoreMin] = useState('');
  const [newOnly, setNewOnly] = useState(false);
  const [analyzingAll, setAnalyzingAll] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const filtered = useMemo(() => applications
    .filter((application) => !search || `${application.candidate_name} ${application.candidate_city ?? ''}`.toLowerCase().includes(search.toLowerCase()))
    .filter((application) => analysisStatus === 'all' || application.resume_analysis_status === analysisStatus)
    .filter((application) => !city || (application.candidate_city ?? '').toLowerCase().includes(city.toLowerCase()))
    .filter((application) => !source || application.source === source)
    .filter((application) => !scoreMin || (application.ai_match_score ?? application.adhesion_score ?? 0) >= Number(scoreMin))
    .filter((application) => !newOnly || application.is_new)
    .sort((a, b) => {
      if (sort === 'name') return a.candidate_name.localeCompare(b.candidate_name);
      if (sort === 'newest') return b.created_at.localeCompare(a.created_at);
      if (sort === 'oldest') return a.created_at.localeCompare(b.created_at);
      const score = (a.ai_match_score ?? a.adhesion_score ?? 0) - (b.ai_match_score ?? b.adhesion_score ?? 0);
      return sort === 'score_asc' ? score : -score;
    }), [analysisStatus, applications, city, newOnly, scoreMin, search, sort, source]);
  const selectedApplications = filtered.filter((application) => selected.has(application.id));

  return (
    <section className="grid gap-4">
      <div className="rounded-xl border border-surface-200 bg-white p-4 shadow-card">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <div><h2 className="font-black text-ink-900">{filtered.length} candidatos encontrados</h2><p className="text-sm text-ink-500">Análise persistida, requisitos e triagem operacional.</p></div>
          {canManage ? <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" disabled={analyzingAll} onClick={async () => { setAnalyzingAll(true); try { for (const item of applications.filter((candidate) => candidate.resume_analysis_status !== 'completed')) await onAnalyze(item); } finally { setAnalyzingAll(false); } }}><Sparkles size={15} />{analyzingAll ? 'Analisando...' : 'Analisar pendentes'}</Button>
            <Button size="sm" disabled={!selectedApplications.length} onClick={() => void onAdvance(selectedApplications)}><ArrowRight size={15} />Avançar selecionados</Button>
            <Button size="sm" variant="danger" disabled={!selectedApplications.length} onClick={() => void onDisqualify(selectedApplications)}><UserX size={15} />Desclassificar</Button>
          </div> : null}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="relative"><Search className="absolute left-3 top-3 text-ink-500" size={16} /><Input aria-label="Pesquisar candidatos" className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nome ou cidade" /></div>
          <Select aria-label="Status da análise" value={analysisStatus} onChange={(event) => setAnalysisStatus(event.target.value)} options={[{label:'Todas as análises',value:'all'},{label:'Pendente',value:'pending'},{label:'Processando',value:'processing'},{label:'Concluída',value:'completed'},{label:'Falhou',value:'failed'}]} />
          <Select aria-label="Ordenação" value={sort} onChange={(event) => setSort(event.target.value)} options={[{label:'Maior aderência',value:'score_desc'},{label:'Menor aderência',value:'score_asc'},{label:'Mais recentes',value:'newest'},{label:'Mais antigas',value:'oldest'},{label:'Nome',value:'name'}]} />
          <Input aria-label="Filtrar por cidade" placeholder="Cidade" value={city} onChange={(event) => setCity(event.target.value)} />
          <Select aria-label="Origem" value={source} onChange={(event) => setSource(event.target.value)} options={[{ label: 'Todas as origens', value: '' }, ...[...new Set(applications.map((item) => item.source).filter((item): item is string => Boolean(item)))].map((item) => ({ label: item, value: item }))]} />
          <Input aria-label="Aderência mínima" placeholder="Aderência mínima" type="number" min="0" max="100" value={scoreMin} onChange={(event) => setScoreMin(event.target.value)} />
          <label className="flex min-h-11 items-center gap-2 rounded-xl border border-surface-200 px-3 text-sm font-semibold"><input type="checkbox" checked={newOnly} onChange={(event) => setNewOnly(event.target.checked)} />Somente novos</label>
        </div>
      </div>
      {filtered.length ? <div className="overflow-x-auto rounded-xl border border-surface-200 bg-white shadow-card"><table className="min-w-[1100px] w-full text-sm"><thead className="bg-surface-50 text-left text-xs font-black uppercase text-ink-500"><tr><th className="p-3">Selecionar</th><th className="p-3">Aderência</th><th className="p-3">Candidato</th><th className="p-3">Candidatura</th><th className="p-3">Análise</th><th className="p-3">Requisitos e resumo</th><th className="p-3">Ações</th></tr></thead><tbody className="divide-y divide-surface-200">{filtered.map((application) => {
        const ranking = application.ranking_details;
        return <tr key={application.id} className="align-top hover:bg-surface-50"><td className="p-3"><input type="checkbox" disabled={!canManage} checked={selected.has(application.id)} onChange={(event) => setSelected((current) => { const next = new Set(current); if (event.target.checked) next.add(application.id); else next.delete(application.id); return next; })} aria-label={`Selecionar ${application.candidate_name}`} className="accent-redde-500" /></td><td className="p-3"><span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-redde-50 font-black text-redde-700">{application.ai_match_score ?? application.adhesion_score ?? 0}</span></td><td className="p-3"><button type="button" onClick={() => onOpen(application)} className="font-black text-ink-900 hover:text-redde-700">{application.candidate_name}</button><p className="mt-1 text-xs text-ink-500">{application.candidate_city ?? 'Cidade não informada'}</p><p className="text-xs text-ink-500">{application.salary_expectation ?? 'Pretensão não informada'}</p></td><td className="p-3 text-xs text-ink-500">{formatDate(application.created_at)}<p className="mt-1">Origem: {application.source ?? 'direta'}</p></td><td className="p-3"><Badge variant={application.resume_analysis_status === 'completed' ? 'success' : application.resume_analysis_status === 'failed' ? 'danger' : 'warning'}>{formatOperationalValue(application.resume_analysis_status)}</Badge></td><td className="max-w-lg p-3"><div className="flex flex-wrap gap-1">{ranking.met_requirements?.slice(0, 2).map((item) => <Badge key={item} variant="success">✓ {item}</Badge>)}{ranking.missing_requirements?.slice(0, 2).map((item) => <Badge key={item} variant="danger">× {item}</Badge>)}</div><p className="mt-2 line-clamp-2 text-xs leading-5 text-ink-700">{ranking.summary || application.professional_summary || 'Análise ainda não disponível.'}</p></td><td className="p-3"><div className="flex flex-col gap-1"><Button size="sm" variant="secondary" onClick={() => onOpen(application)}>Abrir perfil</Button>{canManage ? <Button size="sm" variant="secondary" onClick={() => void onAnalyze(application)}>{application.resume_analysis_status === 'completed' ? 'Repetir análise' : 'Analisar currículo'}</Button> : null}</div></td></tr>;
      })}</tbody></table></div> : <EmptyState title="Nenhum candidato corresponde aos filtros." />}
    </section>
  );
}
