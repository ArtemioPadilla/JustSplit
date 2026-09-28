import { createMemoryAdapter } from './memory-adapter';
import { runStorageAdapterContractSuite, type ContractHarness } from './storage-adapter-contract.shared';

/**
 * Plan B5a: the contract suite against the in-memory adapter — always runs
 * (`npm run test` / `npm run check`). The real-adapter half is
 * `storage-adapter-contract.live.test.ts`, gated on `supabase start`
 * (`npm run test:contract:live`, excluded from `npm run check` the same way
 * the RLS suite is).
 */
function memoryHarness(): ContractHarness {
  const adapter = createMemoryAdapter();
  return {
    adapter,
    collection: 'expenses',
    makeExpense: (overrides = {}) => ({
      description: 'Tacos',
      amount: 100,
      currency: 'MXN',
      paidBy: 'u1',
      splitType: 'equal',
      splits: [{ userId: 'u1', amount: 100 }],
      date: '2026-09-28',
      memberIds: ['u1'],
      createdBy: 'u1',
      createdAt: adapter.serverTimestamp(),
      ...overrides,
    }),
    makeGroup: (overrides = {}) => ({
      name: 'Group',
      type: 'friends',
      currency: 'MXN',
      members: [],
      totalExpenses: 0,
      memberIds: ['u1'],
      adminIds: ['u1'],
      createdBy: 'u1',
      createdAt: adapter.serverTimestamp(),
      ...overrides,
    }),
    makeEvent: (overrides = {}) => ({
      name: 'Trip',
      kind: 'event',
      memberIds: ['u1'],
      createdBy: 'u1',
      createdAt: adapter.serverTimestamp(),
      ...overrides,
    }),
    cleanup: async () => {},
  };
}

runStorageAdapterContractSuite('memory adapter', memoryHarness);
