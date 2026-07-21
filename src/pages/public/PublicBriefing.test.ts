import { describe, expect, it } from 'vitest';
import type { BriefingPayload } from '../../lib/franchiseOps';
import { normalizeBriefingForSave } from './PublicBriefing';

const basePayload: BriefingPayload = {
  companyName: 'Empresa Teste',
  document: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  segment: '',
  workLocation: '',
  title: 'Analista Comercial',
  positions: '1',
  department: 'Comercial',
  managerName: '',
  hiringReason: 'Aumento de quadro',
  contractType: 'clt',
  modality: 'presencial',
  cityNeighborhood: 'Natal/RN',
  schedule: '',
  salary: '',
  benefits: '',
  variablePay: '',
  desiredStartDate: '',
  education: '',
  minimumExperience: 'Experiência com vendas B2B',
  mandatoryRequirements: '',
  desirableRequirements: '',
  technicalSkills: 'CRM e Excel',
  behavioralSkills: '',
  preferredGender: '',
  ageRange: '',
  profileNotes: '',
  responsibilities: 'Prospectar e atender clientes',
  routine: '',
  goals: '',
  challenges: '',
  successCriteria: '',
  selectionSteps: '',
  companyInterviewers: '',
  interviewAvailability: '',
  requiredDocuments: '',
  additionalNotes: '',
};

describe('normalizeBriefingForSave', () => {
  it('mapeia os campos detalhados para a publicação da vaga sem duplicar em novos salvamentos', () => {
    const detailed: BriefingPayload = {
      ...basePayload,
      workDays: 'Segunda a sexta',
      workHours: '8h às 18h',
      weeklyHours: '44 horas',
      salaryMin: '2.500',
      salaryMax: '3.000',
      companyValues: 'Proatividade|Boa comunicação',
      benefitSelections: 'Vale Transporte|Plano de Saúde',
      benefitDetails: 'Vale alimentação de R$ 400',
      driversLicense: 'Categoria B',
      variablePayType: 'Comissão',
      variablePayDetails: '2% sobre vendas',
    };

    const normalized = normalizeBriefingForSave(detailed);
    const normalizedAgain = normalizeBriefingForSave(normalized);

    expect(normalized.salary).toBe('De R$ 2.500 até R$ 3.000');
    expect(normalized.schedule).toBe('Segunda a sexta · 8h às 18h · 44 horas');
    expect(normalized.behavioralSkills).toBe('Proatividade, Boa comunicação');
    expect(normalized.benefits).toContain('Vale Transporte, Plano de Saúde');
    expect(normalized.mandatoryRequirements).toContain('CNH: Categoria B');
    expect(normalized.variablePay).toBe('Comissão · 2% sobre vendas');
    expect(normalizedAgain).toEqual(normalized);
  });
});
