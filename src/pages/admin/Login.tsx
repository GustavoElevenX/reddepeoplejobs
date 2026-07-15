import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, LockKeyhole } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { getAdminRedirectPath, signIn } from '../../lib/auth';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';

const loginSchema = z.object({
  email: z.string().email('Informe um e-mail válido.'),
  password: z.string().min(1, 'Informe a senha.'),
});

type LoginValues = z.infer<typeof loginSchema>;

export function Login() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: LoginValues) {
    setError('');
    try {
      const profile = await signIn(values.email, values.password);
      navigate(getAdminRedirectPath(profile));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível entrar. Verifique seus dados.');
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-surface-50 px-4 py-10">
      <Card className="w-full max-w-md p-6">
        <Link to="/" className="mb-6 inline-flex text-sm font-bold text-redde-600">
          Voltar ao portal
        </Link>
        <div className="mb-6">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-redde-50 text-redde-600">
            <LockKeyhole size={23} />
          </span>
          <h1 className="mt-4 text-3xl font-black text-ink-900">Acesso à plataforma</h1>
          <p className="mt-2 text-sm leading-6 text-ink-500">
            Plataforma Recruitify para gestão de recrutamento, seleção e operação dos franqueados.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          <Input label="E-mail" type="email" {...register('email')} error={errors.email?.message} />
          <Input label="Senha" type="password" {...register('password')} error={errors.password?.message} />
          {error ? <div className="rounded-lg bg-redde-50 p-3 text-sm font-semibold text-redde-700">{error}</div> : null}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : null}
            Entrar
          </Button>
        </form>
      </Card>
    </main>
  );
}
