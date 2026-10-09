import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type StatCardProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  isPending: boolean;
};

// A single stat tile: label, then a large hero-style value. No delta/trend —
// the dashboard has no historical baseline to compare against yet.
function StatCard({ icon: Icon, label, value, isPending }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className="size-4 text-primary" aria-hidden="true" />
      </CardHeader>
      <CardContent>
        {isPending ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <span className="font-heading text-3xl font-semibold tracking-tight text-foreground tabular-nums">
            {value}
          </span>
        )}
      </CardContent>
    </Card>
  );
}

export default StatCard;
