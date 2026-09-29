import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserAvatar } from '@/components/features/profile/UserAvatar';
import { splitBalances, type BalanceEntry } from '@/domain/settlements';
import { cn } from '@/lib/utils';
import { money, personName } from './labels';

export interface BalancePanelProps {
  /** `netBalances` over the scope, in the display currency (positive = is owed). Only read once `ready`. */
  balances: Record<string, number>;
  viewerId: string;
  names: Record<string, string>;
  avatars: Record<string, string | null>;
  displayCurrency: string;
  /** Rates resolved for the display currency; no amount is shown before this. */
  ready: boolean;
  approximate: boolean;
  /** `useDisplayConversion().rates`: every converted currency, never the display currency itself. */
  rates: Record<string, { rate: number; isFallback: boolean }>;
}

const ATTRIBUTION_URL = 'https://www.exchangerate-api.com';

/**
 * The Balances tab's panel (plan B14b): the scope's net balance per person
 * (`ledger.netBalances`, ADR 0014), split into who owes and who is owed, every
 * amount in the display currency, then the table of exchange rates that
 * conversion used (the legacy page's "Exchange Rates Used"). Words and headings
 * carry the meaning; colour is never the only cue.
 */
export function BalancePanel({ balances, viewerId, names, avatars, displayCurrency, ready, approximate, rates }: BalancePanelProps) {
  if (!ready) {
    return (
      <section aria-labelledby="balances-heading" className="flex flex-col gap-4" aria-busy="true">
        <h2 id="balances-heading" className="text-lg font-semibold text-foreground">
          Balances
        </h2>
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </section>
    );
  }

  const { owes, owed } = splitBalances(balances);
  const rateRows = Object.entries(rates).sort(([a], [b]) => (a < b ? -1 : 1));

  return (
    <section aria-labelledby="balances-heading" className="flex flex-col gap-6">
      <h2 id="balances-heading" className="text-lg font-semibold text-foreground">
        Balances
      </h2>

      {owes.length === 0 && owed.length === 0 ? (
        <p className="text-sm text-foreground">Everyone is settled up.</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          <BalanceList id="balances-owes" title="Owes" entries={owes} {...{ viewerId, names, avatars, displayCurrency }} />
          <BalanceList id="balances-owed" title="Is owed" entries={owed} {...{ viewerId, names, avatars, displayCurrency }} />
        </div>
      )}

      {approximate && <p className="text-xs text-muted-foreground">* Some amounts use approximate rates</p>}

      {rateRows.length > 0 && (
        <section aria-labelledby="rates-heading" className="flex flex-col gap-2">
          <h3 id="rates-heading" className="text-sm font-medium text-foreground">
            Exchange rates used
          </h3>
          <p className="text-sm text-muted-foreground">Every amount in another currency is converted into {displayCurrency} with these rates.</p>
          <Table aria-labelledby="rates-heading">
            <TableHeader>
              <TableRow>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rateRows.map(([code, { rate, isFallback }]) => (
                <TableRow key={code}>
                  <TableCell>{code}</TableCell>
                  <TableCell>{displayCurrency}</TableCell>
                  <TableCell>{`1 ${code} = ${rate.toFixed(4)} ${displayCurrency}`}</TableCell>
                  <TableCell>{isFallback ? 'Approximate' : 'Live'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <a
            href={ATTRIBUTION_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="self-end text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Rates By Exchange Rate API
          </a>
        </section>
      )}
    </section>
  );
}

interface BalanceListProps extends Pick<BalancePanelProps, 'viewerId' | 'names' | 'avatars' | 'displayCurrency'> {
  id: string;
  title: string;
  entries: BalanceEntry[];
}

function BalanceList({ id, title, entries, viewerId, names, avatars, displayCurrency }: BalanceListProps) {
  return (
    <div className="flex flex-col gap-2">
      <h3 id={id} className="text-sm font-medium text-muted-foreground">
        {title}
      </h3>
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nobody.</p>
      ) : (
        <ul aria-labelledby={id} className="flex flex-col gap-2">
          {entries.map((entry) => {
            const name = personName(entry.userId, viewerId, names, { capitalize: true });
            return (
              <li key={entry.userId} className="flex items-center justify-between gap-4 rounded-md border border-border px-4 py-3 text-sm">
                <span className="flex items-center gap-2">
                  <span aria-hidden="true">
                    <UserAvatar src={avatars[entry.userId]} name={names[entry.userId] ?? 'Unknown'} alt="" className="size-7" />
                  </span>
                  <span className="font-medium text-foreground">{name}</span>
                </span>
                <span className={cn('font-semibold text-foreground')}>{money(entry.amount, displayCurrency)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
