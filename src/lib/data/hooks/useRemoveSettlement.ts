import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as settlementsRepo from '../repos/settlements';

/**
 * Plan B14a: undo your own settlement. `remove()`'s preflight and post-delete
 * verification still throw typed errors (`SettlementDeleteNotAllowedError`,
 * `SettlementDeleteVerificationFailedError`); this hook adds only the standard
 * mutation wiring.
 */
export function useRemoveSettlement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => settlementsRepo.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['settlements'] });
    },
  });
}
