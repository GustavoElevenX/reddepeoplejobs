import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Send } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { createApplication } from '../../lib/data';
import { uploadResume, validateResumeFile } from '../../lib/storage';
import type { Job } from '../../types';
import { UploadField } from '../admin/UploadField';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';

const applicationSchema = z.object({
  name: z.string().min(3, 'Informe seu nome completo.'),
  email: z.string().email('Informe um e-mail válido.'),
  phone: z.string().min(10, 'Informe um WhatsApp válido.'),
  city: z.string().min(2, 'Informe sua cidade.'),
  linkedinUrl: z.string().url('Informe uma URL válida.').optional().or(z.literal('')),
  salaryExpectation: z.string().min(2, 'Informe sua pretensão salarial.'),
  availability: z.string().min(2, 'Informe sua disponibilidade de início.'),
  message: z.string().optional(),
  lgpdConsent: z.boolean().refine((value) => value, 'Você precisa aceitar os termos da LGPD.'),
});

type ApplicationFormValues = z.infer<typeof applicationSchema>;

export function getApplicationSource() {
  const params = new URLSearchParams(window.location.search);
  return params.get('utm_source') || params.get('source') || 'direct';
}

export function ApplicationForm({ job }: { job: Job }) {
  const navigate = useNavigate();
  const [resume, setResume] = useState<File | null>(null);
  const [resumeError, setResumeError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      city: '',
      linkedinUrl: '',
      salaryExpectation: '',
      availability: '',
      message: '',
      lgpdConsent: false,
    },
  });

  async function onSubmit(values: ApplicationFormValues) {
    setSubmitError('');
    setResumeError('');

    if (!resume) {
      setResumeError('Envie seu currículo em PDF, DOC ou DOCX.');
      return;
    }

    const fileError = validateResumeFile(resume);
    if (fileError) {
      setResumeError(fileError);
      return;
    }

    setIsSubmitting(true);
    try {
      const resumePath = await uploadResume(resume, job.id);
      await createApplication({
        franchise_id: job.franchise_id,
        job_id: job.id,
        company_id: job.company_id,
        candidate_name: values.name,
        candidate_email: values.email,
        candidate_phone: values.phone,
        candidate_city: values.city,
        linkedin_url: values.linkedinUrl || null,
        portfolio_url: null,
        salary_expectation: values.salaryExpectation || null,
        availability: values.availability || null,
        message: values.message || null,
        resume_file_path: resumePath,
        lgpd_consent: values.lgpdConsent,
        source: getApplicationSource(),
      });
      navigate('/candidatura/sucesso');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Não foi possível enviar o currículo. Verifique o arquivo e tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 rounded-2xl border border-surface-200 bg-white p-5 shadow-card">
      <div>
        <h2 className="text-2xl font-black text-ink-900">Candidatar-se</h2>
        <p className="mt-1 text-sm text-ink-500">Preencha seus dados e envie seu currículo. Não é necessário login.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Nome completo" {...register('name')} error={errors.name?.message} />
        <Input label="E-mail" type="email" {...register('email')} error={errors.email?.message} />
        <Input label="WhatsApp" {...register('phone')} error={errors.phone?.message} />
        <Input label="Cidade" {...register('city')} error={errors.city?.message} />
        <Input label="LinkedIn" {...register('linkedinUrl')} error={errors.linkedinUrl?.message} />
        <Input label="Pretensão salarial" {...register('salaryExpectation')} error={errors.salaryExpectation?.message} />
        <Input label="Disponibilidade de início" {...register('availability')} error={errors.availability?.message} />
      </div>

      <Textarea label="Mensagem para a empresa" {...register('message')} rows={4} />
      <UploadField
        label="Currículo"
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onFileChange={(file) => {
          setResume(file);
          setResumeError(file ? validateResumeFile(file) ?? '' : '');
        }}
        error={resumeError}
      />

      <label className="flex items-start gap-3 rounded-lg bg-surface-50 p-3 text-sm text-ink-500">
        <input type="checkbox" className="mt-1 h-4 w-4 accent-redde-500" {...register('lgpdConsent')} />
        <span>
          Aceito que meus dados sejam usados pelo People Jobs e pela empresa contratante para condução deste processo seletivo.
          {errors.lgpdConsent?.message ? (
            <span className="mt-1 block text-xs font-semibold text-redde-700">{errors.lgpdConsent.message}</span>
          ) : null}
        </span>
      </label>

      {submitError ? (
        <div className="rounded-lg bg-redde-50 px-4 py-3 text-sm font-semibold text-redde-700">{submitError}</div>
      ) : null}

      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
        Enviar candidatura
      </Button>
    </form>
  );
}
