import { AppPermission } from './auth';

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