import { zodResolver } from '@hookform/resolvers/zod';
import { Save } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { slugify } from '../../lib/slugify';
import type { Company } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';

const companySchema = z.object({
  name: z.string().min(2, 'Informe o nome da empresa.'),
  slug: z.string().min(2, 'Informe o slug.'),
  logo_url: z.string().optional(),
  cover_image_url: z.string().optional(),
  segment: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  employees_range: z.string().optional(),
  website_url: z.string().optional(),
  instagram_url: z.string().optional(),
  linkedin_url: z.string().optional(),
  short_description: z.string().optional(),
  about_text: z.string().optional(),
  why_work_here: z.string().optional(),
  culture_text: z.string().optional(),
  page_status: z.enum(['draft', 'published', 'archived']),
  is_featured: z.boolean(),
});

export type CompanyFormValues = z.infer<typeof companySchema>;

type CompanyFormProps = {
  company?: Company | null;
  onSubmit: (values: CompanyFormValues) => Promise<void> | void;
  submitLabel?: string;
};

export function CompanyForm({ company, onSubmit, submitLabel = 'Salvar empresa' }: CompanyFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: company?.name ?? '',
      slug: company?.slug ?? '',
      logo_url: company?.logo_url ?? '',
      cover_image_url: company?.cover_image_url ?? '',
      segment: company?.segment ?? '',
      city: company?.city ?? '',
      state: company?.state ?? 'MA',
      employees_range: company?.employees_range ?? '',
      website_url: company?.website_url ?? '',
      instagram_url: company?.instagram_url ?? '',
      linkedin_url: company?.linkedin_url ?? '',
      short_description: company?.short_description ?? '',
      about_text: company?.about_text ?? '',
      why_work_here: company?.why_work_here ?? '',
      culture_text: company?.culture_text ?? '',
      page_status: company?.page_status ?? 'draft',
      is_featured: company?.is_featured ?? false,
    },
  });

  const name = watch('name');
  const slug = watch('slug');

  useEffect(() => {
    if (!company && name && !slug) {
      setValue('slug', slugify(name), { shouldValidate: true });
    }
  }, [company, name, setValue, slug]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Nome" {...register('name')} error={errors.name?.message} />
        <Input label="Slug" {...register('slug')} error={errors.slug?.message} />
        <Input label="Logo URL" {...register('logo_url')} />
        <Input label="Banner URL" {...register('cover_image_url')} />
        <Input label="Segmento" {...register('segment')} />
        <Input label="Cidade" {...register('city')} />
        <Input label="Estado" {...register('state')} />
        <Input label="Tamanho da empresa" {...register('employees_range')} />
        <Input label="Site" {...register('website_url')} />
        <Input label="Instagram" {...register('instagram_url')} />
        <Input label="LinkedIn" {...register('linkedin_url')} />
        <Select
          label="Status da página"
          {...register('page_status')}
          options={[
            { label: 'Rascunho', value: 'draft' },
            { label: 'Publicada', value: 'published' },
            { label: 'Arquivada', value: 'archived' },
          ]}
        />
      </div>

      <Textarea label="Descrição curta" rows={3} {...register('short_description')} />
      <Textarea label="Sobre a empresa" {...register('about_text')} />
      <Textarea label="Por que trabalhar aqui?" {...register('why_work_here')} />
      <Textarea label="Cultura e ambiente" {...register('culture_text')} />

      <label className="flex items-center gap-3 rounded-lg bg-surface-50 p-3 text-sm font-semibold text-ink-700">
        <input type="checkbox" className="h-4 w-4 accent-redde-500" {...register('is_featured')} />
        Destacar empresa na home
      </label>

      <Button type="submit" disabled={isSubmitting}>
        <Save size={18} />
        {submitLabel}
      </Button>
    </form>
  );
}
