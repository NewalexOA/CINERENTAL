import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';

/**
 * ScanResultSkeleton Component
 *
 * Loading skeleton that mimics the layout of ScanResultCard.
 * Displays animated pulse placeholders while equipment data is being fetched.
 */
export function ScanResultSkeleton() {
  return (
    <Card className="w-full">
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <div className="h-8 w-3/4 bg-muted animate-pulse rounded" />
            <div className="h-5 w-1/2 bg-muted animate-pulse rounded" />
          </div>
          <div className="h-6 w-24 bg-muted animate-pulse rounded-full ml-2" />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-20 bg-muted animate-pulse rounded" />
              <div className="h-5 w-32 bg-muted animate-pulse rounded" />
            </div>
          ))}
        </div>
      </CardContent>

      <CardFooter className="flex gap-2">
        <div className="h-10 flex-1 bg-muted animate-pulse rounded-md" />
        <div className="h-10 flex-1 bg-muted animate-pulse rounded-md" />
      </CardFooter>
    </Card>
  );
}
