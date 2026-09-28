import { describe, expect, it } from 'vitest';
import { useListing } from './use-listing';

// useListing is a pure function — no React environment needed.

const items = [{ id: 1 }, { id: 2 }, { id: 3 }];

describe('useListing', () => {
  describe('loading state', () => {
    it('returns loading when isLoading is true (regardless of data)', () => {
      const result = useListing({ isLoading: true, error: null, allItems: [], filteredItems: [] });
      expect(result.status).toBe('loading');
    });

    it('returns loading even when data is present (stale-while-reloading)', () => {
      const result = useListing({ isLoading: true, error: null, allItems: items, filteredItems: items });
      expect(result.status).toBe('loading');
    });

    it('loading result has an empty items array', () => {
      const result = useListing({ isLoading: true, error: null, allItems: [], filteredItems: [] });
      expect(result.items).toEqual([]);
    });
  });

  describe('error state', () => {
    it('returns error when error is set and not loading', () => {
      const result = useListing({ isLoading: false, error: new Error('Boom'), allItems: [], filteredItems: [] });
      expect(result.status).toBe('error');
    });

    it('exposes the Error object on the result', () => {
      const err = new Error('Rate limit');
      const result = useListing({ isLoading: false, error: err, allItems: [], filteredItems: [] });
      if (result.status === 'error') {
        expect(result.error).toBe(err);
      } else {
        // Force a test failure if we hit this branch
        expect(result.status).toBe('error');
      }
    });

    it('normalises a non-Error thrown value to an Error', () => {
      // Some fetch libraries throw strings or plain objects
      const result = useListing({ isLoading: false, error: 'string error' as unknown as Error, allItems: [], filteredItems: [] });
      if (result.status === 'error') {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toBe('string error');
      } else {
        expect(result.status).toBe('error');
      }
    });

    it('prioritises loading over error (in-flight retry shows skeleton)', () => {
      const result = useListing({ isLoading: true, error: new Error('stale'), allItems: [], filteredItems: [] });
      expect(result.status).toBe('loading');
    });
  });

  describe('empty-zero state', () => {
    it('returns empty-zero when fetch succeeded and allItems is empty', () => {
      const result = useListing({ isLoading: false, error: null, allItems: [], filteredItems: [] });
      expect(result.status).toBe('empty-zero');
    });
  });

  describe('empty-filtered state', () => {
    it('returns empty-filtered when allItems has data but filteredItems is empty', () => {
      const result = useListing({ isLoading: false, error: null, allItems: items, filteredItems: [] });
      expect(result.status).toBe('empty-filtered');
    });
  });

  describe('ready state', () => {
    it('returns ready with filteredItems when data is present', () => {
      const filtered = [{ id: 2 }];
      const result = useListing({ isLoading: false, error: null, allItems: items, filteredItems: filtered });
      expect(result.status).toBe('ready');
      if (result.status === 'ready') {
        expect(result.items).toEqual(filtered);
      }
    });

    it('returns all items when no filter is applied (filteredItems === allItems)', () => {
      const result = useListing({ isLoading: false, error: null, allItems: items, filteredItems: items });
      expect(result.status).toBe('ready');
      if (result.status === 'ready') {
        expect(result.items).toHaveLength(3);
      }
    });
  });
});
