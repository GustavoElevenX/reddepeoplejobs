import { useEffect } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { Footer } from '../components/layout/Footer';
import { PublicHeader } from '../components/layout/PublicHeader';
import { CompanyDashboard } from '../pages/admin/CompanyDashboard';
import { CompanyProfileEditor } from '../pages/admin/CompanyProfileEditor';
import { FranchiseCompanies } from '../pages/admin/FranchiseCompanies';
import { FranchiseDashboard } from '../pages/admin/FranchiseDashboard';
import { FranchiseProjectDetail } from '../pages/admin/FranchiseProjectDetail';
import { FranchiseWorkspace } from '../pages/admin/FranchiseWorkspace';
import { MasterFranchises } from '../pages/admin/MasterFranchises';
import { AdminRouter } from '../pages/admin/AdminRouter';
import { Login } from '../pages/admin/Login';
import { ReddeCompanies } from '../pages/admin/ReddeCompanies';
import { ReddeCompanyEditor } from '../pages/admin/ReddeCompanyEditor';
import { ReddeDashboard } from '../pages/admin/ReddeDashboard';
import { ReddeUsers } from '../pages/admin/ReddeUsers';
import { ProcessDetail } from '../pages/admin/ProcessDetail';
import { Processes } from '../pages/admin/Processes';
import { ApplicationSuccess } from '../pages/public/ApplicationSuccess';
import { ApplicationTracking } from '../pages/public/ApplicationTracking';
import { CandidateConfirmation } from '../pages/public/CandidateConfirmation';
import { ClientPortal } from '../pages/public/ClientPortal';
import { Companies } from '../pages/public/Companies';
import { CompanyDetail } from '../pages/public/CompanyDetail';
import { Home } from '../pages/public/Home';
import { JobDetail } from '../pages/public/JobDetail';
import { Jobs } from '../pages/public/Jobs';
import { PublicBriefing } from '../pages/public/PublicBriefing';
import { ProtectedRoute } from './ProtectedRoute';

function PublicLayout() {
  const { pathname } = useLocation();
  const isHome = pathname === '/';

  return (
    <div className="min-h-screen bg-surface-50">
      <PublicHeader />
      <div className={isHome ? '' : 'pt-16'}>
        <Outlet />
      </div>
      <Footer />
    </div>
  );
}

function LegacyCompanyRedirect() {
  const { id } = useParams();
  return <Navigate to={id ? `/admin/master/empresas/${id}` : '/admin/master/empresas'} replace />;
}

function LegacyProcessRedirect({ scope }: { scope: 'master' | 'franchise' | 'company' }) {
  const { id } = useParams();
  const basePath =
    scope === 'master' ? '/admin/processos' : scope === 'franchise' ? '/franqueado/processos' : '/empresa/processos';
  return <Navigate to={id ? `${basePath}/${id}` : basePath} replace />;
}

function HashScroll() {
  const { hash, pathname } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const scrollToHash = () => {
      const element = document.querySelector(hash);
      if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    scrollToHash();
    const timeoutId = window.setTimeout(scrollToHash, 100);
    return () => window.clearTimeout(timeoutId);
  }, [hash, pathname]);

  return null;
}

export function AppRoutes() {
  return (
    <>
      <HashScroll />
      <Routes>
        <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/empresas" element={<Companies />} />
        <Route path="/empresa/:slug" element={<CompanyDetail />} />
        <Route path="/vagas" element={<Jobs />} />
        <Route path="/empresa/:companySlug/vagas/:jobSlug" element={<JobDetail />} />
        <Route path="/candidatura/sucesso" element={<ApplicationSuccess />} />
        <Route path="/acompanhar/:token" element={<ApplicationTracking />} />
        <Route path="/briefing/:token" element={<PublicBriefing />} />
        <Route path="/portal-cliente/:token" element={<ClientPortal />} />
        <Route path="/confirmar-presenca/:token" element={<CandidateConfirmation />} />
      </Route>

      <Route path="/admin/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/admin" element={<AdminRouter />} />
      </Route>

      <Route element={<ProtectedRoute roles={['admin_master', 'redde_super_admin', 'redde_admin']} />}>
        <Route path="/admin/master" element={<ReddeDashboard />} />
        <Route path="/admin/master/franqueados" element={<MasterFranchises />} />
        <Route path="/admin/master/empresas" element={<ReddeCompanies />} />
        <Route path="/admin/master/empresas/:id" element={<ReddeCompanyEditor />} />
        <Route path="/admin/processos" element={<Processes scope="master" />} />
        <Route path="/admin/processos/:id" element={<ProcessDetail scope="master" />} />
        <Route path="/admin/master/processos" element={<Navigate to="/admin/processos" replace />} />
        <Route path="/admin/master/processos/:id" element={<LegacyProcessRedirect scope="master" />} />
        <Route path="/admin/master/vagas" element={<Navigate to="/admin/processos" replace />} />
        <Route path="/admin/master/candidatos" element={<Navigate to="/admin/processos" replace />} />
        <Route path="/admin/master/usuarios" element={<ReddeUsers />} />
        <Route path="/admin/geral" element={<Navigate to="/admin/master" replace />} />
        <Route path="/admin/geral/empresas" element={<Navigate to="/admin/master/empresas" replace />} />
        <Route path="/admin/geral/empresas/:id" element={<LegacyCompanyRedirect />} />
        <Route path="/admin/geral/vagas" element={<Navigate to="/admin/master/vagas" replace />} />
        <Route path="/admin/geral/candidaturas" element={<Navigate to="/admin/master/candidatos" replace />} />
        <Route path="/admin/geral/usuarios" element={<Navigate to="/admin/master/usuarios" replace />} />
        <Route path="/admin/redde" element={<Navigate to="/admin/master" replace />} />
        <Route path="/admin/redde/empresas" element={<Navigate to="/admin/master/empresas" replace />} />
        <Route path="/admin/redde/empresas/:id" element={<LegacyCompanyRedirect />} />
        <Route path="/admin/redde/vagas" element={<Navigate to="/admin/master/vagas" replace />} />
        <Route path="/admin/redde/candidaturas" element={<Navigate to="/admin/master/candidatos" replace />} />
        <Route path="/admin/redde/usuarios" element={<Navigate to="/admin/master/usuarios" replace />} />
      </Route>

      <Route element={<ProtectedRoute roles={['franqueado']} />}>
        <Route path="/admin/franqueado" element={<FranchiseWorkspace />} />
        <Route path="/admin/franqueado/legado" element={<FranchiseDashboard />} />
        <Route path="/admin/franqueado/empresas" element={<FranchiseCompanies />} />
        <Route path="/admin/franqueado/projetos/:projectId" element={<FranchiseProjectDetail />} />
        <Route path="/admin/franqueado/:moduleKey" element={<FranchiseWorkspace />} />
        <Route path="/franqueado/processos" element={<Processes scope="franchise" />} />
        <Route path="/franqueado/processos/:id" element={<ProcessDetail scope="franchise" />} />
        <Route path="/admin/franqueado/processos" element={<Navigate to="/franqueado/processos" replace />} />
      </Route>

      <Route element={<ProtectedRoute roles={['empresa_cliente', 'company_admin', 'company_recruiter']} />}>
        <Route path="/admin/empresa" element={<CompanyDashboard />} />
        <Route path="/admin/empresa/perfil" element={<CompanyProfileEditor />} />
        <Route path="/empresa/processos" element={<Processes scope="company" />} />
        <Route path="/empresa/processos/:id" element={<ProcessDetail scope="company" />} />
        <Route path="/admin/empresa/processos" element={<Navigate to="/empresa/processos" replace />} />
        <Route path="/admin/empresa/vagas" element={<Navigate to="/empresa/processos" replace />} />
        <Route path="/admin/empresa/candidaturas" element={<Navigate to="/empresa/processos" replace />} />
      </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
