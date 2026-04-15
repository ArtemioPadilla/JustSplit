// src/__tests__/authContext.test.tsx
import { sanitizeForFirestore } from '../context/AppContext';

describe('AuthContext Firebase fixes', () => {
  describe('sanitizeForFirestore', () => {
    it('should remove undefined values from user data', () => {
      const userData = {
        id: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com',
        balance: 0,
        preferredCurrency: 'USD',
        avatarUrl: undefined, // This should be removed
        phoneNumber: undefined, // This should be removed
      };

      const sanitized = sanitizeForFirestore(userData);

      expect(sanitized).toEqual({
        id: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com',
        balance: 0,
        preferredCurrency: 'USD',
      });

      // Verify undefined fields are not present
      expect(sanitized.avatarUrl).toBeUndefined();
      expect(sanitized.phoneNumber).toBeUndefined();
      expect('avatarUrl' in sanitized).toBe(false);
      expect('phoneNumber' in sanitized).toBe(false);
    });

    it('should preserve defined avatarUrl values', () => {
      const userData = {
        id: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com',
        balance: 0,
        preferredCurrency: 'USD',
        avatarUrl: 'https://example.com/avatar.jpg',
      };

      const sanitized = sanitizeForFirestore(userData);

      expect(sanitized).toEqual({
        id: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com',
        balance: 0,
        preferredCurrency: 'USD',
        avatarUrl: 'https://example.com/avatar.jpg',
      });
    });

    it('should handle empty string avatarUrl correctly', () => {
      const userData = {
        id: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com',
        balance: 0,
        preferredCurrency: 'USD',
        avatarUrl: '', // Empty string should be preserved
      };

      const sanitized = sanitizeForFirestore(userData);

      expect(sanitized.avatarUrl).toBe('');
      expect('avatarUrl' in sanitized).toBe(true);
    });

    it('should handle null avatarUrl correctly', () => {
      const userData = {
        id: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com',
        balance: 0,
        preferredCurrency: 'USD',
        avatarUrl: null, // null should be preserved
      };

      const sanitized = sanitizeForFirestore(userData);

      expect(sanitized.avatarUrl).toBe(null);
      expect('avatarUrl' in sanitized).toBe(true);
    });
  });
});
