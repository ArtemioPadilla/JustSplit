# 0014 — Settlements are payments on a ledger; `settledAt` is legacy and read-only

## Status

`Accepted` — `risk:high`. Supersedes the settle-up mechanism of
[0002](./0002-canonical-schema-and-rls.md) ("`settledAt` … written by settle-up in
the same batch as the `Settlement` insert") and of the plan's original B14 entry.

Date: 2026-09-28 (plan B14a; decided by the owner: "best engineering and best UX")

## Context

The plan's B14 said: settle up by writing a `Settlement` **and** marking every
covered expense `settledAt = now`, copied from the legacy `AppContext.addSettlement`.
Every balance in the app was then computed from expenses with `settledAt == null`
and ignored settlements entirely (`expenseCalculator.calculateSettlements*`,
`dashboard.balancesWithUser` / `unsettledCount`, `events.eventStats` /
`eventBalances`).

That model is wrong for any expense with three or more people. Ana pays 90 for a
dinner split between Ana, Beto and Carla (30 each):

1. Beto pays Ana 30. The settle-up marks the dinner `settledAt = now`.
2. The dinner is now excluded from every balance, so **Carla's 30 owed to Ana
   disappears** without Carla paying anything.

It is wrong for the other ordinary cases too: a **partial payment** (Beto pays 10
of 30 — there is no honest value for "settled"), a payment that covers **several
expenses** or only part of one, and a **debt-simplified suggestion** where A pays C
for a debt that came from B's expense (which expense would be "settled"?). It also
needed a second write per settle-up (one `update` per covered expense, in a
`batch_write`) whose only purpose was the flag.

## Decision

### 1. A ledger

A person's balance in a scope is the sum of their split debts and credits over
**every** expense in the scope, **minus the settlements in the scope**
(`src/domain/ledger.ts#netBalances`). Positive = is owed, negative = owes. A
settlement from F to T for amount X in currency C **raises F's balance by X and
lowers T's by X**, converted into the display currency like any expense amount.

- **Settle-up never writes `settledAt` on an expense.** The expense write goes away;
  a settlement is a **single insert** into `settlements`
  (`repos.settlements.settle`, no batch).
- Undoing a settlement is deleting it: no expense was ever changed, so the ledger
  is restored exactly (`repos.settlements.remove`, creator-only).

### 2. `settledAt` is legacy and read-only

It stays in the expense schema because Track D's Firebase import may carry it. An
expense with `settledAt != null` counts as **fully settled and is excluded from
balances**, exactly as before, so imported data stays correct. Nothing in the Astro
app writes it (it is omitted from `CreateExpenseInputSchema`, and the schema
comment says so). Track D must import **either** `settledAt` **or** the
`Settlement` rows that covered those expenses, never both — the ledger would
count the payment twice (a legacy settled expense is already excluded, and its
settlement would then read as an overpayment).

### 3. Derived settled state replaces per-expense flags

- A scope (event, group, or me↔friend) is **settled up** when every net balance in it
  is within 0.01 — strictly below one cent after `round2`, the tolerance the greedy
  suggestion pass has always used (`isSettledUp`).
- **Event progress** = settled amount ÷ (settled amount + outstanding amount),
  in the display currency, where *settled amount* = the sum of the scope's
  settlements plus the value of any legacy settled expense (what its debtors owed:
  the non-payer `splits[]`), and *outstanding amount* = the sum of the positive net
  balances (`settlementProgress`).
- A scope with nothing owed and nothing settled is **"Nothing to settle"** — not 0%
  and not 100% — and shows no progress bar. 100% ("Settled up") is shown only when
  the scope is actually settled up: an open balance never rounds up to 100.
- **Per-expense state.** Nothing per expense can be derived honestly, so:
  the expense detail badge and the list's Status column show **"Settled" only for a
  legacy `settledAt`** and nothing otherwise (the list hides the column when no row
  has one; there is no "Unsettled" badge anywhere); the CSV `Status` column is
  `Settled` for a legacy row and **empty** otherwise (the column stays so positions
  do not shift); `EventTimeline` takes `showSettlementStatus` (default `true`, so
  the showcase is unchanged) and the event islands pass `false` — neutral markers,
  no settled / unsettled / mixed legend.

### 4. Suggestions

`calculateSettlements` / `calculateSettlementsWithConversion` take the scope's
settlements, net them, then run the unchanged greedy minimal-transactions pass.
`expenseIds` on a suggestion (and on a `Settlement`, where the schema keeps the
overflow key) is **informational only**; nothing relies on it for balance maths.
Recording a suggestion "A pays C 30" as a settlement zeroes the scope, because the
ledger nets it against the debts wherever they came from.

### 5. Scopes

| Scope | Expenses | Settlements |
|---|---|---|
| Event | `eventId == id` | `eventId == id` (a real column since B2d) |
| Personal / global (dashboard) | rows that name the viewer (`involvingUser`) | rows that name the viewer, **whatever their `eventId` / `groupId`** — it moves money between two people |
| Friend (`FriendDetailView`) | expenses that name both people | settlements between exactly the two of them, either direction |

A settlement made inside an event therefore also counts in the global and friend
views. That is correct: money moved. A settlement between two *other* people never
enters a person's balances with someone else. The group scope is Track D issue D7.

### 6. Rounding

Round per displayed figure with `round2`; tolerance 0.01 everywhere.

### Client and RLS facts this rests on

`settlements_insert` (migrations 004 and 013) requires: `created_by = auth.uid()`;
the creator to be `from_user_id` or `to_user_id`; `member_ids` to be exactly those
two people; `event_id` null or an event the creator belongs to; and, with a null
`group_id`, every other party to be an **accepted friend** of the creator.
`settlements_delete` is **creator-only**, and there is no update policy.
`settle()` therefore takes `createdBy` from the session (never the caller), refuses a
caller who is neither party with a clear error before the network, writes
`groupId: null`, and writes `eventId` only when the scope is an event. `remove()`
does a fresh-read creator preflight and a re-read afterwards, because a denied
delete is a silent 0-row result — both are client safety checks; RLS is the
authority (permissions stay `enabled: false`).

## Alternatives considered

1. **Per-split settled flags** (`splits[].settledAt`, or a `settledBy` list on the
   expense). Fixes the three-person case but not a partial payment, a payment that
   covers several expenses, or a debt-simplified suggestion (there is no single
   split it pays). It also needs one expense write per settle-up, in a batch that
   must satisfy `expenses_update` for every covered expense — including expenses the
   payer did not create — and re-introduces the flag/payment drift the ledger
   removes. Rejected.
2. **Keep marking expenses settled** (the original B14). Wrong for three or more
   people, partial and simplified payments (the Context above). Rejected.
3. **Derived only, no stored settlements** (compute who paid whom from expenses
   alone). A payment is a real-world event that no expense records; without a
   stored row there is nothing to derive it from. Rejected.
4. **A settlement carries the list of expenses it covers and the app trusts it.**
   The ledger needs no such list, and a list makes "which expense is settled" a
   claim to keep consistent forever. `expenseIds` stays an informational overflow
   key.

## Consequences

**Positive** — a settlement is one insert, so it is trivially atomic and needs no
`batch_write`; the multi-party bug, partial payments and simplified suggestions are
correct by construction; undo is deleting one row; the same `netBalances` feeds the
dashboard, the friend page, the event page and the suggestions, so they cannot
disagree; legacy imported data keeps its meaning.

**Negative** — there is no per-expense "this is paid" any more (an expense's state
is a function of the whole ledger), so the per-expense badge, the CSV status and the
timeline markers lose information, deliberately; an overpayment shows up as a
balance in the other direction rather than being rejected; "outstanding" is net
(debts between the same pair in both directions cancel), which is what the
suggestions already assumed.

**Neutral** — `settledAt` remains in the schema and in `extra`, unused; the trust
model of ADR 0002 is unchanged (see below); `eventId` on a settlement is a column
with a foreign key, so deleting an event ungroups its settlements (their amounts
then count only in the global and friend views).

**Known limitation (not fixed here — no SQL change):** with `group_id` null,
`settlements_insert` requires the counterparty to be an accepted friend of the
creator, so two members of an event who are **not** friends cannot record a
settlement between themselves until Track D D7's group scope (or a policy change
allowing co-members of an event) exists. `settle()` surfaces the database's denial
as an error; B14's island must present it as a plain sentence, not a raw failure.

### Trust statement (ADR 0002, unchanged)

A settlement is an **attestation by `created_by`, not a verified payment**. Either
party — and only a party — may record one, and the history says **"Marked as paid
by <name>"** (names via `useProfiles`), never "paid". Deleting an attestation is
**creator-only**: the other party can read it but cannot remove it, so a payer
cannot erase the payee's record of having been paid, or the reverse. The only
recourse for a false attestation is for its creator to delete it, or for the
disputing party to record a counter-settlement.

## Stakeholder Analysis

| Stakeholder | Impact | Mitigation |
|---|---|---|
| The payer who records a settlement | Their balance with the payee changes at once and visibly to everyone who can see the row (the two parties, plus the members of the event it names). A mistaken row is corrected by deleting it. | `remove()` lets the creator undo it; the amount is whole cents and the parties are named in the input schema. |
| The payee | A payer can attest a payment that never happened, lowering what the payee is owed, and the payee **cannot delete** the row (creator-only). Their balance in every view moves. | The row is labelled "Marked as paid by <name>", never "paid"; the payee can record a counter-settlement (the other direction) to restore the balance; the history shows both rows with dates. Not fixed by a policy change: deletion by the other party would let a payee erase real payments. |
| A third party to a multi-person expense (Carla) | Under the old model another pair's settle-up erased her debt. Now it cannot: her balance changes only by settlements she is a party to. | The ledger nets each person's own debts; tests pin "three-person expense, one pair settles: the third person's debt is intact". |
| Members of an event | They see every settlement of the event with its amount (ADR 0013), and event progress and balances include them; a settlement made in the event also moves the two parties' global and friend balances. | Disclosed here and in the test names; personal figures still count only rows that name the viewer; RLS decides visibility. |
| Users with imported Firebase data | Imported expenses with `settledAt` stay settled and excluded. | Legacy `settledAt` handling is tested; the import must not also import settlements for those expenses (Decision §2). |
| Non-friend event co-members | Cannot record a settlement between themselves today (RLS, see Known limitation). | Surfaced as an error with a plain sentence; Track D D7 / a policy change resolves it. |
| Future contributors | One module (`domain/ledger.ts`) owns balance maths; a new view must use it and pick its scope from the table above. | The scope table here; consumers listed in the plan's B14a entry; the forbidden-import and data-boundary suites still apply. |

## Supersedes

The `settledAt`-in-the-same-batch statement of
[0002](./0002-canonical-schema-and-rls.md) (section "`settledAt` and settlements are
attestations"); the original B14 settle-up bullet of the migration plan. The trust
statement of ADR 0002 stands.

## References

- Spec D9, D10: `docs/superpowers/specs/2026-09-18-inceptor-migration-design.md`
- Plan B14a, B14: `docs/superpowers/plans/2026-09-18-inceptor-migration.md`
- App: `src/domain/ledger.ts`, `src/domain/{expenseCalculator,dashboard,events,csvExport}.ts`,
  `src/lib/data/repos/settlements.ts` (`settle`, `remove`),
  `src/lib/data/hooks/{useSettlements,useSettleUp,useRemoveSettlement}.ts`,
  `src/schemas/{settlement,expense}.ts`
- Policies: `db/migrations/20260928000004_rls_policies.sql` (`settlements_*`),
  `20260928000013_edit_checks_added_members.sql` (`settlements_insert` event check)
- ADR 0002 (attestations), ADR 0013 (event visibility)
