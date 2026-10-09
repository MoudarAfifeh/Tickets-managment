import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type DayCount = { date: string; count: number };

type TicketsPerDayChartProps = {
  data: DayCount[] | undefined;
  isPending: boolean;
};

const PLOT_HEIGHT_PX = 160;
// Label every 5th day plus the last one, so labels stay legible against 30
// bars without cluttering the x-axis.
const LABEL_STRIDE = 5;

// Rounds a positive value up to a "clean" axis max (1/2/5/10 × a power of
// ten) so the y-axis reads as a round number instead of an arbitrary one.
function niceCeil(value: number): number {
  if (value <= 0) return 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const residual = value / magnitude;
  const niceResidual =
    residual <= 1 ? 1 : residual <= 2 ? 2 : residual <= 5 ? 5 : 10;
  return niceResidual * magnitude;
}

// `date` is a UTC "YYYY-MM-DD" bucket key from the server — parse it as a
// UTC calendar date so the label always matches the day the server bucketed
// it into, regardless of the viewer's own timezone.
function parseUtcDate(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDateShort(date: string): string {
  return parseUtcDate(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatDateFull(date: string): string {
  return parseUtcDate(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function TicketsPerDayChart({ data, isPending }: TicketsPerDayChartProps) {
  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Tickets per day</CardTitle>
        <CardDescription>Last 30 days</CardDescription>
      </CardHeader>
      <CardContent>
        {isPending || !data ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <TicketsPerDayBars data={data} />
        )}
      </CardContent>
    </Card>
  );
}

function TicketsPerDayBars({ data }: { data: DayCount[] }) {
  const maxCount = Math.max(0, ...data.map((day) => day.count));
  const niceMax = niceCeil(maxCount);

  return (
    <div>
      <div className="flex gap-2">
        <div
          data-slot="chart-y-axis"
          className="flex w-8 shrink-0 flex-col justify-between text-right text-xs text-muted-foreground"
          style={{ height: PLOT_HEIGHT_PX }}
        >
          <span>{niceMax}</span>
          <span>0</span>
        </div>
        <div
          className="relative flex-1"
          style={{ height: PLOT_HEIGHT_PX }}
        >
          <div className="absolute inset-x-0 top-0 border-t border-border" />
          <div className="absolute inset-x-0 bottom-0 border-t border-border" />
          <div className="flex h-full items-end gap-px">
            {data.map((day) => {
              const heightPct =
                niceMax > 0 ? (day.count / niceMax) * 100 : 0;
              const ticketWord = day.count === 1 ? "ticket" : "tickets";
              return (
                <button
                  key={day.date}
                  type="button"
                  className="group relative flex h-full flex-1 flex-col justify-end border-0 bg-transparent p-0 outline-none"
                  aria-label={`${formatDateFull(day.date)}: ${day.count} ${ticketWord}`}
                >
                  <span
                    className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 rounded-md bg-foreground px-2 py-1 text-xs whitespace-nowrap text-background opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                    aria-hidden="true"
                  >
                    <span className="font-semibold">{day.count}</span>{" "}
                    {ticketWord} · {formatDateShort(day.date)}
                  </span>
                  <span
                    className="block w-full rounded-t-[4px] bg-primary transition-colors group-hover:bg-primary/80 group-focus-visible:bg-primary/80"
                    style={{
                      height: `${heightPct}%`,
                      minHeight: day.count > 0 ? 2 : 0,
                    }}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="ml-10 flex gap-px pt-1">
        {data.map((day, i) => {
          const showLabel = i % LABEL_STRIDE === 0 || i === data.length - 1;
          return (
            <div
              key={day.date}
              className="flex-1 text-center text-[10px] whitespace-nowrap text-muted-foreground"
            >
              {showLabel ? formatDateShort(day.date) : " "}
            </div>
          );
        })}
      </div>
      {/* Screen-reader/no-hover equivalent of the chart — every value the
          tooltip shows is reachable here too. */}
      <table className="sr-only">
        <caption>Tickets created per day, last 30 days</caption>
        <thead>
          <tr>
            <th>Date</th>
            <th>Tickets</th>
          </tr>
        </thead>
        <tbody>
          {data.map((day) => (
            <tr key={day.date}>
              <td>{formatDateFull(day.date)}</td>
              <td>{day.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default TicketsPerDayChart;
