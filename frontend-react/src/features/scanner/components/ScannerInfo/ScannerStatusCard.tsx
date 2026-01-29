/**
 * ScannerStatusCard Component
 * Display scanner operational status and instructions
 */

import { Scan, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ScannerStatus } from '../../types/scanner.types';

interface ScannerStatusCardProps {
  status: ScannerStatus;
  error?: string | null;
  onRetry?: () => void;
}

// Status configuration
const statusConfig: Record<
  ScannerStatus,
  {
    label: string;
    description: string;
    dotColor: string;
    icon: React.ComponentType<{ className?: string }>;
    iconColor: string;
  }
> = {
  active: {
    label: 'Готов к сканированию',
    description: 'Наведите сканер на штрих-код и нажмите кнопку',
    dotColor: 'bg-green-500',
    icon: CheckCircle2,
    iconColor: 'text-green-600',
  },
  inactive: {
    label: 'Сканер неактивен',
    description: 'Сканер не прослушивает ввод',
    dotColor: 'bg-gray-400',
    icon: Scan,
    iconColor: 'text-gray-400',
  },
  error: {
    label: 'Ошибка сканера',
    description: 'Произошла ошибка сканера',
    dotColor: 'bg-red-500',
    icon: AlertCircle,
    iconColor: 'text-red-600',
  },
};

// Error recommendations
const errorRecommendations: Record<string, string[]> = {
  connection: [
    'Проверьте подключение сканера',
    'Попробуйте отключить и подключить сканер заново',
    'Убедитесь, что USB-порт работает',
  ],
  permission: [
    'Предоставьте браузеру разрешение на использование устройств ввода',
    'Проверьте настройки безопасности браузера',
    'Попробуйте обновить страницу',
  ],
  default: [
    'Проверьте подключение сканера',
    'Обновите страницу и попробуйте снова',
    'Обратитесь в поддержку, если проблема сохраняется',
  ],
};

function getRecommendations(error?: string | null): string[] {
  if (!error) return errorRecommendations.default;

  const errorLower = error.toLowerCase();
  if (errorLower.includes('connect') || errorLower.includes('usb')) {
    return errorRecommendations.connection;
  }
  if (errorLower.includes('permission') || errorLower.includes('access')) {
    return errorRecommendations.permission;
  }
  return errorRecommendations.default;
}

/**
 * ScannerStatusCard
 *
 * Display scanner status with visual indicators and instructions
 *
 * Features:
 * - Status indicator with pulsing animation for active state
 * - Color-coded icons and status dots
 * - Error display with retry functionality
 * - Contextual recommendations for errors
 * - Accessible status announcements
 *
 * @example
 * <ScannerStatusCard
 *   status="active"
 * />
 *
 * <ScannerStatusCard
 *   status="error"
 *   error="Scanner connection lost"
 *   onRetry={() => reconnectScanner()}
 * />
 */
export function ScannerStatusCard({
  status,
  error,
  onRetry,
}: ScannerStatusCardProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  const recommendations = status === 'error' ? getRecommendations(error) : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Статус сканера</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Scanner Icon Area */}
        <div className="flex items-center justify-center py-6">
          <div className="relative">
            {/* Pulsing background for active state */}
            {status === 'active' && (
              <div className="absolute inset-0 rounded-full bg-green-100 animate-ping opacity-75" />
            )}

            {/* Icon container */}
            <div
              className={cn(
                'relative rounded-full p-6 bg-muted',
                status === 'active' && 'bg-green-50'
              )}
            >
              <Icon className={cn('h-12 w-12', config.iconColor)} />
            </div>
          </div>
        </div>

        {/* Status Information */}
        <div className="text-center space-y-2">
          {/* Status indicator dot + label */}
          <div className="flex items-center justify-center gap-2">
            <div className="relative flex items-center">
              <div
                className={cn(
                  'h-2.5 w-2.5 rounded-full',
                  config.dotColor
                )}
              />
              {/* Pulsing ring for active state */}
              {status === 'active' && (
                <div className="absolute inset-0 h-2.5 w-2.5 rounded-full bg-green-400 animate-ping" />
              )}
            </div>
            <p className="font-medium text-sm">{config.label}</p>
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground">
            {config.description}
          </p>
        </div>

        {/* Error Display */}
        {status === 'error' && error && (
          <div className="space-y-3 pt-2">
            {/* Error message */}
            <div className="rounded-md bg-red-50 border border-red-200 p-3">
              <div className="flex gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>

            {/* Recommendations */}
            {recommendations.length > 0 && (
              <div className="rounded-md bg-blue-50 border border-blue-200 p-3">
                <p className="text-xs font-medium text-blue-900 mb-2">
                  Рекомендации:
                </p>
                <ul className="space-y-1 text-xs text-blue-800">
                  {recommendations.map((rec, index) => (
                    <li key={index} className="flex gap-2">
                      <span className="text-blue-400">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Retry Button */}
            {onRetry && (
              <Button
                onClick={onRetry}
                variant="outline"
                className="w-full"
                size="sm"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Повторить подключение
              </Button>
            )}
          </div>
        )}

        {/* Instructions for active state */}
        {status === 'active' && (
          <div className="rounded-md bg-blue-50 border border-blue-200 p-3">
            <div className="flex gap-2">
              <Scan className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-blue-800 space-y-1">
                <p className="font-medium">Как сканировать:</p>
                <ol className="list-decimal list-inside space-y-0.5 ml-1">
                  <li>Наведите сканер на штрих-код</li>
                  <li>Нажмите кнопку сканера</li>
                  <li>Дождитесь звукового/светового подтверждения</li>
                </ol>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Accessibility:
 * - Semantic HTML with proper heading hierarchy
 * - ARIA live region for status changes (can be added via parent)
 * - Color + icon + text for status indication
 * - Keyboard accessible retry button
 *
 * Performance:
 * - CSS animations for pulsing effects
 * - Memoize config lookups if needed
 * - No heavy computations
 *
 * Usage:
 *
 * // Active scanner
 * <ScannerStatusCard status="active" />
 *
 * // Inactive scanner
 * <ScannerStatusCard status="inactive" />
 *
 * // Error with retry
 * <ScannerStatusCard
 *   status="error"
 *   error="Scanner disconnected"
 *   onRetry={() => initializeScanner()}
 * />
 */
