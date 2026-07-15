import { Filter, RotateCcw, Search } from 'lucide-react';
import type { Company, JobContractType, ProcessFilters as ProcessFilterValues, ProcessStatus } from '../../../types';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Select';
import { contractTypeLabels, processStatusLabels } from '../../../lib/formatters';

type Props = {
  value: ProcessFilterValues;
  companies: Company[];
  responsibles: string[];
  onChange: (value: ProcessFilterValues) => void;
};

export function ProcessFilters({ value, companies, responsibles, onChange }: Props) {
  const activeCount = Object.entries(value).filter(([, item]) => item !== undefined && item !== '' && item !== false).length;
  return (
    <div className="grid gap-3 rounded-xl border border-surface-200 bg-white p-3 shadow-card">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="relative md:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-3 text-ink-500" size={17} />
          <Input
            aria-label="Pesquisar processos"
            className="pl-9"
            placeholder="Vaga, cliente ou responsável"
            value={value.search ?? ''}
            onChange={(event) => onChange({ ...value, search: event.target.value || undefined })}
          />
        </div>
        <Select
          aria-label="Cliente"
          value={value.companyId ?? ''}
          onChange={(event) => onChange({ ...value, companyId: event.target.value || undefined })}
          options={[{ label: 'Todos os clientes', value: '' }, ...companies.map((company) => ({ label: company.name, value: company.id }))]}
        />
        <Select
          aria-label="Status"
          value={value.processStatus ?? ''}
          onChange={(event) => onChange({ ...value, processStatus: (event.target.value || undefined) as ProcessStatus | undefined })}
          options={[{ label: 'Todos os status', value: '' }, ...Object.entries(processStatusLabels).map(([key, label]) => ({ value: key, label }))]}
        />
        <Select
          aria-label="Responsável"
          value={value.responsible ?? ''}
          onChange={(event) => onChange({ ...value, responsible: event.target.value || undefined })}
          options={[{ label: 'Todos os responsáveis', value: '' }, ...responsibles.map((name) => ({ label: name, value: name }))]}
        />
        <Input aria-label="Cidade" placeholder="Cidade" value={value.city ?? ''} onChange={(event) => onChange({ ...value, city: event.target.value || undefined })} />
        <Select
          aria-label="Tipo de contrato"
          value={value.contractType ?? ''}
          onChange={(event) => onChange({ ...value, contractType: (event.target.value || undefined) as JobContractType | undefined })}
          options={[{ label: 'Todos os contratos', value: '' }, ...Object.entries(contractTypeLabels).map(([key, label]) => ({ value: key, label }))]}
        />
        <Select
          aria-label="Prazo"
          value={value.deadline ?? ''}
          onChange={(event) => onChange({ ...value, deadline: (event.target.value || undefined) as ProcessFilterValues['deadline'] })}
          options={[
            { label: 'Todos os prazos', value: '' },
            { label: 'Em aberto', value: 'open' },
            { label: 'Próximos 7 dias', value: 'next_7_days' },
            { label: 'Atrasados', value: 'overdue' },
          ]}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-surface-100 pt-3">
        <div className="flex flex-wrap gap-4 text-sm font-semibold text-ink-700">
          <label className="flex items-center gap-2"><input type="checkbox" checked={Boolean(value.hasNewCandidates)} onChange={(event) => onChange({ ...value, hasNewCandidates: event.target.checked || undefined })} className="accent-redde-500" />Com candidatos novos</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={Boolean(value.overdueOnly)} onChange={(event) => onChange({ ...value, overdueOnly: event.target.checked || undefined })} className="accent-redde-500" />Processos atrasados</label>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs font-black text-redde-700"><Filter size={14} />{activeCount} ativos</span>
          <Button size="sm" variant="secondary" disabled={!activeCount} onClick={() => onChange({})}><RotateCcw size={15} />Limpar filtros</Button>
        </div>
      </div>
    </div>
  );
}
