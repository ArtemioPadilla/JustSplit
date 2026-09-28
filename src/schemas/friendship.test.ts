import { describe, expect, it } from 'vitest';
import { CreateFriendshipInputSchema, FriendshipSchema } from './friendship';

const validFriendship = {
  id: 'friendship1',
  users: ['user1', 'user2'],
  status: 'pending',
  requestedBy: 'user1',
  createdAt: '2026-09-28T00:00:00.000Z',
};

describe('FriendshipSchema (plan B3)', () => {
  it('parses a minimal, valid row', () => {
    expect(() => FriendshipSchema.parse(validFriendship)).not.toThrow();
  });

  it('rejects a users array without exactly two entries', () => {
    expect(() => FriendshipSchema.parse({ ...validFriendship, users: ['user1'] })).toThrow();
    expect(() => FriendshipSchema.parse({ ...validFriendship, users: ['user1', 'user2', 'user3'] })).toThrow();
  });
});

describe('CreateFriendshipInputSchema (plan B3)', () => {
  it('parses a create payload without id/createdAt/updatedAt', () => {
    const { id: _id, createdAt: _createdAt, ...rest } = validFriendship;
    void _id;
    void _createdAt;
    expect(() => CreateFriendshipInputSchema.parse(rest)).not.toThrow();
  });
});
