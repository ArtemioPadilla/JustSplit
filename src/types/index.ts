// ...existing code...

// Add this interface for friendships
export interface Friendship {
  id: string;
  users: string[]; // Array of user IDs
  status: 'pending' | 'accepted' | 'rejected';
  requestedBy: string; // ID of user who sent the request
  createdAt: Date;
  updatedAt: Date;
}

// ...existing code...