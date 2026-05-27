import { hasSupabaseConfig, supabase } from './supabase';

const allowedResumeTypes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const allowedExtensions = ['pdf', 'doc', 'docx'];
const maxResumeSize = 10 * 1024 * 1024;

export function validateResumeFile(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';

  if (!allowedResumeTypes.includes(file.type) && !allowedExtensions.includes(extension)) {
    return 'Envie um currículo em PDF, DOC ou DOCX.';
  }

  if (file.size > maxResumeSize) {
    return 'O currículo deve ter no máximo 10MB.';
  }

  return null;
}

export async function uploadResume(file: File, jobId: string) {
  const validationError = validateResumeFile(file);
  if (validationError) throw new Error(validationError);

  const extension = file.name.split('.').pop()?.toLowerCase() || 'pdf';
  const uniqueName =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const path = `applications/${jobId}/${uniqueName}.${extension}`;

  if (!hasSupabaseConfig || !supabase) {
    return path;
  }

  const { error } = await supabase.storage.from('resumes').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (error) throw error;
  return path;
}

export async function createResumeSignedUrl(path: string) {
  if (!hasSupabaseConfig || !supabase) {
    return '#';
  }

  const { data, error } = await supabase.storage.from('resumes').createSignedUrl(path, 60 * 10);
  if (error) throw error;
  return data.signedUrl;
}
