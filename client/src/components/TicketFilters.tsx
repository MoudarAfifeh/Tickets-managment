import type { TicketCategory, TicketStatus } from "code";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORY_LABELS } from "@/components/TicketsTable";

const STATUS_LABELS: Record<TicketStatus, string> = {
  new: "New",
  processing: "Processing",
  open: "Open",
  resolved: "Resolved",
  closed: "Closed",
};

export type TicketFiltersValue = {
  status: TicketStatus | "all";
  category: TicketCategory | "all";
  search: string;
};

type TicketFiltersProps = {
  value: TicketFiltersValue;
  onChange: (value: TicketFiltersValue) => void;
};

function TicketFilters({ value, onChange }: TicketFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-full sm:w-72">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          placeholder="Search subject or sender..."
          aria-label="Search tickets"
          value={value.search}
          onChange={(e) => onChange({ ...value, search: e.target.value })}
          className="pl-8"
        />
      </div>
      <Select
        value={value.status}
        onValueChange={(status: TicketStatus | "all" | null) =>
          onChange({ ...value, status: status ?? "all" })
        }
      >
        <SelectTrigger className="w-40" aria-label="Status">
          <SelectValue>
            {(status: TicketStatus | "all") =>
              status === "all" ? "All statuses" : STATUS_LABELS[status]
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {Object.entries(STATUS_LABELS).map(([status, label]) => (
            <SelectItem key={status} value={status}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={value.category}
        onValueChange={(category: TicketCategory | "all" | null) =>
          onChange({ ...value, category: category ?? "all" })
        }
      >
        <SelectTrigger className="w-48" aria-label="Category">
          <SelectValue className="truncate">
            {(category: TicketCategory | "all") =>
              category === "all" ? "All categories" : CATEGORY_LABELS[category]
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All categories</SelectItem>
          {Object.entries(CATEGORY_LABELS).map(([category, label]) => (
            <SelectItem key={category} value={category}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default TicketFilters;
