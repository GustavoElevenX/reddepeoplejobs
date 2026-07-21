import { Check, CheckCircle2, ChevronRight, Save, Send } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { EmptyState } from '../../components/public/EmptyState';
import { LoadingState } from '../../components/public/LoadingState';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { getPublicBriefing, saveBriefing, type BriefingPayload, type JobBriefing } from '../../lib/franchiseOps';

type BriefingKey = keyof BriefingPayload;
type Option = { label: string; value: string };

const sections = [
  ['Dados da empresa e da vaga', 'Informações básicas sobre a empresa e a posição em aberto.'],
  ['Perfil e requisitos', 'Quem é a pessoa que a empresa está buscando.'],
  ['Conhecimentos técnicos', 'Ferramentas, sistemas e competências necessárias.'],
  ['Rotina prática do cargo', 'Atividades, liderança e resultados esperados.'],
  ['Perfil comportamental e cultura', 'O jeito de trabalhar e o ambiente da empresa.'],
  ['Condições e remuneração', 'Regime, local, jornada, salário e benefícios.'],
  ['Informações adicionais', 'Restrições e qualquer detalhe importante.'],
] as const;

const requiredFields: BriefingKey[] = [
  'companyName', 'respondentName', 'title', 'hiringReason', 'technicalSkills',
  'responsibilities', 'companyDescription', 'companyValues', 'contractType', 'salaryMin',
];

const educationOptions = [
  'Ensino Fundamental', 'Ensino Médio completo', 'Técnico / Profissionalizante',
  'Superior cursando', 'Superior completo', 'Pós-graduação / MBA', 'Indiferente',
].map((value) => ({ label: value, value }));

const ageOptions = ['18 a 25 anos', '25 a 35 anos', '35 a 45 anos', 'Acima de 45 anos', 'Indiferente']
  .map((value) => ({ label: value, value }));

const companyValueOptions = [
  'Proatividade', 'Disciplina e organização', 'Trabalho em equipe', 'Autonomia',
  'Boa comunicação', 'Foco em resultados', 'Criatividade', 'Lealdade e comprometimento',
].map((value) => ({ label: value, value }));

const benefitOptions = [
  'Vale Transporte', 'Vale Refeição', 'Vale Alimentação', 'Plano de Saúde',
  'Plano Odontológico', 'Seguro de Vida', 'Gympass / Wellhub', 'Celular corporativo',
  'Notebook / Equipamento', 'Estacionamento', 'Day Off aniversário',
].map((value) => ({ label: value, value }));

const languageOptions = ['Nenhum além do português', 'Inglês básico', 'Inglês fluente', 'Espanhol', 'Outro']
  .map((value) => ({ label: value, value }));

function valueOf(form: BriefingPayload, key: BriefingKey) {
  return String(form[key] ?? '');
}

function selectedValues(value: string) {
  return value.split('|').map((item) => item.trim()).filter(Boolean);
}

function formatList(value?: string) {
  return selectedValues(value ?? '').join(', ');
}

export function normalizeBriefingForSave(payload: BriefingPayload): BriefingPayload {
  const salaryParts = [
    payload.salaryMin ? `De R$ ${payload.salaryMin}` : '',
    payload.salaryMax ? `até R$ ${payload.salaryMax}` : '',
  ].filter(Boolean);
  const scheduleParts = [payload.workDays, payload.workHours, payload.weeklyHours].filter(Boolean);
  const mandatoryParts = [
    payload.technicalSkills,
    payload.experienceRequirement ? `Experiência: ${payload.experienceRequirement}` : '',
    payload.minimumExperience,
    payload.driversLicense ? `CNH: ${payload.driversLicense}` : '',
    payload.ownVehicle ? `Veículo próprio: ${payload.ownVehicle}` : '',
    payload.travelAvailability ? `Viagens: ${payload.travelAvailability}` : '',
    payload.languages ? `Idiomas: ${formatList(payload.languages)}` : '',
    payload.certifications ? `Certificações: ${payload.certifications}` : '',
    payload.nonNegotiables ? `Pontos inegociáveis: ${payload.nonNegotiables}` : '',
  ].filter(Boolean);
  const profileParts = [
    payload.ageRange ? `Faixa etária informada: ${payload.ageRange}` : '',
    payload.preferredGender ? `Preferência informada: ${payload.preferredGender}` : '',
    payload.candidateRegion ? `Região preferencial: ${payload.candidateRegion}` : '',
    payload.cultureMismatch ? `Não se adapta: ${payload.cultureMismatch}` : '',
  ].filter(Boolean);
  const benefitParts = [
    formatList(payload.benefitSelections) || payload.benefits, payload.benefitDetails, payload.healthPlan,
    payload.dentalPlan, payload.lifeInsurance,
  ].filter(Boolean);

  return {
    ...payload,
    salary: salaryParts.length ? salaryParts.join(' ') : payload.salary,
    schedule: scheduleParts.length ? scheduleParts.join(' · ') : payload.schedule,
    workLocation: payload.workLocation || payload.cityNeighborhood,
    cityNeighborhood: payload.cityNeighborhood || payload.workLocation,
    mandatoryRequirements: mandatoryParts.length ? mandatoryParts.join('\n') : payload.mandatoryRequirements,
    desirableRequirements: payload.desirableRequirements,
    behavioralSkills: formatList(payload.companyValues) || payload.behavioralSkills,
    profileNotes: profileParts.length ? profileParts.join('\n') : payload.profileNotes,
    routine: payload.responsibilities || payload.routine,
    benefits: benefitParts.length ? benefitParts.join('\n') : payload.benefits,
    variablePay: [payload.variablePayType, payload.variablePayDetails].filter(Boolean).join(' · '),
    additionalNotes: payload.additionalNotes,
  };
}

function FormSection({ index, title, description, children }: {
  index: number;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section id={`briefing-section-${index + 1}`} className="scroll-mt-24 rounded-2xl border border-surface-200 bg-white p-5 shadow-card sm:p-7">
      <div className="mb-6 flex items-start gap-3 border-b border-surface-100 pb-5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-redde-50 text-sm font-black text-redde-700">{index + 1}</span>
        <div>
          <h2 className="text-xl font-black text-ink-900">{title}</h2>
          <p className="mt-1 text-sm text-ink-500">{description}</p>
        </div>
      </div>
      <div className="grid gap-5">{children}</div>
    </section>
  );
}

function ChoicePills({ label, value, options, required, error, onChange }: {
  label: string;
  value: string;
  options: Option[];
  required?: boolean;
  error?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-ink-700">{label}{required ? <span className="ml-1 text-redde-700">*</span> : null}</p>
      <div className={`flex flex-wrap gap-2 rounded-xl ${error ? 'ring-2 ring-redde-300 ring-offset-2' : ''}`}>
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <button key={option.value} type="button" aria-pressed={selected} onClick={() => onChange(option.value)}
              className={`focus-ring flex min-h-10 items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition ${selected ? 'border-redde-500 bg-redde-50 text-redde-700' : 'border-surface-200 bg-surface-50 text-ink-700 hover:border-redde-200 hover:bg-white'}`}>
              <span className={`flex h-4 w-4 items-center justify-center rounded-full border ${selected ? 'border-redde-500 bg-redde-500 text-white' : 'border-surface-300 bg-white'}`}>{selected ? <Check size={11} /> : null}</span>
              {option.label}
            </button>
          );
        })}
      </div>
      {error ? <p className="mt-2 text-xs font-semibold text-redde-700">Preencha este campo para enviar.</p> : null}
    </div>
  );
}

function MultiPills({ label, value, options, required, hint, error, max, onChange }: {
  label: string;
  value: string;
  options: Option[];
  required?: boolean;
  hint?: string;
  error?: boolean;
  max?: number;
  onChange: (value: string) => void;
}) {
  const selected = selectedValues(value);
  const toggle = (next: string) => {
    if (selected.includes(next)) onChange(selected.filter((item) => item !== next).join('|'));
    else if (!max || selected.length < max) onChange([...selected, next].join('|'));
  };
  return (
    <div>
      <p className="text-sm font-semibold text-ink-700">{label}{required ? <span className="ml-1 text-redde-700">*</span> : null}</p>
      {hint ? <p className="mb-2 mt-1 text-xs text-ink-500">{hint}</p> : <div className="h-2" />}
      <div className={`flex flex-wrap gap-2 rounded-xl ${error ? 'ring-2 ring-redde-300 ring-offset-2' : ''}`}>
        {options.map((option) => {
          const checked = selected.includes(option.value);
          return (
            <button key={option.value} type="button" aria-pressed={checked} onClick={() => toggle(option.value)}
              className={`focus-ring flex min-h-10 items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition ${checked ? 'border-redde-500 bg-redde-50 text-redde-700' : 'border-surface-200 bg-surface-50 text-ink-700 hover:border-redde-200 hover:bg-white'}`}>
              <span className={`flex h-4 w-4 items-center justify-center rounded border ${checked ? 'border-redde-500 bg-redde-500 text-white' : 'border-surface-300 bg-white'}`}>{checked ? <Check size={11} /> : null}</span>
              {option.label}
            </button>
          );
        })}
      </div>
      {error ? <p className="mt-2 text-xs font-semibold text-redde-700">Preencha este campo para enviar.</p> : null}
    </div>
  );
}

export function PublicBriefing() {
  const { token } = useParams();
  const [briefing, setBriefing] = useState<JobBriefing | null>(null);
  const [form, setForm] = useState<BriefingPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [missing, setMissing] = useState<Set<BriefingKey>>(new Set());
  const [activeSection, setActiveSection] = useState(0);

  useEffect(() => {
    let isMounted = true;
    if (!token) { setLoading(false); return; }
    void getPublicBriefing(token).then((data) => {
      if (!isMounted) return;
      setBriefing(data);
      setForm(data?.payload ?? null);
    }).catch((loadError: unknown) => {
      if (isMounted) setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar.');
    }).finally(() => { if (isMounted) setLoading(false); });
    return () => { isMounted = false; };
  }, [token]);

  const completedRequired = useMemo(() => form
    ? requiredFields.filter((key) => valueOf(form, key).trim()).length
    : 0, [form]);
  const progress = Math.round((completedRequired / requiredFields.length) * 100);

  if (loading) return <LoadingState label="Carregando levantamento da vaga..." />;
  if (!token || !briefing || !form) return <EmptyState title="Endereço do levantamento inválido ou expirado." />;

  const update = (key: BriefingKey, value: string) => {
    setForm((current) => current ? ({ ...current, [key]: value } as BriefingPayload) : current);
    setMissing((current) => { const next = new Set(current); next.delete(key); return next; });
    setSaved(false);
  };
  const fieldError = (key: BriefingKey) => missing.has(key);
  const textField = (key: BriefingKey, label: string, options?: { required?: boolean; placeholder?: string; type?: string }) => (
    <div>
      <Input label={`${label}${options?.required ? ' *' : ''}`} type={options?.type ?? 'text'} value={valueOf(form, key)}
        placeholder={options?.placeholder} onChange={(event) => update(key, event.target.value)} className={fieldError(key) ? 'border-redde-500 ring-2 ring-redde-100' : ''} />
      {fieldError(key) ? <p className="mt-1 text-xs font-semibold text-redde-700">Preencha este campo para enviar.</p> : null}
    </div>
  );
  const textArea = (key: BriefingKey, label: string, options?: { required?: boolean; placeholder?: string; rows?: number }) => (
    <div>
      <Textarea label={`${label}${options?.required ? ' *' : ''}`} rows={options?.rows ?? 4} value={valueOf(form, key)}
        placeholder={options?.placeholder} onChange={(event) => update(key, event.target.value)} className={fieldError(key) ? 'border-redde-500 ring-2 ring-redde-100' : ''} />
      {fieldError(key) ? <p className="mt-1 text-xs font-semibold text-redde-700">Preencha este campo para enviar.</p> : null}
    </div>
  );
  const selectField = (key: BriefingKey, label: string, options: Option[], required = false) => (
    <div>
      <Select label={`${label}${required ? ' *' : ''}`} value={valueOf(form, key)} onChange={(event) => update(key, event.target.value)}
        options={[{ label: 'Selecione...', value: '' }, ...options]} className={fieldError(key) ? 'border-redde-500 ring-2 ring-redde-100' : ''} />
      {fieldError(key) ? <p className="mt-1 text-xs font-semibold text-redde-700">Preencha este campo para enviar.</p> : null}
    </div>
  );

  async function submit(finalize: boolean) {
    if (!token || !form) return;
    setError('');
    setSubmitted(false);
    if (finalize) {
      const nextMissing = new Set(requiredFields.filter((key) => !valueOf(form, key).trim()));
      setMissing(nextMissing);
      if (nextMissing.size) {
        const firstKey = requiredFields.find((key) => nextMissing.has(key));
        const sectionByField: Partial<Record<BriefingKey, number>> = {
          companyName: 0, respondentName: 0, title: 0, hiringReason: 0,
          technicalSkills: 2, responsibilities: 3, companyDescription: 4,
          companyValues: 4, contractType: 5, salaryMin: 5,
        };
        const sectionIndex = firstKey ? sectionByField[firstKey] ?? 0 : 0;
        setActiveSection(sectionIndex);
        document.getElementById(`briefing-section-${sectionIndex + 1}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setError('Preencha os campos essenciais destacados antes de enviar.');
        return;
      }
    }
    setBusy(true);
    try {
      const updated = await saveBriefing(token, normalizeBriefingForSave(form), finalize ? 'filled' : 'in_progress', 'client');
      setBriefing(updated);
      setForm(updated.payload);
      setSaved(!finalize);
      setSubmitted(finalize);
      if (finalize) window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Não foi possível salvar o levantamento da vaga.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f5f0] py-8 sm:py-10">
      <div className="container-page max-w-[1180px]">
        <header className="mb-6 grid gap-5 rounded-2xl border border-surface-200 border-t-4 border-t-redde-500 bg-white p-6 shadow-card sm:grid-cols-[auto_1fr] sm:items-center sm:p-8">
          <img src="/imagens/logo/logo-nova.png" alt="Recruitfy" className="h-12 w-auto sm:h-14" />
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-redde-700">Levantamento da vaga</p>
            <h1 className="mt-1 text-2xl font-black text-ink-900 sm:text-3xl">Formulário de abertura de vaga</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-500">Preencha em etapas. Os campos marcados com * são essenciais para entendermos a vaga e evitarmos retrabalho.</p>
          </div>
        </header>

        {submitted ? (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-800">
            <CheckCircle2 className="mt-0.5 shrink-0" size={22} />
            <div><p className="font-black">Levantamento enviado com sucesso.</p><p className="mt-1 text-sm">A equipe Recruitfy já pode revisar as informações e dar continuidade à publicação da vaga.</p></div>
          </div>
        ) : null}
        {saved ? <div className="mb-6 rounded-xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">Rascunho salvo. Você pode continuar o preenchimento depois usando este mesmo link.</div> : null}
        {error ? <div className="mb-6 rounded-xl bg-redde-50 px-4 py-3 text-sm font-semibold text-redde-700">{error}</div> : null}

        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="h-fit lg:sticky lg:top-6">
            <div className="rounded-2xl border border-surface-200 bg-white p-5 shadow-card">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-redde-700">Progresso</p>
              <div className="mt-2 flex items-end justify-between gap-3"><p className="text-sm text-ink-500">Campos essenciais</p><strong className="text-xl text-ink-900">{progress}%</strong></div>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-surface-100"><div className="h-full rounded-full bg-gradient-to-r from-redde-500 to-emerald-500 transition-all" style={{ width: `${progress}%` }} /></div>
              <p className="mt-2 text-xs text-ink-500">{completedRequired} de {requiredFields.length} preenchidos</p>
            </div>
            <nav className="mt-4 grid gap-2 rounded-2xl border border-surface-200 bg-white p-3 shadow-card" aria-label="Etapas do levantamento da vaga">
              {sections.map(([title], index) => (
                <button key={title} type="button" onClick={() => { setActiveSection(index); document.getElementById(`briefing-section-${index + 1}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                  className={`focus-ring flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold transition ${activeSection === index ? 'bg-redde-50 text-redde-700' : 'text-ink-600 hover:bg-surface-50'}`}>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">{index + 1}</span><span className="flex-1">{title}</span><ChevronRight size={14} />
                </button>
              ))}
            </nav>
          </aside>

          <form className="grid gap-6" onSubmit={(event) => event.preventDefault()}>
            <FormSection index={0} title={sections[0][0]} description={sections[0][1]}>
              <div className="grid gap-5 md:grid-cols-2">{textField('companyName', 'Nome da empresa', { required: true, placeholder: 'Ex: Empresa XYZ Ltda.' })}{textField('respondentName', 'Responsável pelo preenchimento', { required: true, placeholder: 'Nome completo' })}</div>
              <ChoicePills label="Autoriza citar o nome da empresa na divulgação?" value={valueOf(form, 'companyNameDisclosure')} onChange={(value) => update('companyNameDisclosure', value)} options={[{ label: 'Sim', value: 'Sim' }, { label: 'Não', value: 'Não' }]} />
              <div className="grid gap-5 md:grid-cols-2">{textField('contactPhone', 'Telefone / WhatsApp', { type: 'tel', placeholder: '(00) 00000-0000' })}{textField('finalistEmail', 'E-mail para envio dos currículos finalistas', { type: 'email', placeholder: 'finalistas@empresa.com' })}</div>
              {textField('title', 'Nome do cargo / função', { required: true, placeholder: 'Ex: Assistente Financeiro' })}
              <div className="grid gap-5 md:grid-cols-2">{textField('department', 'Área / setor da vaga')}{textField('managerName', 'Gestor direto')}</div>
              <ChoicePills label="Motivo da vaga" required error={fieldError('hiringReason')} value={valueOf(form, 'hiringReason')} onChange={(value) => update('hiringReason', value)} options={['Aumento de quadro', 'Substituição', 'Área ou cargo novo'].map((value) => ({ label: value, value }))} />
              <ChoicePills label="Urgência do preenchimento" value={valueOf(form, 'urgency')} onChange={(value) => update('urgency', value)} options={['Imediata', 'Até 30 dias', 'Sem pressa'].map((value) => ({ label: value, value }))} />
              <div className="max-w-40">{textField('positions', 'Quantidade de vagas', { type: 'number' })}</div>
            </FormSection>

            <FormSection index={1} title={sections[1][0]} description={sections[1][1]}>
              <div className="grid gap-5 md:grid-cols-2">{selectField('education', 'Escolaridade mínima', educationOptions)}{textField('educationArea', 'Área de formação')}</div>
              <div className="grid gap-5 md:grid-cols-2">{selectField('ageRange', 'Faixa etária desejada', ageOptions)}{selectField('preferredGender', 'Gênero de preferência', ['Masculino', 'Feminino', 'Indiferente'].map((value) => ({ label: value, value })))}</div>
              <ChoicePills label="Experiência anterior necessária?" value={valueOf(form, 'experienceRequirement')} onChange={(value) => update('experienceRequirement', value)} options={['Não é necessária', 'Desejável, mas não obrigatória', 'Sim, é obrigatória'].map((value) => ({ label: value, value }))} />
              {textArea('minimumExperience', 'Descreva o tipo de experiência', { placeholder: 'Segmento, ferramenta ou atividade desejada.' })}
              <ChoicePills label="Precisa de CNH?" value={valueOf(form, 'driversLicense')} onChange={(value) => update('driversLicense', value)} options={['Não', 'Categoria A', 'Categoria B', 'Categoria AB', 'Outra categoria'].map((value) => ({ label: value, value }))} />
              <ChoicePills label="Precisa ter veículo próprio?" value={valueOf(form, 'ownVehicle')} onChange={(value) => update('ownVehicle', value)} options={['Sim', 'Não', 'Desejável'].map((value) => ({ label: value, value }))} />
              <ChoicePills label="Disponibilidade para viagens?" value={valueOf(form, 'travelAvailability')} onChange={(value) => update('travelAvailability', value)} options={['Não', 'Eventualmente', 'Com frequência'].map((value) => ({ label: value, value }))} />
              {textField('candidateRegion', 'Região ou local de moradia preferencial')}
              <MultiPills label="Idiomas necessários" value={valueOf(form, 'languages')} options={languageOptions} onChange={(value) => update('languages', value)} />
            </FormSection>

            <FormSection index={2} title={sections[2][0]} description={sections[2][1]}>
              {textArea('technicalSkills', 'Quais conhecimentos técnicos essa pessoa precisa ter?', { required: true, rows: 6, placeholder: 'Ferramentas, sistemas, processos ou competências essenciais.' })}
              {textField('systems', 'A empresa utiliza algum sistema ou software específico?')}
              {textField('certifications', 'Há certificação, curso ou registro profissional obrigatório?')}
              {textArea('desirableRequirements', 'Conhecimentos que seriam um diferencial')}
            </FormSection>

            <FormSection index={3} title={sections[3][0]} description={sections[3][1]}>
              {textArea('responsibilities', 'O que essa pessoa fará quando começar a trabalhar?', { required: true, rows: 7, placeholder: 'Descreva as principais atividades do dia a dia.' })}
              <ChoicePills label="Essa pessoa vai liderar ou gerenciar alguém?" value={valueOf(form, 'managesPeople')} onChange={(value) => update('managesPeople', value)} options={[{ label: 'Sim', value: 'Sim' }, { label: 'Não', value: 'Não' }]} />
              {textField('teamSize', 'Se sim, quantas pessoas vai liderar?')}
              {textArea('goals', 'Quais são as metas ou resultados esperados?')}
              {textArea('previousRoleIssues', 'Existe algo que deu errado com a pessoa anterior nesse cargo?')}
            </FormSection>

            <FormSection index={4} title={sections[4][0]} description={sections[4][1]}>
              {textArea('companyDescription', 'Descreva como é a empresa', { required: true, rows: 5, placeholder: 'Ambiente, rotina, ritmo e principais características.' })}
              <MultiPills label="O que a empresa mais valoriza em um colaborador?" required hint="Selecione até 3 opções." max={3} error={fieldError('companyValues')} value={valueOf(form, 'companyValues')} options={companyValueOptions} onChange={(value) => update('companyValues', value)} />
              {textArea('leadershipRelationship', 'Como é a relação entre liderança e equipe?')}
              {textArea('cultureMismatch', 'Que tipo de pessoa não se adapta bem à empresa?')}
              {textField('companyStyle', 'Em uma frase, como é o jeito de ser da empresa?')}
              {textArea('formalValues', 'A empresa tem valores formalizados? Se sim, quais?')}
            </FormSection>

            <FormSection index={5} title={sections[5][0]} description={sections[5][1]}>
              <div className="grid gap-5 md:grid-cols-2">{selectField('contractType', 'Modelo de contratação', [{ label: 'CLT', value: 'clt' }, { label: 'PJ', value: 'pj' }, { label: 'Estágio', value: 'estagio' }, { label: 'Temporário', value: 'temporario' }, { label: 'A definir', value: 'outro' }], true)}{selectField('modality', 'Modelo de trabalho', [{ label: 'Presencial', value: 'presencial' }, { label: 'Híbrido', value: 'hibrido' }, { label: 'Remoto', value: 'remoto' }])}</div>
              <div className="grid gap-5 md:grid-cols-2">{textField('cityNeighborhood', 'Local de trabalho')}{textField('workDays', 'Dias de trabalho')}</div>
              <div className="grid gap-5 md:grid-cols-2">{textField('workHours', 'Horário de trabalho')}{textField('weeklyHours', 'Carga horária semanal')}</div>
              <div className="grid gap-5 md:grid-cols-2">{textField('salaryMin', 'Faixa salarial — de (R$)', { required: true })}{textField('salaryMax', 'Faixa salarial — até (R$)')}</div>
              <ChoicePills label="Há remuneração variável?" value={valueOf(form, 'variablePayType')} onChange={(value) => update('variablePayType', value)} options={['Não', 'Comissão', 'Bônus', 'PLR', 'Outro'].map((value) => ({ label: value, value }))} />
              {textField('variablePayDetails', 'Descrição da remuneração variável')}
              <MultiPills label="Benefícios oferecidos" value={valueOf(form, 'benefitSelections')} options={benefitOptions} onChange={(value) => update('benefitSelections', value)} />
              {textArea('healthPlan', 'Detalhes do plano de saúde')}
              <div className="grid gap-5 md:grid-cols-2">{textArea('dentalPlan', 'Plano odontológico')}{textArea('lifeInsurance', 'Seguro de vida')}</div>
              {textArea('benefitDetails', 'Outros benefícios ou observações sobre remuneração')}
            </FormSection>

            <FormSection index={6} title={sections[6][0]} description={sections[6][1]}>
              {textArea('additionalNotes', 'Existe alguma característica ou exigência não mencionada?')}
              {textArea('nonNegotiables', 'Alguma restrição ou ponto inegociável para a vaga?')}
              {textField('interviewPresentation', 'Como o candidato deve se apresentar para a entrevista?')}
            </FormSection>

            <div className="flex flex-col gap-3 rounded-2xl border border-surface-200 bg-white p-5 shadow-card sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-xl text-sm leading-6 text-ink-500">Suas respostas ficam vinculadas a esta vaga e serão usadas pela equipe Recruitfy para conduzir o processo seletivo.</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" disabled={busy} onClick={() => void submit(false)}><Save size={17} />Salvar rascunho</Button>
                <Button type="button" disabled={busy} onClick={() => void submit(true)}>{busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Send size={17} />}{busy ? 'Enviando...' : 'Enviar levantamento'}</Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
