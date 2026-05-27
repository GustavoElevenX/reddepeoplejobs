import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
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
  return (
    <div className="min-h-screen bg-surface-50">
      <PublicHeader />
      <Outlet />
      <Footer />
    </div>
  );
}

export function AppRoutes() {
  return (
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
        <Route path="/admin/redde" element={<ReddeDashboard />} />
        <Route path="/admin/redde/empresas" element={<ReddeCompanies />} />
        <Route path="/admin/redde/empresas/:id" element={<ReddeCompanyEditor />} />
        <Route path="/admin/redde/vagas" element={<ReddeJobs />} />
        <Route path="/admin/redde/candidaturas" element={<ReddeApplications />} />
        <Route path="/admin/redde/usuarios" element={<ReddeUsers />} />
      </Route>

      <Route element={<ProtectedRoute roles={['company_admin', 'company_recruiter']} />}>
        <Route path="/admin/empresa" element={<CompanyDashboard />} />
        <Route path="/admin/empresa/perfil" element={<CompanyProfileEditor />} />
        <Route path="/admin/empresa/vagas" element={<CompanyJobs />} />
        <Route path="/admin/empresa/candidaturas" element={<CompanyApplications />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
