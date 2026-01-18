import { Badge } from '../../../components/ui/badge';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '../../../components/ui/hover-card';
import { ActiveProject, RentalStatus } from '../../../types/equipment';
import { format, parseISO, isAfter, isBefore, isWithinInterval } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Calendar, ExternalLink, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../../lib/utils';

interface RentalStatusBadgeProps {
  rentalStatus?: RentalStatus;
  rentalStatusDisplay?: string;
  activeProjects?: ActiveProject[];
}

const statusConfig: Record<
  RentalStatus,
  { variant: 'success' | 'default' | 'destructive'; label: string }
> = {
  available: { variant: 'success', label: 'Свободен' },
  'on-project': { variant: 'default', label: 'На проекте' },
  unavailable: { variant: 'destructive', label: 'Недоступен' },
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
}: RentalStatusBadgeProps) {
  const config = statusConfig[rentalStatus];
  const displayText = rentalStatusDisplay || config.label;

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

  const sortedProjects = sortProjectsByDate(activeProjects);

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <Badge
          variant={config.variant}
          className="px-1.5 py-0 text-[10px] h-5 cursor-pointer hover:opacity-80 transition-opacity gap-1"
        >
          {displayText}
          {activeProjects.length > 1 && (
            <span className="opacity-70">({activeProjects.length})</span>
          )}
          <Info className="h-3 w-3 opacity-70" />
        </Badge>
      </HoverCardTrigger>
      <HoverCardContent
        className="w-72 p-0"
        align="start"
        sideOffset={8}
      >
        <div className="p-3 border-b">
          <h4 className="text-xs font-medium text-foreground">
            Активные проекты
          </h4>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Оборудование задействовано в {activeProjects.length}{' '}
            {activeProjects.length === 1 ? 'проекте' : 'проектах'}
          </p>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {sortedProjects.map((project) => {
            const dateStatus = getProjectDateStatus(
              project.start_date,
              project.end_date
            );
            const dateConfig = dateStatusConfig[dateStatus];

            return (
              <Link
                key={project.project_id}
                to={`/projects/${project.project_id}`}
                className="flex items-start justify-between p-3 hover:bg-muted/50 transition-colors border-b last:border-b-0 group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        'text-xs truncate',
                        dateConfig.className
                      )}
                    >
                      {project.project_name}
                    </span>
                    <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity flex-shrink-0" />
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {format(parseISO(project.start_date), 'd MMM', {
                        locale: ru,
                      })}{' '}
                      –{' '}
                      {format(parseISO(project.end_date), 'd MMM yyyy', {
                        locale: ru,
                      })}
                    </span>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[9px] px-1.5 py-0 h-4 ml-2 flex-shrink-0',
                    dateStatus === 'current' && 'border-primary text-primary',
                    dateStatus === 'past' && 'border-muted-foreground/30'
                  )}
                >
                  {dateConfig.label}
                </Badge>
              </Link>
            );
          })}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
