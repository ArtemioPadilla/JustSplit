import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDate } from '@/domain/formatters';
import { withBase } from '@/lib/href';
import type { Event } from '@/schemas/event';

export interface UpcomingEventsProps {
  /** `domain/dashboard.ts#upcomingEvents` output — already soonest-first, capped at 3. */
  events: Event[];
}

/**
 * Upcoming events widget (plan B8b) over the B8a `upcomingEvents` selector.
 * Links each event to `/events/<id>` (`src/lib/app-routes.ts`'s real route
 * shape).
 */
export function UpcomingEvents({ events }: UpcomingEventsProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <p className="text-sm font-medium text-muted-foreground">Upcoming events</p>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <EmptyState title="No upcoming events" description="Events you create will show up here." />
        ) : (
          <ul className="divide-y divide-border">
            {events.map((event) => {
              const start = event.startDate ?? event.date;
              return (
                <li key={event.id} className="py-3">
                  <a href={withBase(`/events/${event.id}`)} className="font-medium text-foreground hover:underline">
                    {event.name}
                  </a>
                  <p className="text-xs text-muted-foreground">
                    {event.location ?? 'No location'}
                    {start && ` · ${formatDate(start)}`}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
