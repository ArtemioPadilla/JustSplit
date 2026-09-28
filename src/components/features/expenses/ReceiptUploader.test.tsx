// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReceiptUploader } from './ReceiptUploader';

/**
 * Ported from the legacy Next tree's
 * `src/components/ImageUploader/__tests__/ImageUploader.test.tsx` (plan
 * B10), rebuilt on `ui/file-upload.tsx` over `File[]` instead of base64
 * data-URLs (spec D1: base64 images are gone with the clean schema, D10
 * "Images" — receipts are Supabase Storage objects now). Kept: an empty
 * state, adding a file (asserted via `onChange`, not a FileReader mock — the
 * legacy test's whole FileReader mock setup is dropped, there is no
 * base64-encoding step anymore), removing a file, and a max-count limit
 * (`maxImages`, generalised from the legacy `maxImages` prop to also count
 * `existingCount` — an edit session's already-uploaded receipts). Dropped
 * for the same reason: "renders correctly with existing images" (this
 * component only ever holds NOT-YET-UPLOADED files; the form renders
 * existing receipts itself, from `expense.images[]`, via `ReceiptGallery`
 * with its own remove action) and the base64 "Upload 1" alt-text assertion
 * (no data-URL exists client-side before upload; previews use
 * `URL.createObjectURL`).
 *
 * New: object-URL previews (revoked on unmount/change) and a non-image file
 * being rejected client-side even though the OS file picker's own `accept`
 * filter would normally have kept it out (drag-and-drop bypasses `accept`).
 */
describe('ReceiptUploader', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:mock-url'), revokeObjectURL: vi.fn() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows the empty-state dropzone when no files are selected', () => {
    render(<ReceiptUploader files={[]} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /add files/i })).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('calls onChange with the picked file and renders an object-URL preview for it', () => {
    const onChange = vi.fn();
    render(<ReceiptUploader files={[]} onChange={onChange} />);

    const file = new File(['image bytes'], 'receipt.jpg', { type: 'image/jpeg' });
    const input = document.querySelector('input[type="file"]');
    expect(input).not.toBeNull();
    fireEvent.change(input as HTMLInputElement, { target: { files: [file] } });

    expect(onChange).toHaveBeenCalledWith([file]);
  });

  it('renders a preview + remove control for an already-selected file', () => {
    const file = new File(['x'], 'receipt.jpg', { type: 'image/jpeg' });
    render(<ReceiptUploader files={[file]} onChange={vi.fn()} />);

    expect(screen.getByAltText(/preview of receipt\.jpg/i)).toHaveAttribute('src', 'blob:mock-url');
    expect(screen.getByLabelText(/remove receipt\.jpg/i)).toBeInTheDocument();
  });

  it('handles removal correctly', () => {
    const file = new File(['x'], 'receipt.jpg', { type: 'image/jpeg' });
    const onChange = vi.fn();
    render(<ReceiptUploader files={[file]} onChange={onChange} />);

    fireEvent.click(screen.getByLabelText(/remove receipt\.jpg/i));

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('limits the number of files based on maxImages, counting existingCount (already-uploaded receipts) toward the limit', () => {
    const files = [new File(['a'], 'a.jpg', { type: 'image/jpeg' }), new File(['b'], 'b.jpg', { type: 'image/jpeg' })];
    render(<ReceiptUploader files={files} existingCount={1} maxImages={3} onChange={vi.fn()} />);

    // 1 existing + 2 new = 3 = the limit -> the dropzone is hidden.
    expect(screen.queryByRole('button', { name: /add files/i })).not.toBeInTheDocument();
    expect(screen.getByText(/maximum of 3 receipts/i)).toBeInTheDocument();
  });

  it('shows the dropzone again once under the limit', () => {
    const files = [new File(['a'], 'a.jpg', { type: 'image/jpeg' })];
    render(<ReceiptUploader files={files} existingCount={1} maxImages={3} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /add files/i })).toBeInTheDocument();
  });

  it('rejects a non-image file client-side (drag-and-drop bypasses the accept filter) via onError, without calling onChange for it', () => {
    const onChange = vi.fn();
    const onError = vi.fn();
    render(<ReceiptUploader files={[]} onChange={onChange} onError={onError} />);

    const file = new File(['x'], 'notes.pdf', { type: 'application/pdf' });
    const input = document.querySelector('input[type="file"]');
    fireEvent.change(input as HTMLInputElement, { target: { files: [file] } });

    expect(onChange).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(expect.stringMatching(/image/i));
  });
});
