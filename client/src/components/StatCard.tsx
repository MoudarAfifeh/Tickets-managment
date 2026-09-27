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
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isPending ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <span className="font-heading text-3xl font-semibold text-gray-900 dark:text-gray-100">
            {value}
          </span>
        )}
      </CardContent>
    </Card>
  );
}

export default StatCard;
