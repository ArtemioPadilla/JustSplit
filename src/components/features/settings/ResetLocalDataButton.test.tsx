// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const { resetLocalData } = vi.hoisted(() => ({ resetLocalData: vi.fn().mockResolvedValue({ ok: true, failures: [] }) }));
vi.mock('@/lib/data/reset-local', () => ({ resetLocalData }));

const { ResetLocalDataButton } = await import('./ResetLocalDataButton');

/**
 * Plan B17b: "Restablecer datos locales" signs the user out, so it needs a
 * confirm step (CLAUDE.md compound-component rule: the whole Dialog
 * composition lives in this one component, same shape as B9's
 * DeleteExpenseDialog / B13's RemoveFriendDialog).
 */
describe('ResetLocalDataButton', () => {
  it('does not call resetLocalData until the confirm dialog is accepted', async () => {
    const user = userEvent.setup();
    render(<ResetLocalDataButton />);

    await user.click(screen.getByRole('button', { name: /restablecer datos locales/i }));
    expect(resetLocalData).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(resetLocalData).not.toHaveBeenCalled();
  });

  it('calls resetLocalData when the confirm dialog is accepted', async () => {
    const user = userEvent.setup();
    render(<ResetLocalDataButton />);

    await user.click(screen.getByRole('button', { name: /restablecer datos locales/i }));
    const dialogConfirm = await screen.findByRole('button', { name: /^confirm reset$/i });
    await user.click(dialogConfirm);

    expect(resetLocalData).toHaveBeenCalledTimes(1);
  });
});
