import { useEffect, useState } from 'react';
import { CompanyForm, type CompanyFormAssets, type CompanyFormValues } from '../../components/admin/CompanyForm';
import { EmptyState } from '../../components/public/EmptyState';
import { LoadingState } from '../../components/public/LoadingState';
import { Card } from '../../components/ui/Card';
import { getCompanyAccessForCurrentUser } from '../../lib/auth';
import { getCompanyById, updateCompanyImages, upsertCompany } from '../../lib/data';
import { toCompanyPayload } from '../../lib/formPayloads';
import { uploadCompanyAsset } from '../../lib/storage';
import type { Company, CompanyUserAccess } from '../../types';

export function CompanyProfileEditor() {
  const [access, setAccess] = useState<CompanyUserAccess | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const accessData = await getCompanyAccessForCurrentUser();
    setAccess(accessData);
    if (accessData) setCompany(await getCompanyById(accessData.company_id));
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleSave(values: CompanyFormValues, assets: CompanyFormAssets) {
    if (!company || !access?.can_edit_company_page) return;
    let saved = await upsertCompany(toCompanyPayload(values, company));
    const imageUpdates: Partial<Pick<Company, 'logo_url' | 'cover_image_url'>> = {};

    if (assets.logoFile) {
      imageUpdates.logo_url = await uploadCompanyAsset(assets.logoFile, saved.id, 'logo');
    }

    if (assets.bannerFile) {
      imageUpdates.cover_image_url = await uploadCompanyAsset(assets.bannerFile, saved.id, 'banner');
    }

    if (Object.keys(imageUpdates).length > 0) {
      saved = await updateCompanyImages(saved.id, imageUpdates);
    }

    setCompany(saved);
  }

  if (loading) return <LoadingState label="Carregando perfil da empresa..." />;
  if (!access || !company) return <EmptyState title="Nenhuma empresa vinculada ao seu usuário." />;
  if (!access.can_edit_company_page) {
    return <EmptyState title="Seu usuário não tem permissão para editar a página pública da empresa." />;
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-black text-ink-900">Perfil público da empresa</h1>
        <p className="mt-2 text-ink-500">Edite logo, banner, textos institucionais e links sociais.</p>
      </div>
      <Card className="p-5">
        <CompanyForm company={company} onSubmit={handleSave} submitLabel="Salvar perfil público" />
      </Card>
    </div>
  );
}
