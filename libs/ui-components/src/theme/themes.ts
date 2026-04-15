import { ThemeType } from './ThemeContext';

// Define color palette
const colors = {
  primary: {
    light: '#3498db',
    dark: '#2980b9'
  },
  secondary: {
    light: '#2ecc71',
    dark: '#27ae60'
  },
  background: {
    light: '#ffffff',
    dark: '#121212'
  },
  text: {
    light: '#333333',
    dark: '#f5f5f5'
  },
  muted: {
    light: '#7f8c8d',
    dark: '#95a5a6'
  },
  card: {
    light: '#f8f9fa',
    dark: '#1e1e1e'
  },
  border: {
    light: '#e0e0e0',
    dark: '#2d2d2d'
  },
  error: {
    light: '#e74c3c',
    dark: '#c0392b'
  },
  success: {
    light: '#2ecc71',
    dark: '#27ae60'
  },
  warning: {
    light: '#f39c12',
    dark: '#d35400'
  }
};

// Define theme variables
export const themeTokens = {
  light: {
    // Colors
    colorPrimary: colors.primary.light,
    colorSecondary: colors.secondary.light,
    colorBackground: colors.background.light,
    colorText: colors.text.light,
    colorMuted: colors.muted.light,
    colorCard: colors.card.light,
    colorBorder: colors.border.light,
    colorError: colors.error.light,
    colorSuccess: colors.success.light,
    colorWarning: colors.warning.light,
    
    // Typography
    fontSizeBase: '1rem',
    fontSizeSm: '0.875rem',
    fontSizeLg: '1.125rem',
    fontSizeXl: '1.25rem',
    fontSizeXxl: '1.5rem',
    
    // Spacing
    spacingXs: '0.25rem',
    spacingSm: '0.5rem',
    spacingMd: '1rem',
    spacingLg: '1.5rem',
    spacingXl: '2rem',
    
    // Border radius
    borderRadiusSm: '0.25rem',
    borderRadiusMd: '0.5rem',
    borderRadiusLg: '1rem',
    
    // Shadow
    shadowSm: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
    shadowMd: '0 4px 6px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.08)',
    shadowLg: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)'
  },
  
  dark: {
    // Colors
    colorPrimary: colors.primary.dark,
    colorSecondary: colors.secondary.dark,
    colorBackground: colors.background.dark,
    colorText: colors.text.dark,
    colorMuted: colors.muted.dark,
    colorCard: colors.card.dark,
    colorBorder: colors.border.dark,
    colorError: colors.error.dark,
    colorSuccess: colors.success.dark,
    colorWarning: colors.warning.dark,
    
    // Typography
    fontSizeBase: '1rem',
    fontSizeSm: '0.875rem',
    fontSizeLg: '1.125rem',
    fontSizeXl: '1.25rem',
    fontSizeXxl: '1.5rem',
    
    // Spacing
    spacingXs: '0.25rem',
    spacingSm: '0.5rem',
    spacingMd: '1rem',
    spacingLg: '1.5rem',
    spacingXl: '2rem',
    
    // Border radius
    borderRadiusSm: '0.25rem',
    borderRadiusMd: '0.5rem',
    borderRadiusLg: '1rem',
    
    // Shadow
    shadowSm: '0 1px 3px rgba(255,255,255,0.05), 0 1px 2px rgba(255,255,255,0.1)',
    shadowMd: '0 4px 6px rgba(255,255,255,0.03), 0 1px 3px rgba(255,255,255,0.04)',
    shadowLg: '0 10px 15px -3px rgba(255,255,255,0.03), 0 4px 6px -2px rgba(255,255,255,0.02)'
  }
};

// Get theme tokens by theme type
export const getThemeTokens = (theme: ThemeType) => {
  return themeTokens[theme];
};