import { useState, useRef, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsService } from '../../../services/projects';
import { ProjectPaymentStatus } from '../../../types/project';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../../../components/ui/select';
import { Label } from '../../../components/ui/label';
import { Edit, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../../lib/utils';
import { AxiosError } from 'axios';

const CAPTCHA_LENGTH = 4;

const paymentStatusMap: Record<ProjectPaymentStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" }> = {
  [ProjectPaymentStatus.UNPAID]: { label: 'Не оплачен', variant: 'destructive' },
  [ProjectPaymentStatus.PARTIALLY_PAID]: { label: 'Частично оплачен', variant: 'warning' },
  [ProjectPaymentStatus.PAID]: { label: 'Оплачен', variant: 'success' },
};

interface PaymentStatusChangerProps {
  projectId: number;
  currentStatus: ProjectPaymentStatus;
  onStatusChanged?: (newStatus: ProjectPaymentStatus) => void;
}

export function PaymentStatusChanger({ projectId, currentStatus, onStatusChanged }: PaymentStatusChangerProps) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<ProjectPaymentStatus>(currentStatus);
  const [captchaCode, setCaptchaCode] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const shakeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current);
      if (focusTimeoutRef.current) clearTimeout(focusTimeoutRef.current);
    };
  }, []);

  // Reset state when currentStatus changes
  useEffect(() => {
    setSelectedStatus(currentStatus);
  }, [currentStatus]);

  const updateMutation = useMutation({
    mutationFn: (code: string) => projectsService.updatePaymentStatus(projectId, selectedStatus, code),
    onSuccess: (updatedProject) => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Статус оплаты обновлен');
      setIsEditing(false);
      setCaptchaCode('');
      if (onStatusChanged && updatedProject.payment_status) {
        onStatusChanged(updatedProject.payment_status);
      }
    },
    onError: (error: AxiosError<{ detail?: string }>) => {
      const errorType = error.response?.headers?.['x-error-type'];
      if (errorType === 'CAPTCHA_ERROR') {
        // Shake animation and reset
        setIsShaking(true);
        setCaptchaCode('');
        shakeTimeoutRef.current = setTimeout(() => {
          setIsShaking(false);
          inputRef.current?.focus();
        }, 500);
      } else {
        const message = error.response?.data?.detail || 'Ошибка при обновлении статуса оплаты';
        toast.error(message);
      }
    }
  });

  const handleCancel = () => {
    setIsEditing(false);
    setSelectedStatus(currentStatus);
    setCaptchaCode('');
  };

  const handleCaptchaChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits, max 4
    const value = e.target.value.replace(/[^0-9]/g, '').slice(0, CAPTCHA_LENGTH);
    setCaptchaCode(value);

    // Auto-submit when 4 digits entered (with pending check to prevent double submission)
    if (value.length === CAPTCHA_LENGTH && !updateMutation.isPending) {
      updateMutation.mutate(value);
    }
  }, [updateMutation]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (!isEditing) {
    // Display mode
    return (
      <div className="bg-card border rounded-md p-3 shadow-sm">
        <h3 className="font-semibold mb-2 text-sm">Статус оплаты</h3>
        <div className="flex items-center justify-between">
          <Badge
            variant={paymentStatusMap[currentStatus]?.variant || 'outline'}
            className="text-xs"
          >
            {paymentStatusMap[currentStatus]?.label || currentStatus}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsEditing(true)}
            aria-label="Изменить статус оплаты"
          >
            <Edit className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }

  // Edit mode
  return (
    <div className="bg-card border rounded-md p-3 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">Статус оплаты</h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={handleCancel}
          disabled={updateMutation.isPending}
          aria-label="Отменить изменение"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="payment-status-select" className="text-xs">Новый статус</Label>
          <Select
            value={selectedStatus}
            onValueChange={(val) => {
              setSelectedStatus(val as ProjectPaymentStatus);
              setCaptchaCode('');
              // Focus captcha input after dropdown closes
              focusTimeoutRef.current = setTimeout(() => inputRef.current?.focus(), 100);
            }}
            disabled={updateMutation.isPending}
          >
            <SelectTrigger id="payment-status-select" className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(paymentStatusMap).map(([key, val]) => (
                <SelectItem key={key} value={key}>{val.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Код подтверждения</Label>

          {/* Clickable dots area with hidden input */}
          <div
            className={cn(
              "relative flex justify-center items-center gap-3 h-10 border rounded-md cursor-text bg-background transition-all",
              isShaking && "animate-shake border-destructive",
              isFocused && !isShaking && "ring-2 ring-primary ring-offset-1 border-primary",
              updateMutation.isPending && "opacity-50 pointer-events-none"
            )}
            onClick={() => inputRef.current?.focus()}
          >
            {/* Hidden input - positioned over dots, fully transparent */}
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={captchaCode}
              onChange={handleCaptchaChange}
              onKeyDown={handleKeyPress}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              disabled={updateMutation.isPending}
              autoComplete="one-time-code"
              className="absolute inset-0 w-full h-full opacity-0 cursor-text"
              aria-label="Код подтверждения"
            />

            {/* Visual dots (decorative) */}
            <div className="flex gap-3" aria-hidden="true">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={cn(
                    "w-3 h-3 rounded-full transition-all duration-150",
                    updateMutation.isPending
                      ? "bg-primary animate-pulse"
                      : i < captchaCode.length
                        ? isShaking ? "bg-destructive scale-110" : "bg-primary"
                        : "bg-muted-foreground/30"
                  )}
                />
              ))}
            </div>
          </div>

          {updateMutation.isPending && (
            <div
              className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground"
              role="status"
              aria-live="polite"
            >
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Проверка...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
