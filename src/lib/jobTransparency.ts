import type { Job } from '../types';

type TransparencyCriterion = {
  label: string;
  weight: number;
  met: boolean;
};

export function getJobTransparency(job: Job) {
  const criteria: TransparencyCriterion[] = [
    { label: 'Salário informado', weight: 20, met: Boolean(job.salary_range || job.salary_min != null || job.salary_max != null) },
    { label: 'Benefícios publicados', weight: 15, met: Boolean(job.benefits?.trim()) },
    { label: 'Jornada informada', weight: 15, met: Boolean(job.work_schedule?.trim()) },
    { label: 'Responsabilidades e requisitos', weight: 20, met: Boolean(job.responsibilities?.trim() && job.requirements?.trim()) },
    { label: 'Prazo de candidatura', weight: 15, met: Boolean(job.application_deadline || job.expires_at) },
    { label: 'Responsável pela seleção', weight: 15, met: Boolean(job.responsible_name?.trim()) },
  ];
  return {
    score: criteria.reduce((total, item) => total + (item.met ? item.weight : 0), 0),
    criteria,
    met: criteria.filter((item) => item.met).map((item) => item.label),
    missing: criteria.filter((item) => !item.met).map((item) => item.label),
  };
}

export function isEntryLevelJob(job: Job) {
  const text = [job.title, job.short_description, job.description, job.requirements, job.seniority]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return job.contract_type === 'estagio'
    || ['primeiro emprego', 'sem experiência', 'sem experiencia', 'jovem aprendiz', 'aprendiz', 'início imediato', 'inicio imediato', 'urgente']
      .some((term) => text.includes(term));
}
