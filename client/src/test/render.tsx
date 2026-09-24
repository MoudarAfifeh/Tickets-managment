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

  // Wrapped via the `wrapper` option (rather than nesting providers around
  // `ui` directly) so the returned `rerender` re-applies the same providers
  // instead of unmounting them.
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={options?.initialEntries}>
          {children}
        </MemoryRouter>
      </QueryClientProvider>
    );
  }

  return render(ui, { wrapper: Wrapper });
}
