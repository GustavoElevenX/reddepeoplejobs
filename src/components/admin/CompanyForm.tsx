import { zodResolver } from '@hookform/resolvers/zod';
import { Image, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { slugify } from '../../lib/slugify';
import { validateCompanyImage, type CompanyAssetType } from '../../lib/storage';
import type { Company, Franchise } from '../../types';
import { UploadField } from './UploadField';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';

const companySchema = z.object({
  franchise_id: z.string().optional(),
  name: z.string().min(2, 'Informe o nome da empresa.'),
  slug: z.string().min(2, 'Informe o endereço da página.'),
  logo_url: z.string().optional(),
  cover_image_url: z.string().optional(),
  segment: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  employees_range: z.string().optional(),
  website_url: z.string().optional(),
  legal_name: z.string().optional(),
  same_as_url: z.string().optional(),
  instagram_url: z.string().optional(),
  linkedin_url: z.string().optional(),
  short_description: z.string().optional(),
  about_text: z.string().optional(),
  why_work_here: z.string().optional(),
  culture_text: z.string().optional(),
  commercial_status: z.enum(['lead', 'negotiation', 'active_client', 'inactive_client']),
  page_status: z.enum(['draft', 'published', 'archived']),
  is_featured: z.boolean(),
});

export type CompanyFormValues = z.infer<typeof companySchema>;
export type CompanyFormAssets = {
  logoFile: File | null;
  bannerFile: File | null;
};

type CompanyFormProps = {
  company?: Company | null;
  franchises?: Franchise[];
  fixedFranchiseId?: string;
  onSubmit: (values: CompanyFormValues, assets: CompanyFormAssets) => Promise<void> | void;
  submitLabel?: string;
};

export function CompanyForm({
  company,
  franchises,
  fixedFranchiseId,
  onSubmit,
  submitLabel = 'Salvar empresa',
}: CompanyFormProps) {
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [bannerPreview, setBannerPreview] = useState('');
  const [logoError, setLogoError] = useState('');
  const [bannerError, setBannerError] = useState('');
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      franchise_id: fixedFranchiseId ?? company?.franchise_id ?? '',
      name: company?.name ?? '',
      slug: company?.slug ?? '',
      logo_url: company?.logo_url ?? '',
      cover_image_url: company?.cover_image_url ?? '',
      segment: company?.segment ?? '',
      city: company?.city ?? '',
      state: company?.state ?? 'MA',
      employees_range: company?.employees_range ?? '',
      website_url: company?.website_url ?? '',
      legal_name: company?.legal_name ?? '',
      same_as_url: company?.same_as_url ?? '',
      instagram_url: company?.instagram_url ?? '',
      linkedin_url: company?.linkedin_url ?? '',
      short_description: company?.short_description ?? '',
      about_text: company?.about_text ?? '',
      why_work_here: company?.why_work_here ?? '',
      culture_text: company?.culture_text ?? '',
      commercial_status: company?.commercial_status ?? 'active_client',
      page_status: company?.page_status ?? 'draft',
      is_featured: company?.is_featured ?? false,
    },
  });

  const name = watch('name');
  const slug = watch('slug');
  const logoUrl = logoPreview || watch('logo_url');
  const bannerUrl = bannerPreview || watch('cover_image_url');

  useEffect(() => {
    if (!company && name && !slug) {
      setValue('slug', slugify(name), { shouldValidate: true });
    }
  }, [company, name, setValue, slug]);

  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
    };
  }, [logoPreview]);

  useEffect(() => {
    return () => {
      if (bannerPreview) URL.revokeObjectURL(bannerPreview);
    };
  }, [bannerPreview]);

  function setAssetPreview(assetType: CompanyAssetType, previewUrl: string) {
    if (assetType === 'logo') {
      setLogoPreview(previewUrl);
      return;
    }

    setBannerPreview(previewUrl);
  }

  function setAssetFile(assetType: CompanyAssetType, file: File | null) {
    if (assetType === 'logo') {
      setLogoFile(file);
      return;
    }

    setBannerFile(file);
  }

  function handleAssetSelection(file: File | null, assetType: CompanyAssetType) {
    const setError = assetType === 'logo' ? setLogoError : setBannerError;

    setError('');
    setAssetFile(assetType, null);

    if (!file) {
      setAssetPreview(assetType, '');
      return;
    }

    const validationError = validateCompanyImage(file, assetType);
    if (validationError) {
      setAssetPreview(assetType, '');
      setError(validationError);
      return;
    }

    setAssetFile(assetType, file);
    setAssetPreview(assetType, URL.createObjectURL(file));
  }

  function handleFormSubmit(values: CompanyFormValues) {
    if (!fixedFranchiseId && franchises && !values.franchise_id) {
      setError('franchise_id', { type: 'manual', message: 'Selecione o franqueado responsável.' });
      return;
    }
    return onSubmit(values, { logoFile, bannerFile });
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="grid gap-4">
      <input type="hidden" {...register('logo_url')} />
      <input type="hidden" {...register('cover_image_url')} />
      {fixedFranchiseId ? <input type="hidden" {...register('franchise_id')} /> : null}

      <div className="grid gap-4 md:grid-cols-2">
        {!fixedFranchiseId && franchises ? (
          <Select
            label="Franqueado responsável"
            {...register('franchise_id')}
            error={errors.franchise_id?.message}
            options={[
              { label: 'Selecione um franqueado', value: '' },
              ...franchises.map((franchise) => ({ label: franchise.name, value: franchise.id })),
            ]}
          />
        ) : null}
        <Input label="Nome" {...register('name')} error={errors.name?.message} />
        <Input
          label="Endereço da página"
          helperText="Esse texto será usado no endereço público. Exemplo: empresa-parceira"
          {...register('slug')}
          error={errors.slug?.message}
        />
        <Input label="Segmento" {...register('segment')} />
        <Input label="Cidade" {...register('city')} />
        <Input label="Estado" {...register('state')} />
        <Input label="Tamanho da empresa" {...register('employees_range')} />
        <Input label="Site" {...register('website_url')} />
        <Input label="Razão social" {...register('legal_name')} />
        <Input label="URL institucional para buscadores" {...register('same_as_url')} />
        <Input label="Instagram" {...register('instagram_url')} />
        <Input label="LinkedIn" {...register('linkedin_url')} />
        <Select
          label="Situação comercial"
          {...register('commercial_status')}
          options={[
            { label: 'Potencial cliente', value: 'lead' },
            { label: 'Em negociação', value: 'negotiation' },
            { label: 'Cliente ativo', value: 'active_client' },
            { label: 'Cliente inativo', value: 'inactive_client' },
          ]}
        />
        <Select
          label="Situação da página"
          {...register('page_status')}
          options={[
            { label: 'Rascunho', value: 'draft' },
            { label: 'Publicada', value: 'published' },
            { label: 'Arquivada', value: 'archived' },
          ]}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-3">
          <UploadField
            label="Logo da empresa"
            accept="image/png,image/jpeg,image/webp"
            hint="PNG, JPG, JPEG ou WEBP até 2MB"
            onFileChange={(file) => handleAssetSelection(file, 'logo')}
            error={logoError}
          />
          {logoUrl ? (
            <div className="flex h-28 items-center justify-center rounded-lg border border-surface-200 bg-surface-50 p-4">
              <img src={logoUrl} alt="Logo da empresa" className="max-h-20 max-w-full object-contain" />
            </div>
          ) : (
            <div className="flex h-28 items-center justify-center rounded-lg border border-dashed border-surface-200 bg-surface-50 text-ink-400">
              <Image size={28} />
            </div>
          )}
        </div>

        <div className="grid gap-3">
          <UploadField
            label="Banner da página da empresa"
            accept="image/png,image/jpeg,image/webp"
            hint="PNG, JPG, JPEG ou WEBP até 5MB"
            onFileChange={(file) => handleAssetSelection(file, 'banner')}
            error={bannerError}
          />
          {bannerUrl ? (
            <div className="h-28 overflow-hidden rounded-lg border border-surface-200 bg-surface-50">
              <img src={bannerUrl} alt="Banner da página da empresa" className="h-full w-full object-cover" />
            </div>
          ) : (
            <div className="flex h-28 items-center justify-center rounded-lg border border-dashed border-surface-200 bg-surface-50 text-ink-400">
              <Image size={28} />
            </div>
          )}
        </div>
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
