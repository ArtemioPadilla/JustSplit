import * as React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient, attachPersister } from '@/lib/queryClient';

interface QueryProviderProps {
  /** Optional custom idb key (useful for tests / multi-tenant setups). */
  idbKey?: string;
  children: React.ReactNode;
}

/**
 * Per-island QueryClient provider with idb-keyval persistence wired in.
 * Mount this around any island that wants to use useQuery.
 *
 * The client is created once with useState's lazy initializer — never
 * recreated on re-render. attachPersister returns an unsubscribe that
 * runs in the StrictMode-safe useEffect cleanup.
 */
export default function QueryProvider({ idbKey, children }: QueryProviderProps) {
  const [client] = React.useState(() => createQueryClient());

  React.useEffect(() => {
    const detach = attachPersister(client, { idbKey });
    return () => detach();
  }, [client, idbKey]);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
