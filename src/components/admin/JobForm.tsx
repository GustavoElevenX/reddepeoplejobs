import { zodResolver } from '@hookform/resolvers/zod';
import { Save } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { slugify } from '../../lib/slugify';
import type { Company, Job } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';

const optionalUrl = z.string().url('Informe uma URL válida.').optional().or(z.literal(''));

const jobSchema = z
  .object({
    company_id: z.string().min(1, 'Selecione uma empresa.'),
    title: z.string().min(3, 'Informe o título da vaga.'),
    slug: z.string().min(2, 'Informe o endereço da vaga.'),
    short_description: z.string().optional(),
    description: z.string().optional(),
    about_job: z.string().optional(),
    responsibilities: z.string().optional(),
    requirements: z.string().optional(),
    desirable_requirements: z.string().optional(),
    benefits: z.string().optional(),
    education_level: z.string().optional(),
    work_schedule: z.string().optional(),
    about_company: z.string().optional(),
    neighborhood: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    modality: z.enum(['presencial', 'hibrido', 'remoto']),
    contract_type: z.enum(['clt', 'pj', 'estagio', 'temporario', 'freelancer', 'outro']),
    seniority: z.string().optional(),
    salary_range: z.string().optional(),
    application_deadline: z.string().optional(),
    status: z.enum(['draft', 'open', 'paused', 'closed', 'archived']),
    is_featured: z.boolean(),
    published_at: z.string().optional(),
    expires_at: z.string().optional(),
    distribution_google_enabled: z.boolean(),
    distribution_indeed_enabled: z.boolean(),
    distribution_glassdoor_enabled: z.boolean(),
    distribution_infojobs_enabled: z.boolean(),
    external_apply_url: optionalUrl,
    direct_apply: z.boolean(),
    country: z.string().optional(),
    street_address: z.string().optional(),
    postal_code: z.string().optional(),
    salary_min: z.string().optional(),
    salary_max: z.string().optional(),
    salary_currency: z.string().optional(),
    salary_unit: z.string().optional(),
    seo_title: z.string().optional(),
    seo_description: z.string().optional(),
    responsible_name: z.string().optional(),
    open_positions: z.number().int().min(1),
    approved_positions: z.number().int().min(0),
    process_status: z.enum(['draft', 'in_progress', 'paused', 'completed', 'cancelled']),
    internal_notes: z.string().optional(),
  })
  .superRefine((values, context) => {
    const salaryMin = values.salary_min ? Number(values.salary_min) : null;
    const salaryMax = values.salary_max ? Number(values.salary_max) : null;

    if (salaryMin !== null && salaryMax !== null && salaryMin > salaryMax) {
      context.addIssue({
        code: 'custom',
        path: ['salary_max'],
        message: 'O salário máximo deve ser maior ou igual ao mínimo.',
      });
    }

    if (!values.direct_apply && !values.external_apply_url?.trim()) {
      context.addIssue({
        code: 'custom',
        path: ['external_apply_url'],
        message: 'Informe o link externo quando a candidatura direta estiver desativada.',
      });
    }

    const distributionEnabled =
      values.distribution_google_enabled ||
      values.distribution_indeed_enabled ||
      values.distribution_glassdoor_enabled ||
      values.distribution_infojobs_enabled;

    if (!distributionEnabled || values.status !== 'open') return;

    if (values.distribution_indeed_enabled || values.distribution_glassdoor_enabled) {
      const titleContainsCity =
        values.city?.trim() && values.title.toLowerCase().includes(values.city.trim().toLowerCase());
      const titleContainsSalaryOrEmoji = /R\$|\p{Extended_Pictographic}/u.test(values.title);

      if (titleContainsCity || titleContainsSalaryOrEmoji) {
        context.addIssue({
          code: 'custom',
          path: ['title'],
          message: 'Para Indeed/Glassdoor, use apenas o nome do cargo, sem cidade, salário ou emojis.',
        });
      }
    }

    const hasDescription = [
      values.description,
      values.short_description,
      values.about_job,
      values.responsibilities,
      values.requirements,
    ].some((value) => value?.trim());

    if (!hasDescription) {
      context.addIssue({
        code: 'custom',
        path: ['about_job'],
        message: 'Informe uma descrição antes de ativar a distribuição.',
      });
    }

    if (values.modality !== 'remoto' && (!values.city?.trim() || !values.state?.trim())) {
      context.addIssue({
        code: 'custom',
        path: ['city'],
        message: 'Informe cidade e estado, ou selecione a modalidade remota.',
      });
    }

  });

export type JobFormValues = z.infer<typeof jobSchema>;

type JobFormProps = {
  job?: Job | null;
  companies: Company[];
  fixedCompanyId?: string;
  onSubmit: (values: JobFormValues) => Promise<void> | void;
  submitLabel?: string;
};

function toDateTimeLocal(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function JobForm({ job, companies, fixedCompanyId, onSubmit, submitLabel = 'Salvar vaga' }: JobFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<JobFormValues>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      company_id: fixedCompanyId ?? job?.company_id ?? '',
      title: job?.title ?? '',
      slug: job?.slug ?? '',
      short_description: job?.short_description ?? '',
      description: job?.description ?? '',
      about_job: job?.about_job ?? '',
      responsibilities: job?.responsibilities ?? '',
      requirements: job?.requirements ?? '',
      desirable_requirements: job?.desirable_requirements ?? '',
      benefits: job?.benefits ?? '',
      education_level: job?.education_level ?? '',
      work_schedule: job?.work_schedule ?? '',
      about_company: job?.about_company ?? job?.company?.about_text ?? '',
      neighborhood: job?.neighborhood ?? '',
      city: job?.city ?? '',
      state: job?.state ?? 'MA',
      modality: job?.modality ?? 'presencial',
      contract_type: job?.contract_type ?? 'clt',
      seniority: job?.seniority ?? '',
      salary_range: job?.salary_range ?? '',
      application_deadline: job?.application_deadline ?? '',
      status: job?.status ?? 'draft',
      is_featured: job?.is_featured ?? false,
      published_at: toDateTimeLocal(job?.published_at),
      expires_at: toDateTimeLocal(job?.expires_at),
      distribution_google_enabled: job?.distribution_google_enabled ?? true,
      distribution_indeed_enabled: job?.distribution_indeed_enabled ?? false,
      distribution_glassdoor_enabled: job?.distribution_glassdoor_enabled ?? false,
      distribution_infojobs_enabled: job?.distribution_infojobs_enabled ?? false,
      external_apply_url: job?.external_apply_url ?? '',
      direct_apply: job?.direct_apply ?? true,
      country: job?.country ?? 'BR',
      street_address: job?.street_address ?? '',
      postal_code: job?.postal_code ?? '',
      salary_min: job?.salary_min?.toString() ?? '',
      salary_max: job?.salary_max?.toString() ?? '',
      salary_currency: job?.salary_currency ?? 'BRL',
      salary_unit: job?.salary_unit ?? 'MONTH',
      seo_title: job?.seo_title ?? '',
      seo_description: job?.seo_description ?? '',
      responsible_name: job?.responsible_name ?? '',
      open_positions: job?.open_positions ?? 1,
      approved_positions: job?.approved_positions ?? 0,
      process_status: job?.process_status ?? 'in_progress',
      internal_notes: job?.internal_notes ?? '',
    },
  });

  const title = watch('title');
  const slug = watch('slug');

  useEffect(() => {
    if (!job && title && !slug) {
      setValue('slug', slugify(title), { shouldValidate: true });
    }
  }, [job, setValue, slug, title]);

  async function handleFormSubmit(values: JobFormValues) {
    const distributionEnabled =
      values.distribution_google_enabled ||
      values.distribution_indeed_enabled ||
      values.distribution_glassdoor_enabled ||
      values.distribution_infojobs_enabled;
    const selectedCompany = companies.find((company) => company.id === values.company_id);

    if (values.status === 'open' && distributionEnabled && selectedCompany?.page_status !== 'published') {
      setError('company_id', {
        type: 'manual',
        message: 'Publique a página da empresa antes de distribuir a vaga.',
      });
      return;
    }

    clearErrors('company_id');
    const nextValues = { ...values };

    if (nextValues.status === 'open' && !nextValues.published_at) {
      nextValues.published_at = new Date().toISOString();
    }

    if (nextValues.status === 'open' && !nextValues.expires_at) {
      if (nextValues.application_deadline) {
        nextValues.expires_at = `${nextValues.application_deadline}T23:59:59-03:00`;
      } else {
        const publishedAt = new Date(nextValues.published_at || Date.now());
        nextValues.expires_at = new Date(publishedAt.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      }
    }

    await onSubmit(nextValues);
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="grid gap-4">
      <input type="hidden" {...register('description')} />

      <div className="grid gap-4 md:grid-cols-2">
        <Select
          label="Empresa"
          disabled={Boolean(fixedCompanyId)}
          {...register('company_id')}
          error={errors.company_id?.message}
          options={[
            { label: 'Selecione uma empresa', value: '' },
            ...companies.map((company) => ({ label: company.name, value: company.id })),
          ]}
        />
        <Input label="Cargo de divulgação" {...register('title')} error={errors.title?.message} />
        <Input
          label="Endereço da vaga"
          helperText="Esse texto será usado no link da vaga. Exemplo: auxiliar-administrativo"
          {...register('slug')}
          error={errors.slug?.message}
        />
        <Input label="Bairro" {...register('neighborhood')} />
        <Input label="Cidade" {...register('city')} error={errors.city?.message} />
        <Input label="Estado" {...register('state')} />
        <Select
          label="Modalidade"
          {...register('modality')}
          options={[
            { label: 'Presencial', value: 'presencial' },
            { label: 'Híbrido', value: 'hibrido' },
            { label: 'Remoto', value: 'remoto' },
          ]}
        />
        <Select
          label="Tipo de contrato"
          {...register('contract_type')}
          options={[
            { label: 'CLT', value: 'clt' },
            { label: 'PJ', value: 'pj' },
            { label: 'Estágio', value: 'estagio' },
            { label: 'Temporário', value: 'temporario' },
            { label: 'Freelancer', value: 'freelancer' },
            { label: 'Outro', value: 'outro' },
          ]}
        />
        <Input label="Nível" {...register('seniority')} />
        <Input label="Escolaridade" {...register('education_level')} />
        <Input label="Faixa salarial exibida" placeholder="R$ 4.000,00 por mês" {...register('salary_range')} />
        <Input label="Jornada de trabalho" {...register('work_schedule')} />
        <Input label="Prazo de candidatura" type="date" {...register('application_deadline')} />
        <Select
          label="Status"
          {...register('status')}
          error={errors.status?.message}
          options={[
            { label: 'Rascunho', value: 'draft' },
            { label: 'Aberta', value: 'open' },
            { label: 'Pausada', value: 'paused' },
            { label: 'Encerrada', value: 'closed' },
            { label: 'Arquivada', value: 'archived' },
          ]}
        />
        <Input label="Responsável pelo processo" {...register('responsible_name')} />
        <Input label="Vagas abertas" type="number" min="1" {...register('open_positions', { valueAsNumber: true })} />
        <Input
          label="Vagas aprovadas/preenchidas"
          type="number"
          min="0"
          {...register('approved_positions', { valueAsNumber: true })}
        />
        <Select
          label="Status do processo seletivo"
          {...register('process_status')}
          options={[
            { label: 'Em preparação', value: 'draft' },
            { label: 'Em andamento', value: 'in_progress' },
            { label: 'Pausado', value: 'paused' },
            { label: 'Concluído', value: 'completed' },
            { label: 'Cancelado', value: 'cancelled' },
          ]}
        />
      </div>

      <Textarea label="Descrição curta" rows={3} {...register('short_description')} />
      <Textarea label="Sobre a vaga" {...register('about_job')} error={errors.about_job?.message} />
      <Textarea label="Benefícios" {...register('benefits')} />
      <Textarea label="Responsabilidades da posição" {...register('responsibilities')} />
      <Textarea label="Requisitos obrigatórios" {...register('requirements')} />
      <Textarea label="Requisitos desejáveis" {...register('desirable_requirements')} />
      <Textarea label="Sobre a empresa" {...register('about_company')} />
      <Textarea
        label="Observações internas do processo"
        placeholder="Visível apenas no painel administrativo."
        {...register('internal_notes')}
      />

      <section className="grid gap-4 rounded-xl border border-surface-200 bg-surface-50 p-4">
        <div>
          <h2 className="text-lg font-black text-ink-900">Distribuição da vaga</h2>
          <p className="mt-1 text-sm text-ink-500">
            Prepare a vaga para Google for Jobs e para os fluxos externos sujeitos à aprovação dos portais.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {[
            ['distribution_google_enabled', 'Publicar no Google for Jobs'],
            ['distribution_indeed_enabled', 'Preparar para Indeed'],
            ['distribution_glassdoor_enabled', 'Preparar para Glassdoor'],
            ['distribution_infojobs_enabled', 'Preparar para InfoJobs'],
          ].map(([field, label]) => (
            <label key={field} className="flex items-center gap-3 rounded-lg bg-white p-3 text-sm font-semibold text-ink-700">
              <input
                type="checkbox"
                className="h-4 w-4 accent-redde-500"
                {...register(field as keyof JobFormValues)}
              />
              {label}
            </label>
          ))}
        </div>

        <label className="flex items-center gap-3 rounded-lg bg-white p-3 text-sm font-semibold text-ink-700">
          <input type="checkbox" className="h-4 w-4 accent-redde-500" {...register('direct_apply')} />
          Candidatura direta pela Redde People Jobs
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Link externo de candidatura"
            placeholder="https://..."
            {...register('external_apply_url')}
            error={errors.external_apply_url?.message}
          />
          <Input label="Data de publicação" type="datetime-local" {...register('published_at')} />
          <Input label="Data de validade" type="datetime-local" {...register('expires_at')} />
          <Input label="País" {...register('country')} />
          <Input label="Endereço" {...register('street_address')} />
          <Input label="CEP" {...register('postal_code')} />
          <Input label="Salário mínimo" type="number" min="0" step="0.01" {...register('salary_min')} />
          <Input
            label="Salário máximo"
            type="number"
            min="0"
            step="0.01"
            {...register('salary_max')}
            error={errors.salary_max?.message}
          />
          <Input label="Moeda" placeholder="BRL" {...register('salary_currency')} />
          <Select
            label="Unidade salarial"
            {...register('salary_unit')}
            options={[
              { label: 'Por mês', value: 'MONTH' },
              { label: 'Por hora', value: 'HOUR' },
              { label: 'Por dia', value: 'DAY' },
              { label: 'Por semana', value: 'WEEK' },
              { label: 'Por ano', value: 'YEAR' },
            ]}
          />
        </div>

        <Input label="SEO title" {...register('seo_title')} />
        <Textarea label="SEO description" rows={3} {...register('seo_description')} />
      </section>

      <label className="flex items-center gap-3 rounded-lg bg-surface-50 p-3 text-sm font-semibold text-ink-700">
        <input type="checkbox" className="h-4 w-4 accent-redde-500" {...register('is_featured')} />
        Destacar vaga
      </label>

      <Button type="submit" disabled={isSubmitting}>
        <Save size={18} />
        {submitLabel}
      </Button>
    </form>
  );
}
