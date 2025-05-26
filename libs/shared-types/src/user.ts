export interface HubUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: string;
  updatedAt: string;
  preferences: {
    theme: 'light' | 'dark' | 'system';
    language: string;
  };
  permissions: {
    [appId: string]: AppPermission;
  };
}

export interface AppPermission {
  role: 'user' | 'admin' | 'owner';
  grantedAt: string;
  grantedBy: string;
}