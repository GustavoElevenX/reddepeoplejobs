import { useEffect } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { Footer } from '../components/layout/Footer';
import { PublicHeader } from '../components/layout/PublicHeader';
import { CompanyApplications } from '../pages/admin/CompanyApplications';
import { CompanyDashboard } from '../pages/admin/CompanyDashboard';
import { CompanyJobs } from '../pages/admin/CompanyJobs';
import { CompanyProfileEditor } from '../pages/admin/CompanyProfileEditor';
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
  return <Navigate to={id ? `/admin/geral/empresas/${id}` : '/admin/geral/empresas'} replace />;
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

      <Route element={<ProtectedRoute roles={['redde_super_admin', 'redde_admin']} />}>
        <Route path="/admin/geral" element={<ReddeDashboard />} />
        <Route path="/admin/geral/empresas" element={<ReddeCompanies />} />
        <Route path="/admin/geral/empresas/:id" element={<ReddeCompanyEditor />} />
        <Route path="/admin/geral/vagas" element={<ReddeJobs />} />
        <Route path="/admin/geral/candidaturas" element={<ReddeApplications />} />
        <Route path="/admin/geral/usuarios" element={<ReddeUsers />} />
        <Route path="/admin/redde" element={<Navigate to="/admin/geral" replace />} />
        <Route path="/admin/redde/empresas" element={<Navigate to="/admin/geral/empresas" replace />} />
        <Route path="/admin/redde/empresas/:id" element={<LegacyCompanyRedirect />} />
        <Route path="/admin/redde/vagas" element={<Navigate to="/admin/geral/vagas" replace />} />
        <Route path="/admin/redde/candidaturas" element={<Navigate to="/admin/geral/candidaturas" replace />} />
        <Route path="/admin/redde/usuarios" element={<Navigate to="/admin/geral/usuarios" replace />} />
      </Route>

      <Route element={<ProtectedRoute roles={['company_admin', 'company_recruiter']} />}>
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
