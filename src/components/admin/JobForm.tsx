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

const jobSchema = z.object({
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
});

export type JobFormValues = z.infer<typeof jobSchema>;

type JobFormProps = {
  job?: Job | null;
  companies: Company[];
  fixedCompanyId?: string;
  onSubmit: (values: JobFormValues) => Promise<void> | void;
  submitLabel?: string;
};

export function JobForm({ job, companies, fixedCompanyId, onSubmit, submitLabel = 'Salvar vaga' }: JobFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
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
    },
  });

  const title = watch('title');
  const slug = watch('slug');

  useEffect(() => {
    if (!job && title && !slug) {
      setValue('slug', slugify(title), { shouldValidate: true });
    }
  }, [job, setValue, slug, title]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
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
        <Input label="Cidade" {...register('city')} />
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
        <Input label="Faixa salarial base" placeholder="R$ 4.000,00 por mês" {...register('salary_range')} />
        <Input label="Jornada de trabalho" {...register('work_schedule')} />
        <Input label="Prazo de candidatura" type="date" {...register('application_deadline')} />
        <Select
          label="Status"
          {...register('status')}
          options={[
            { label: 'Rascunho', value: 'draft' },
            { label: 'Aberta', value: 'open' },
            { label: 'Pausada', value: 'paused' },
            { label: 'Encerrada', value: 'closed' },
            { label: 'Arquivada', value: 'archived' },
          ]}
        />
      </div>

      <Textarea label="Descrição curta" rows={3} {...register('short_description')} />
      <Textarea label="Sobre a vaga" {...register('about_job')} />
      <Textarea label="Benefícios" {...register('benefits')} />
      <Textarea label="Responsabilidades Da Posição" {...register('responsibilities')} />
      <Textarea label="Requisitos obrigatórios" {...register('requirements')} />
      <Textarea label="Requisitos desejáveis" {...register('desirable_requirements')} />
      <Textarea label="Sobre a Empresa" {...register('about_company')} />

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
