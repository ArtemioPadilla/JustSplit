export interface App {
  id: string;
  name: string;
  description: string;
  icon: string;
  url: string;
  category: 'finance' | 'productivity' | 'social' | 'utility';
  status: 'active' | 'beta' | 'maintenance' | 'deprecated';
  requiresAuth: boolean;
  minRole?: 'user' | 'admin';
  features: string[];
  createdAt: string;
  updatedAt: string;
}