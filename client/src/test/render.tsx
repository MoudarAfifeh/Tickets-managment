import type { ReactNode } from "react";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

type RenderWithProvidersOptions = {
  // Defaults to ["/"], matching plain MemoryRouter behaviour. Pass e.g.
  // ["/tickets/abc123"] for a page that reads route params via useParams.
  initialEntries?: string[];
};

export function renderWithProviders(
  ui: ReactNode,
  options?: RenderWithProvidersOptions,
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={options?.initialEntries}>
        {ui}
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
