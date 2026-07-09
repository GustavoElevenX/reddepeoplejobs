import type { Application, Job } from '../types';

export type ApplicationRanking = {
  score: number;
  strengths: string[];
  concerns: string[];
  metRequirements: string[];
  missingRequirements: string[];
  summary: string;
};

function words(value?: string | null) {
  return new Set(
    (value ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length >= 4),
  );
}

function containsAny(source: Set<string>, target: Set<string>) {
  let matches = 0;
  target.forEach((word) => {
    if (source.has(word)) matches += 1;
  });
  return matches;
}

function splitRequirements(value?: string | null) {
  return (value ?? '')
    .split(/\n|;|,/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
}

export function createApplicationRanking(application: Application, job?: Job | null): ApplicationRanking {
  const candidateText = [
    application.message,
    application.availability,
    application.salary_expectation,
    application.candidate_city,
    application.professional_summary,
    application.skills?.join(' '),
    application.experiences?.map((experience) => `${experience.role} ${experience.company} ${experience.description ?? ''}`).join(' '),
    application.education?.map((education) => `${education.course} ${education.level ?? ''}`).join(' '),
  ].join(' ');
  const jobText = [
    job?.title,
    job?.requirements,
    job?.desirable_requirements,
    job?.responsibilities,
    job?.education_level,
    job?.city,
    job?.salary_range,
  ].join(' ');

  const candidateWords = words(candidateText);
  const jobWords = words(jobText);
  const totalJobWords = Math.max(jobWords.size, 1);
  const overlap = containsAny(candidateWords, jobWords);
  const textScore = Math.min(55, Math.round((overlap / totalJobWords) * 55));
  const locationScore =
    job?.modality === 'remoto' || !job?.city || application.candidate_city?.toLowerCase().includes(job.city.toLowerCase())
      ? 15
      : 5;
  const availabilityScore = application.availability ? 10 : 0;
  const salaryScore = application.salary_expectation ? 10 : 0;
  const resumeScore = application.resume_file_path ? 10 : 0;
  const score = Math.max(12, Math.min(98, textScore + locationScore + availabilityScore + salaryScore + resumeScore));

  const requirements = splitRequirements(job?.requirements);
  const metRequirements = requirements.filter((requirement) => containsAny(candidateWords, words(requirement)) > 0);
  const missingRequirements = requirements.filter((requirement) => !metRequirements.includes(requirement));
  const strengths = [
    score >= 70 ? 'Boa aderencia geral ao escopo da vaga' : '',
    locationScore === 15 ? 'Localizacao/modalidade compativel' : '',
    availabilityScore ? 'Disponibilidade informada' : '',
    salaryScore ? 'Pretensao salarial informada' : '',
    metRequirements.length ? `Atende ${metRequirements.length} requisito(s) mapeado(s)` : '',
  ].filter(Boolean);
  const concerns = [
    score < 60 ? 'Aderencia precisa ser validada manualmente' : '',
    locationScore < 15 ? 'Localizacao pode exigir confirmacao' : '',
    !availabilityScore ? 'Disponibilidade nao informada' : '',
    !salaryScore ? 'Pretensao salarial nao informada' : '',
    missingRequirements.length ? `${missingRequirements.length} requisito(s) sem evidencia clara` : '',
  ].filter(Boolean);

  return {
    score,
    strengths,
    concerns,
    metRequirements,
    missingRequirements,
    summary:
      score >= 75
        ? 'Candidato com boa aderencia inicial. Recomenda-se priorizar na triagem.'
        : score >= 55
          ? 'Candidato com aderencia moderada. Vale validar pontos de experiencia, salario e disponibilidade.'
          : 'Candidato exige analise manual cuidadosa antes de avancar.',
  };
}
