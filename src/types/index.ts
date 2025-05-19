// ...existing code...

export interface User {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  preferredCurrency: string;
  balance: number;
  phoneNumber?: string; // Added
  friends?: string[]; // Added: Array of friend User IDs
  friendRequestsSent?: string[]; // Added: Array of User IDs to whom friend requests were sent
  friendRequestsReceived?: string[]; // Added: Array of User IDs from whom friend requests were received
}

// Add this interface for friendships
export interface Friendship {
  id: string;
  users: string[]; // Array of user IDs
  status: 'pending' | 'accepted' | 'rejected';
  requestedBy: string; // ID of user who sent the request
  createdAt: Date;
  updatedAt: Date;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt?: string;
  members: string[]; // User IDs
  eventIds: string[]; // Event IDs associated with this group
  expenseIds: string[]; // Expense IDs directly associated with this group
}

// ...existing code...