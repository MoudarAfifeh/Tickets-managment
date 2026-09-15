import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type OnChangeFn,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TicketListItem } from "@/pages/Tickets";

const SKELETON_ROWS = 5;
const SKELETON_WIDTHS = ["w-48", "w-40", "w-28", "w-16", "w-24", "w-20"];

const CATEGORY_LABELS: Record<TicketListItem["category"], string> = {
  general_question: "General question",
  technical_question: "Technical question",
  refund_request: "Refund request",
};

const STATUS_VARIANT: Record<
  TicketListItem["status"],
  "default" | "secondary" | "outline"
> = {
  open: "default",
  resolved: "secondary",
  closed: "outline",
};

const columnHelper = createColumnHelper<TicketListItem>();

const columns = [
  columnHelper.accessor("subject", {
    id: "subject",
    header: "Subject",
    cell: (info) => (
      <span className="font-medium">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor((row) => row.senderName || row.senderEmail, {
    id: "senderEmail",
    header: "From",
  }),
  columnHelper.accessor("category", {
    id: "category",
    header: "Category",
    cell: (info) => (
      <Badge variant="secondary">{CATEGORY_LABELS[info.getValue()]}</Badge>
    ),
  }),
  columnHelper.accessor("status", {
    id: "status",
    header: "Status",
    cell: (info) => (
      <Badge variant={STATUS_VARIANT[info.getValue()]}>{info.getValue()}</Badge>
    ),
  }),
  columnHelper.accessor((row) => row.assignedTo?.name ?? "Unassigned", {
    id: "assignedTo",
    header: "Assigned to",
  }),
  columnHelper.accessor("createdAt", {
    id: "createdAt",
    header: "Created",
    cell: (info) => new Date(info.getValue()).toLocaleDateString(),
  }),
];

type TicketsTableProps = {
  tickets: TicketListItem[] | undefined;
  isPending: boolean;
  sorting: SortingState;
  onSortingChange: OnChangeFn<SortingState>;
};

function TicketsTable({
  tickets,
  isPending,
  sorting,
  onSortingChange,
}: TicketsTableProps) {
  const table = useReactTable({
    data: tickets ?? [],
    columns,
    state: { sorting },
    onSortingChange,
    manualSorting: true,
    enableMultiSort: false,
    enableSortingRemoval: false,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => {
              const sortDirection = header.column.getIsSorted();
              return (
                <TableHead key={header.id}>
                  <button
                    type="button"
                    className="flex items-center gap-1 cursor-pointer select-none"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                    {sortDirection === "asc" && (
                      <ArrowUp className="size-3.5" />
                    )}
                    {sortDirection === "desc" && (
                      <ArrowDown className="size-3.5" />
                    )}
                    {!sortDirection && (
                      <ChevronsUpDown className="size-3.5 text-muted-foreground" />
                    )}
                  </button>
                </TableHead>
              );
            })}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {isPending
          ? Array.from({ length: SKELETON_ROWS }).map((_, i) => (
              <TableRow key={i}>
                {SKELETON_WIDTHS.map((width, j) => (
                  <TableCell key={j}>
                    <Skeleton
                      className={
                        j === 2 || j === 3
                          ? `h-5 ${width} rounded-4xl`
                          : `h-4 ${width}`
                      }
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))
          : table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
      </TableBody>
    </Table>
  );
}

export default TicketsTable;
