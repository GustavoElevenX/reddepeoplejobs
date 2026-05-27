import { CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';

export function ApplicationSuccess() {
  return (
    <main className="bg-surface-50 py-16">
      <div className="container-page max-w-2xl text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-redde-50 text-redde-600">
          <CheckCircle2 size={34} />
        </div>
        <h1 className="mt-6 text-4xl font-black text-ink-900">Candidatura enviada com sucesso.</h1>
        <p className="mt-4 text-lg leading-8 text-ink-500">
          Seu currículo foi recebido. Caso seu perfil avance no processo, a empresa ou a Redde People entrará em contato pelos dados informados.
        </p>
        <Link to="/vagas" className="mt-8 inline-flex">
          <Button size="lg">Ver outras vagas</Button>
        </Link>
      </div>
    </main>
  );
}
