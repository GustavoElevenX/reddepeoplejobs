import { applicationStatusLabels } from '../../lib/formatters';
import type { ApplicationStatus } from '../../types';
import { Badge } from '../ui/Badge';

const variants: Record<ApplicationStatus, 'neutral' | 'success' | 'warning' | 'danger' | 'info'> = {
  novo: 'info',
  triagem: 'warning',
  em_analise: 'warning',
  selecionado: 'success',
  entrevista: 'info',
  teste: 'warning',
  encaminhado_cliente: 'info',
  aprovado: 'success',
  reprovado: 'danger',
  contratado: 'success',
  banco_talentos: 'neutral',
};

export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  return <Badge variant={variants[status]}>{applicationStatusLabels[status]}</Badge>;
}
