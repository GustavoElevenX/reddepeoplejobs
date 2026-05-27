import { applicationStatusLabels } from '../../lib/formatters';
import type { ApplicationStatus } from '../../types';
import { Badge } from '../ui/Badge';

const variants: Record<ApplicationStatus, 'neutral' | 'success' | 'warning' | 'danger' | 'info'> = {
  novo: 'info',
  em_analise: 'warning',
  selecionado: 'success',
  entrevista: 'info',
  reprovado: 'danger',
  contratado: 'success',
};

export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  return <Badge variant={variants[status]}>{applicationStatusLabels[status]}</Badge>;
}
