import { Check, CheckCircle2, Copy, Route } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';

export function ApplicationSuccess() {
  const [params] = useSearchParams();
  const trackingToken = params.get('protocolo');
  const [copied, setCopied] = useState(false);

  async function copyTrackingLink() {
    if (!trackingToken) return;
    await navigator.clipboard.writeText(`${window.location.origin}/acompanhar/${trackingToken}`);
    setCopied(true);
  }

  return (
    <main className="bg-surface-50 py-16">
      <div className="container-page max-w-2xl text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-redde-50 text-redde-600">
          <CheckCircle2 size={34} />
        </div>
        <h1 className="mt-6 text-4xl font-black text-ink-900">Candidatura enviada com sucesso.</h1>
        <p className="mt-4 text-lg leading-8 text-ink-500">
          Seu currículo foi recebido. Você pode acompanhar cada avanço por um link seguro, sem criar uma conta.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {trackingToken ? (
            <>
              <Link to={`/acompanhar/${trackingToken}`} className="inline-flex">
                <Button size="lg"><Route size={18} />Acompanhar candidatura</Button>
              </Link>
              <Button type="button" size="lg" variant="secondary" onClick={() => void copyTrackingLink()}>
                {copied ? <Check size={18} /> : <Copy size={18} />}
                {copied ? 'Link copiado' : 'Copiar link seguro'}
              </Button>
            </>
          ) : null}
          <Link to="/vagas" className="inline-flex">
            <Button size="lg" variant="secondary">Ver outras vagas</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
