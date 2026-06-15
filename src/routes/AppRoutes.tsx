import { useEffect } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { Footer } from '../components/layout/Footer';
import { PublicHeader } from '../components/layout/PublicHeader';
import { CompanyApplications } from '../pages/admin/CompanyApplications';
import { CompanyDashboard } from '../pages/admin/CompanyDashboard';
import { CompanyJobs } from '../pages/admin/CompanyJobs';
import { CompanyProfileEditor } from '../pages/admin/CompanyProfileEditor';
import { FranchiseApplications } from '../pages/admin/FranchiseApplications';
import { FranchiseCompanies } from '../pages/admin/FranchiseCompanies';
import { FranchiseDashboard } from '../pages/admin/FranchiseDashboard';
import { FranchiseJobs } from '../pages/admin/FranchiseJobs';
import { MasterFranchises } from '../pages/admin/MasterFranchises';
import { AdminRouter } from '../pages/admin/AdminRouter';
import { Login } from '../pages/admin/Login';
import { ReddeApplications } from '../pages/admin/ReddeApplications';
import { ReddeCompanies } from '../pages/admin/ReddeCompanies';
import { ReddeCompanyEditor } from '../pages/admin/ReddeCompanyEditor';
import { ReddeDashboard } from '../pages/admin/ReddeDashboard';
import { ReddeJobs } from '../pages/admin/ReddeJobs';
import { ReddeUsers } from '../pages/admin/ReddeUsers';
import { ApplicationSuccess } from '../pages/public/ApplicationSuccess';
import { Companies } from '../pages/public/Companies';
import { CompanyDetail } from '../pages/public/CompanyDetail';
import { Home } from '../pages/public/Home';
import { JobDetail } from '../pages/public/JobDetail';
import { Jobs } from '../pages/public/Jobs';
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
        <Route path="/admin/master/vagas" element={<ReddeJobs />} />
        <Route path="/admin/master/candidatos" element={<ReddeApplications />} />
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
        <Route path="/admin/franqueado" element={<FranchiseDashboard />} />
        <Route path="/admin/franqueado/empresas" element={<FranchiseCompanies />} />
        <Route path="/admin/franqueado/vagas" element={<FranchiseJobs />} />
        <Route path="/admin/franqueado/candidatos" element={<FranchiseApplications />} />
      </Route>

      <Route element={<ProtectedRoute roles={['empresa_cliente', 'company_admin', 'company_recruiter']} />}>
        <Route path="/admin/empresa" element={<CompanyDashboard />} />
        <Route path="/admin/empresa/perfil" element={<CompanyProfileEditor />} />
        <Route path="/admin/empresa/vagas" element={<CompanyJobs />} />
        <Route path="/admin/empresa/candidaturas" element={<CompanyApplications />} />
      </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
