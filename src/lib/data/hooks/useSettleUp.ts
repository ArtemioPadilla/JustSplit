import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { SettleInput } from '@/schemas/settlement';
import * as settlementsRepo from '../repos/settlements';

/**
 * Plan B14a: recording a payment is one `settlements` insert (ADR 0014), so
 * only the settlements queries are invalidated — no expense is ever written.
 * The live subscriptions also hear the insert over Realtime.
 */
export function useSettleUp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SettleInput) => settlementsRepo.settle(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['settlements'] });
    },
  });
}
