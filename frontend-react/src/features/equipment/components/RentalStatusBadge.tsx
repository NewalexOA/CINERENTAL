import { Badge } from '../../../components/ui/badge';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '../../../components/ui/hover-card';
import { ActiveProject, RentalStatus, EquipmentStatus } from '../../../types/equipment';
import { format, parseISO, isAfter, isBefore, isWithinInterval } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../../lib/utils';

interface RentalStatusBadgeProps {
  rentalStatus?: RentalStatus;
  rentalStatusDisplay?: string;
  activeProjects?: ActiveProject[];
  equipmentStatus?: EquipmentStatus;
}

const statusConfig: Record<
  RentalStatus,
  { variant: 'success' | 'default' | 'destructive' | 'warning' | 'secondary'; label: string }
> = {
  available: { variant: 'success', label: 'Свободен' },
  'on-project': { variant: 'default', label: 'На проекте' },
  unavailable: { variant: 'destructive', label: 'Недоступен' },
};

// Equipment status config for unavailable items
const equipmentStatusConfig: Record<
  EquipmentStatus,
  { variant: 'success' | 'default' | 'destructive' | 'warning' | 'secondary'; label: string }
> = {
  [EquipmentStatus.AVAILABLE]: { variant: 'success', label: 'Доступно' },
  [EquipmentStatus.RENTED]: { variant: 'default', label: 'В аренде' },
  [EquipmentStatus.MAINTENANCE]: { variant: 'warning', label: 'Обслуживание' },
  [EquipmentStatus.BROKEN]: { variant: 'destructive', label: 'Сломано' },
  [EquipmentStatus.RETIRED]: { variant: 'secondary', label: 'Списано' },
};

type ProjectDateStatus = 'past' | 'current' | 'future';

function getProjectDateStatus(startDate: string, endDate: string): ProjectDateStatus {
  const now = new Date();
  const start = parseISO(startDate);
  const end = parseISO(endDate);

  if (isAfter(now, end)) {
    return 'past';
  }

  if (isBefore(now, start)) {
    return 'future';
  }

  if (isWithinInterval(now, { start, end })) {
    return 'current';
  }

  return 'current';
}

const dateStatusConfig: Record<
  ProjectDateStatus,
  { className: string; label: string }
> = {
  past: {
    className: 'text-muted-foreground',
    label: 'завершён',
  },
  current: {
    className: 'text-primary font-medium',
    label: 'текущий',
  },
  future: {
    className: 'text-muted-foreground',
    label: 'будущий',
  },
};

function sortProjectsByDate(projects: ActiveProject[]): ActiveProject[] {
  return [...projects].sort((a, b) => {
    const aStart = parseISO(a.start_date);
    const bStart = parseISO(b.start_date);
    const aStatus = getProjectDateStatus(a.start_date, a.end_date);
    const bStatus = getProjectDateStatus(b.start_date, b.end_date);

    // Current projects first, then future, then past
    const statusOrder: Record<ProjectDateStatus, number> = {
      current: 0,
      future: 1,
      past: 2,
    };

    if (statusOrder[aStatus] !== statusOrder[bStatus]) {
      return statusOrder[aStatus] - statusOrder[bStatus];
    }

    // Within same status, sort by start date (ascending for current/future, descending for past)
    if (aStatus === 'past') {
      return bStart.getTime() - aStart.getTime();
    }
    return aStart.getTime() - bStart.getTime();
  });
}

export function RentalStatusBadge({
  rentalStatus = 'available',
  rentalStatusDisplay,
  activeProjects = [],
  equipmentStatus,
}: RentalStatusBadgeProps) {
  // For unavailable status, show actual equipment status if provided
  let config = statusConfig[rentalStatus];
  let displayText = rentalStatusDisplay || config.label;

  if (rentalStatus === 'unavailable' && equipmentStatus && equipmentStatus !== EquipmentStatus.AVAILABLE) {
    const eqConfig = equipmentStatusConfig[equipmentStatus];
    config = eqConfig;
    displayText = eqConfig.label;
  }

  // If not on project or no projects, show simple badge
  if (rentalStatus !== 'on-project' || activeProjects.length === 0) {
    return (
      <Badge
        variant={config.variant}
        className="px-1.5 py-0 text-[10px] h-5"
      >
        {displayText}
      </Badge>
    );
  }

  // Filter out past projects - only show current and future
  const activeOnly = activeProjects.filter((p) => {
    const status = getProjectDateStatus(p.start_date, p.end_date);
    return status !== 'past';
  });

  const sortedProjects = sortProjectsByDate(activeOnly);

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <span className="inline-flex">
          <Badge
            variant={config.variant}
            className="px-1.5 py-0 text-[10px] h-5 cursor-pointer hover:opacity-80 transition-opacity gap-1"
          >
            {displayText}
            <Info className="h-3 w-3 opacity-70" />
          </Badge>
        </span>
      </HoverCardTrigger>
      <HoverCardContent
        className="w-72 p-3"
        align="start"
        sideOffset={8}
      >
        <h4 className="text-sm font-semibold text-foreground mb-3">
          Активные проекты:
        </h4>
        <div className="space-y-3">
          {sortedProjects.map((project) => {
            const dateStatus = getProjectDateStatus(
              project.start_date,
              project.end_date
            );
            const dateConfig = dateStatusConfig[dateStatus];

            return (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className="block hover:opacity-80 transition-opacity"
              >
                <div className={cn('font-medium', dateConfig.className)}>
                  {project.name}
                </div>
                <div className="text-sm text-muted-foreground">
                  {format(parseISO(project.start_date), 'd', { locale: ru })}
                  {' - '}
                  {format(parseISO(project.end_date), 'd MMMM', { locale: ru })}
                  {dateStatus === 'current' && (
                    <span className="text-primary"> (текущий)</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
