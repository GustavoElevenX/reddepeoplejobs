import { BriefcaseBusiness, Building2, Network, Trophy, UsersRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminStatCard } from '../../components/admin/AdminStatCard';
import { EmptyState } from '../../components/public/EmptyState';
import { LoadingState } from '../../components/public/LoadingState';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { getFranchisePerformance, getNetworkDashboardStats } from '../../lib/data';
import type { FranchisePerformance, NetworkDashboardStats } from '../../types';

export function ReddeDashboard() {
  const [stats, setStats] = useState<NetworkDashboardStats | null>(null);
  const [performance, setPerformance] = useState<FranchisePerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [statsData, performanceData] = await Promise.all([
        getNetworkDashboardStats(),
        getFranchisePerformance(),
      ]);
      setStats(statsData);
      setPerformance(performanceData);
      setLoading(false);
    }

    void load();
  }, []);

  if (loading || !stats) return <LoadingState label="Carregando visão da rede..." />;

  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-black text-ink-900">Admin Master</h1>
          <p className="mt-2 text-ink-500">
            Visão consolidada dos franqueados, empresas, vagas e candidatos da Recruitfy.
          </p>
        </div>
        <Link to="/admin/master/franqueados">
          <Button>
            <Network size={18} />
            Cadastrar franqueado
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard title="Total de franqueados" value={stats.totalFranchises} icon={Network} />
        <AdminStatCard title="Franqueados ativos" value={stats.activeFranchises} icon={Trophy} />
        <AdminStatCard title="Empresas clientes" value={stats.totalCompanies} icon={Building2} />
        <AdminStatCard title="Vagas abertas" value={stats.openJobs} icon={BriefcaseBusiness} />
        <AdminStatCard title="Total de candidatos" value={stats.totalApplications} icon={UsersRound} />
        <AdminStatCard title="Vagas fechadas no mês" value={stats.closedJobsThisMonth} icon={BriefcaseBusiness} />
      </div>

      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-ink-900">Performance por franqueado</h2>
            <p className="mt-1 text-sm text-ink-500">Indicadores operacionais iniciais por unidade.</p>
          </div>
          <Link to="/admin/master/franqueados" className="text-sm font-bold text-redde-600">
            Gerenciar unidades
          </Link>
        </div>

        {performance.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-surface-200 text-sm">
              <thead>
                <tr className="text-left text-xs font-black uppercase tracking-[0.08em] text-ink-500">
                  <th className="px-3 py-3">Franqueado</th>
                  <th className="px-3 py-3">Empresas</th>
                  <th className="px-3 py-3">Vagas abertas</th>
                  <th className="px-3 py-3">Candidatos</th>
                  <th className="px-3 py-3">Encaminhados</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-200">
                {performance.map((item) => (
                  <tr key={item.franchise.id}>
                    <td className="px-3 py-3 font-bold text-ink-900">{item.franchise.name}</td>
                    <td className="px-3 py-3 text-ink-700">{item.companies}</td>
                    <td className="px-3 py-3 text-ink-700">{item.openJobs}</td>
                    <td className="px-3 py-3 text-ink-700">{item.applications}</td>
                    <td className="px-3 py-3 text-ink-700">{item.forwardedCandidates}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Cadastre o primeiro franqueado para iniciar a rede." />
        )}
      </Card>
    </div>
  );
}
