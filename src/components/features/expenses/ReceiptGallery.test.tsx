// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReceiptGallery } from './ReceiptGallery';

/**
 * Plan B9: the expense detail island's receipt gallery renders
 * `<ReceiptImage path>` (B5b signed URLs) for each object path and, on
 * click, opens the SAME signed URL in a new tab with the noopener/noreferrer
 * protection `rel="noopener noreferrer"` gives a real anchor — `window.open`'s
 * third-argument string form is the equivalent for a programmatic open
 * (there is no anchor to click: the href isn't known until the signed URL
 * resolves).
 */
const { signedUrl } = vi.hoisted(() => ({ signedUrl: vi.fn() }));
vi.mock('@/lib/data/storage', () => ({ signedUrl }));

const { notifyError } = vi.hoisted(() => ({ notifyError: vi.fn() }));
vi.mock('@/stores/notifications', () => ({ notifyError }));

afterEach(() => {
  vi.clearAllMocks();
});

describe('ReceiptGallery', () => {
  it('renders nothing for an empty path list', () => {
    const { container } = render(<ReceiptGallery paths={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders one image per path, and opens its signed URL in a new tab on click', async () => {
    signedUrl.mockResolvedValue('https://signed.example/receipt.jpg');
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const user = userEvent.setup();

    render(<ReceiptGallery paths={['expenses/e1/a.jpg', 'expenses/e1/b.jpg']} />);

    expect(screen.getAllByRole('button')).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: /receipt 1/i }));

    await waitFor(() => expect(signedUrl).toHaveBeenCalledWith('expenses/e1/a.jpg'));
    expect(openSpy).toHaveBeenCalledWith('https://signed.example/receipt.jpg', '_blank', 'noopener,noreferrer');
  });

  it('shows a generic error toast (never a raw error) if the signed URL cannot be resolved', async () => {
    signedUrl.mockRejectedValue(new Error('403 from storage'));
    const user = userEvent.setup();

    render(<ReceiptGallery paths={['expenses/e1/a.jpg']} />);
    await user.click(screen.getByRole('button', { name: /receipt 1/i }));

    await waitFor(() => expect(notifyError).toHaveBeenCalledTimes(1));
    expect(notifyError.mock.calls[0]![0]).toEqual(expect.any(String));
    expect(notifyError.mock.calls[0]![0]).not.toMatch(/403/);
  });
});
