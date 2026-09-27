import * as React from 'react';

/**
 * Returns true after the component has mounted on the client.
 *
 * Why: Recharts' `ResponsiveContainer` measures its parent on first render.
 * Before layout settles it reports `width=-1 height=-1` and logs a console
 * warning in dev mode. Gating the chart render on this hook delays the first
 * Recharts render by one tick — long enough for the parent's `style={height}`
 * to take effect — so the warning never fires.
 *
 * Returning `false` on the first render also means the chart subtree skips
 * the SSR pass entirely. That's fine: every chart wrapper is already mounted
 * via `client:visible`, so there's no SSR output to begin with.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
}
