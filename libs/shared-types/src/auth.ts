export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
}

export interface AuthToken {
  uid: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  exp?: number;
}

export interface AppPermission {
  appId: string;
  role: 'user' | 'admin' | 'owner';
  grantedAt: string;
}