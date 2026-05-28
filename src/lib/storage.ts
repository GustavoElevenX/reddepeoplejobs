import { hasSupabaseConfig, supabase } from './supabase';

const allowedResumeTypes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const allowedExtensions = ['pdf', 'doc', 'docx'];
const maxResumeSize = 10 * 1024 * 1024;
const allowedCompanyImageTypes = ['image/png', 'image/jpeg', 'image/webp'];
const allowedCompanyImageExtensions = ['png', 'jpg', 'jpeg', 'webp'];
const companyImageMaxSizes = {
  logo: 2 * 1024 * 1024,
  banner: 5 * 1024 * 1024,
};

export type CompanyAssetType = 'logo' | 'banner';

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

export function validateCompanyImage(file: File, type: CompanyAssetType) {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';

  if (!allowedCompanyImageTypes.includes(file.type) && !allowedCompanyImageExtensions.includes(extension)) {
    return 'Envie uma imagem em PNG, JPG, JPEG ou WEBP.';
  }

  if (file.size > companyImageMaxSizes[type]) {
    return type === 'logo' ? 'A logo deve ter no máximo 2MB.' : 'O banner deve ter no máximo 5MB.';
  }

  return null;
}

export async function uploadCompanyAsset(file: File, companyId: string, assetType: CompanyAssetType) {
  const validationError = validateCompanyImage(file, assetType);
  if (validationError) throw new Error(validationError);

  const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
  const uniqueName =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const path = `${companyId}/${assetType}/${uniqueName}.${extension}`;

  if (!hasSupabaseConfig || !supabase) {
    return `/imagens/clientes/${file.name}`;
  }

  const { error } = await supabase.storage.from('company-assets').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (error) throw error;

  const { data } = supabase.storage.from('company-assets').getPublicUrl(path);
  return data.publicUrl;
}
