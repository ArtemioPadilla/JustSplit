// TimelineEvent type for timeline components
export interface TimelineEvent {
  id: string;
  name: string;
  startDate: string;
  endDate?: string;
  [key: string]: unknown; // Changed from any to unknown
}
// ...existing code...

export interface User {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  preferredCurrency?: string;
  balance: number;
  phoneNumber?: string;
  friends?: string[];
  friendRequestsSent?: string[];
  friendRequestsReceived?: string[];
}

export interface Friendship {
  id: string;
  users: string[];
  status: 'pending' | 'accepted' | 'rejected';
  requestedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt?: string;
  members: string[];
  eventIds: string[];
  expenseIds: string[];
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  currency: string;
  date: string;
  paidBy: string; // User ID
  participants: string[]; // User IDs
  eventId?: string;
  groupId?: string; // Group this expense belongs to
  settled: boolean;
  notes?: string; // Detailed description/notes
  images?: string[]; // Array of image URLs
  splitMethod?: string; // 'equal', 'custom', 'percentage'
  participantShares?: { id: string; name: string; share: number; }[]; // For custom or percentage splits
  category?: string; // Added category property
  createdAt: string; // Added createdAt field
}

export interface TimelineExpense {
  id: string;
  type: string;
  date: string; // Changed from Date to string to match other date fields
  title: string;
  amount: number;
  currency: string;
  category: string; // Changed from any to string
  eventName: string;
  eventId?: string;
  settled: boolean;
  paidBy: string;
  participants: string[];
  userNames: Record<string, string>;
}

export interface Event {
  id: string;
  name: string;
  description?: string;
  date: string;
  startDate: string; // Make required since components depend on it
  endDate?: string;
  location?: string;
  createdAt: string;
  updatedAt?: string;
  createdBy: string;
  members: string[];
  expenseIds: string[];
  groupId?: string;
  preferredCurrency?: string;
}

export interface Settlement {
  id: string;
  fromUser: string;
  toUser: string;
  amount: number;
  currency: string;
  date: string;
  expenseIds: string[];
  eventId?: string;
  method?: string;
  notes?: string;
}

export type Participant = {
  id: string;
  name: string;
  share: number;
};

export interface CategoryData {
  name: string;
  amount: number;
  percentage: number;
}

// ...existing code...