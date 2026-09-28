// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

/**
 * Plan B5b: `<ReceiptImage path alt />` resolves `path` to a signed URL
 * (`src/lib/data/storage.ts`'s `signedUrl`) and renders it, with an
 * accessible loading state and a fallback if the signed URL cannot be
 * resolved (RLS denial, network error, deleted object).
 */
const { signedUrl } = vi.hoisted(() => ({ signedUrl: vi.fn() }));
vi.mock('@/lib/data/storage', () => ({ signedUrl }));

const { ReceiptImage } = await import('./ReceiptImage');

describe('ReceiptImage', () => {
  beforeEach(() => {
    signedUrl.mockReset();
  });

  it('shows an accessible loading state before the signed URL resolves', () => {
    signedUrl.mockReturnValue(new Promise(() => {})); // never resolves
    render(<ReceiptImage path="expenses/e1/a.jpg" alt="Taco receipt" />);
    expect(screen.getByRole('status')).toHaveAccessibleName(/taco receipt/i);
  });

  it('renders an <img> with the resolved signed URL and the given alt text', async () => {
    signedUrl.mockResolvedValue('https://signed.example/expenses/e1/a.jpg?token=abc');
    render(<ReceiptImage path="expenses/e1/a.jpg" alt="Taco receipt" />);
    const img = await screen.findByRole('img', { name: 'Taco receipt' });
    expect(img).toHaveAttribute('src', 'https://signed.example/expenses/e1/a.jpg?token=abc');
    expect(signedUrl).toHaveBeenCalledWith('expenses/e1/a.jpg', undefined);
  });

  it('shows an accessible fallback when the signed URL cannot be resolved', async () => {
    signedUrl.mockRejectedValue(new Error('object not found'));
    render(<ReceiptImage path="expenses/e1/missing.jpg" alt="Taco receipt" />);
    await waitFor(() => expect(screen.getByRole('img', { name: 'Taco receipt' })).toBeInTheDocument());
    expect(screen.queryByRole('img', { name: 'Taco receipt' })?.tagName).not.toBe('IMG');
  });

  it('re-resolves when the path prop changes', async () => {
    signedUrl.mockResolvedValueOnce('https://signed.example/a.jpg').mockResolvedValueOnce('https://signed.example/b.jpg');
    const { rerender } = render(<ReceiptImage path="expenses/e1/a.jpg" alt="Receipt A" />);
    await screen.findByRole('img', { name: 'Receipt A' });

    rerender(<ReceiptImage path="expenses/e1/b.jpg" alt="Receipt B" />);
    const img = await screen.findByRole('img', { name: 'Receipt B' });
    expect(img).toHaveAttribute('src', 'https://signed.example/b.jpg');
    expect(signedUrl).toHaveBeenCalledTimes(2);
  });
});
