import type { TicketCategory, TicketStatus } from "code";
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
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <Input
        placeholder="Search subject or sender..."
        value={value.search}
        onChange={(e) => onChange({ ...value, search: e.target.value })}
        className="w-64"
      />
      <Select
        value={value.status}
        onValueChange={(status: TicketStatus | "all" | null) =>
          onChange({ ...value, status: status ?? "all" })
        }
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Status" />
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
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Category" />
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
