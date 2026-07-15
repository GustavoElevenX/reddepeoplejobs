import { CheckCircle2, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { EmptyState } from '../../components/public/EmptyState';
import { LoadingState } from '../../components/public/LoadingState';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { getPublicBriefing, saveBriefing, type BriefingPayload, type JobBriefing } from '../../lib/franchiseOps';

export function PublicBriefing() {
  const { token } = useParams();
  const [briefing, setBriefing] = useState<JobBriefing | null>(null);
  const [form, setForm] = useState<BriefingPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    if (!token) {
      setLoading(false);
      return;
    }
    async function load() {
      try {
        const data = await getPublicBriefing(token!);
        if (!isMounted) return;
        setBriefing(data);
        setForm(data?.payload ?? null);
      } catch (loadError) {
        if (isMounted) setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void load();
    return () => {
      isMounted = false;
    };
  }, [token]);

  if (loading) return <LoadingState label="Carregando briefing..." />;
  if (!token || !briefing || !form) return <EmptyState title="Link de briefing inválido ou expirado." />;

  const update = (key: keyof BriefingPayload, value: string) => setForm({ ...form, [key]: value });

  async function submit(approve: boolean) {
    setError('');
    try {
      const updated = await saveBriefing(token!, form!, approve ? 'filled' : 'in_progress', 'client');
      setBriefing(updated);
      setSaved(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Não foi possível salvar.');
    }
  }

  return (
    <main className="bg-surface-50 py-10">
      <div className="container-page">
        <Card className="p-6">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-redde-700">Recruitify</p>
          <h1 className="mt-2 text-3xl font-black text-ink-900">Briefing da vaga</h1>
          <p className="mt-2 text-ink-500">Preencha ou revise os dados para a equipe gerar a descrição da vaga.</p>

          {saved ? (
            <div className="mt-5 rounded-lg bg-redde-50 px-4 py-3 text-sm font-semibold text-redde-700">
              Briefing salvo com sucesso.
            </div>
          ) : null}
          {error ? <div className="mt-5 rounded-lg bg-redde-50 px-4 py-3 text-sm font-semibold text-redde-700">{error}</div> : null}

          <form className="mt-6 grid gap-4" onSubmit={(event) => event.preventDefault()}>
            <div className="grid gap-4 md:grid-cols-2">
              {[
                ['companyName', 'Empresa'],
                ['document', 'CNPJ'],
                ['contactName', 'Responsável'],
                ['contactEmail', 'E-mail'],
                ['contactPhone', 'WhatsApp'],
                ['segment', 'Segmento'],
                ['workLocation', 'Local de trabalho'],
                ['title', 'Título da vaga'],
                ['positions', 'Quantidade de vagas'],
                ['department', 'Setor'],
                ['managerName', 'Gestor responsável'],
                ['cityNeighborhood', 'Cidade/bairro'],
                ['schedule', 'Jornada e horário'],
                ['salary', 'Salário'],
                ['benefits', 'Benefícios'],
                ['desiredStartDate', 'Data desejada de início'],
                ['education', 'Escolaridade'],
                ['minimumExperience', 'Experiência mínima'],
                ['companyInterviewers', 'Quem entrevista na empresa'],
                ['interviewAvailability', 'Disponibilidade para entrevistas'],
                ['requiredDocuments', 'Documentos exigidos'],
              ].map(([key, label]) => (
                <Input
                  key={key}
                  label={label}
                  value={String(form[key as keyof BriefingPayload] ?? '')}
                  onChange={(event) => update(key as keyof BriefingPayload, event.target.value)}
                />
              ))}
              <Select
                label="Tipo de contratação"
                value={form.contractType}
                onChange={(event) => update('contractType', event.target.value)}
                options={[
                  { label: 'CLT', value: 'clt' },
                  { label: 'PJ', value: 'pj' },
                  { label: 'Estágio', value: 'estagio' },
                  { label: 'Temporário', value: 'temporario' },
                  { label: 'Freelancer', value: 'freelancer' },
                  { label: 'Outro', value: 'outro' },
                ]}
              />
              <Select
                label="Modalidade"
                value={form.modality}
                onChange={(event) => update('modality', event.target.value)}
                options={[
                  { label: 'Presencial', value: 'presencial' },
                  { label: 'Híbrida', value: 'hibrido' },
                  { label: 'Remota', value: 'remoto' },
                ]}
              />
            </div>
            {[
              ['hiringReason', 'Motivo da contratação'],
              ['mandatoryRequirements', 'Requisitos obrigatórios'],
              ['desirableRequirements', 'Requisitos desejáveis'],
              ['technicalSkills', 'Competências técnicas'],
              ['behavioralSkills', 'Competências comportamentais'],
              ['profileNotes', 'Observações sobre perfil'],
              ['responsibilities', 'Principais responsabilidades'],
              ['routine', 'Rotina do cargo'],
              ['goals', 'Metas esperadas'],
              ['challenges', 'Desafios da função'],
              ['successCriteria', 'Critérios de sucesso'],
              ['selectionSteps', 'Etapas previstas'],
              ['additionalNotes', 'Observações adicionais'],
            ].map(([key, label]) => (
              <Textarea
                key={key}
                label={label}
                rows={3}
                value={String(form[key as keyof BriefingPayload] ?? '')}
                onChange={(event) => update(key as keyof BriefingPayload, event.target.value)}
              />
            ))}
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={() => submit(false)}>
                <Save size={18} />
                Salvar e continuar depois
              </Button>
              <Button type="button" onClick={() => submit(true)}>
                <CheckCircle2 size={18} />
                Enviar briefing
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </main>
  );
}
