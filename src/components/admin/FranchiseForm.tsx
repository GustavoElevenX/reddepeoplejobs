import { zodResolver } from '@hookform/resolvers/zod';
import { Save } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { slugify } from '../../lib/slugify';
import type { Franchise } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';

const franchiseSchema = z.object({
  name: z.string().min(2, 'Informe o nome da unidade.'),
  slug: z.string().min(2, 'Informe o identificador da unidade.'),
  legal_name: z.string().optional(),
  document: z.string().optional(),
  contact_name: z.string().optional(),
  contact_email: z.string().email('Informe um e-mail válido.').optional().or(z.literal('')),
  contact_phone: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  status: z.enum(['active', 'inactive']),
  user_full_name: z.string().optional(),
  user_email: z.string().email('Informe um e-mail válido.').optional().or(z.literal('')),
  user_password: z.string().optional(),
});

export type FranchiseFormValues = z.infer<typeof franchiseSchema>;

type FranchiseFormProps = {
  franchise?: Franchise | null;
  onSubmit: (values: FranchiseFormValues) => Promise<void> | void;
};

export function FranchiseForm({ franchise, onSubmit }: FranchiseFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FranchiseFormValues>({
    resolver: zodResolver(franchiseSchema),
    defaultValues: {
      name: franchise?.name ?? '',
      slug: franchise?.slug ?? '',
      legal_name: franchise?.legal_name ?? '',
      document: franchise?.document ?? '',
      contact_name: franchise?.contact_name ?? '',
      contact_email: franchise?.contact_email ?? '',
      contact_phone: franchise?.contact_phone ?? '',
      city: franchise?.city ?? '',
      state: franchise?.state ?? 'MA',
      status: franchise?.status ?? 'active',
      user_full_name: '',
      user_email: '',
      user_password: '',
    },
  });

  const name = watch('name');
  const slug = watch('slug');

  useEffect(() => {
    if (!franchise && name && !slug) {
      setValue('slug', slugify(name), { shouldValidate: true });
    }
  }, [franchise, name, setValue, slug]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Nome da unidade" {...register('name')} error={errors.name?.message} />
        <Input label="Identificador" {...register('slug')} error={errors.slug?.message} />
        <Input label="Razão social" {...register('legal_name')} />
        <Input label="CNPJ/CPF" {...register('document')} />
        <Input label="Responsável" {...register('contact_name')} />
        <Input
          label="E-mail de contato"
          type="email"
          {...register('contact_email')}
          error={errors.contact_email?.message}
        />
        <Input label="Telefone" {...register('contact_phone')} />
        <Input label="Cidade" {...register('city')} />
        <Input label="Estado" {...register('state')} />
        <Select
          label="Status"
          {...register('status')}
          options={[
            { label: 'Ativo', value: 'active' },
            { label: 'Inativo', value: 'inactive' },
          ]}
        />
      </div>

      {!franchise ? (
        <section className="grid gap-4 rounded-xl border border-surface-200 bg-surface-50 p-4">
          <div>
            <h3 className="font-black text-ink-900">Acesso inicial do franqueado</h3>
            <p className="mt-1 text-sm text-ink-500">
              Opcional. Preencha para criar junto o primeiro usuário responsável pela unidade.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Nome do usuário" {...register('user_full_name')} />
            <Input
              label="E-mail de acesso"
              type="email"
              {...register('user_email')}
              error={errors.user_email?.message}
            />
            <Input
              label="Senha inicial"
              type="password"
              placeholder="Deixe vazio para gerar automaticamente"
              {...register('user_password')}
            />
          </div>
        </section>
      ) : null}

      <Button type="submit" disabled={isSubmitting}>
        <Save size={18} />
        {franchise ? 'Salvar franqueado' : 'Cadastrar franqueado'}
      </Button>
    </form>
  );
}
