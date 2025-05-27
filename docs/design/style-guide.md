# CyberEco Platform Design System

> **🌿 Human-Centered Design Philosophy**: This design system embodies CyberEco's commitment to wellbeing by design, creating interfaces that enhance rather than exploit human attention while fostering meaningful digital interactions.

## 🎯 Design Principles

Our design system is built on CyberEco's core values:

- **🔐 Digital Sovereignty**: Interfaces that empower user control and transparency
- **🌱 Wellbeing by Design**: Visual design that promotes calm, focused interaction
- **🤝 Community Connection**: Elements that encourage authentic social engagement
- **🔓 Open by Nature**: Accessible, inclusive design for all users

## Platform Architecture

### Human-Centered Applications
- **Hub App** (`apps/hub`): Mindful authentication and ecosystem navigation
- **JustSplit App** (`apps/justsplit`): Conscious expense sharing and financial wellbeing

### Shared Design Libraries
- **UI Components** (`libs/ui-components`): Human-centered component library
- **Shared Types** (`libs/shared-types`): Consistent design pattern definitions
- **Firebase Config** (`libs/firebase-config`): Transparent data interaction patterns

## Design System Hierarchy

### Global Design Tokens
Defined at the platform level and consumed by all applications.

### App-Specific Customizations
Each application can extend the global design system with app-specific styles while maintaining consistency.

## Typography

- **Font Family**: 
  - Primary: `Arial, sans-serif`
  - Secondary: `Georgia, serif`

- **Font Sizes**:
  - Heading 1: `32px`
  - Heading 2: `24px`
  - Heading 3: `20px`
  - Body Text: `16px`
  - Small Text: `14px`

- **Font Weights**:
  - Normal: `400`
  - Bold: `700`

## Color Scheme

- **Primary Color**: 
  - Hex: `#4CAF50` (Green)
  
- **Secondary Color**: 
  - Hex: `#FF9800` (Orange)

- **Background Color**: 
  - Hex: `#FFFFFF` (White)

- **Text Color**: 
  - Hex: `#333333` (Dark Gray)

- **Link Color**: 
  - Hex: `#2196F3` (Blue)

## Buttons

- **Primary Button**:
  - Background Color: `#4CAF50`
  - Text Color: `#FFFFFF`
  - Border Radius: `4px`
  - Padding: `10px 20px`
  - Hover Effect: Background color changes to `#45A049`

- **Secondary Button**:
  - Background Color: `#FF9800`
  - Text Color: `#FFFFFF`
  - Border Radius: `4px`
  - Padding: `10px 20px`
  - Hover Effect: Background color changes to `#FB8C00`

## Spacing

- **Margin and Padding**:
  - Small: `8px`
  - Medium: `16px`
  - Large: `24px`

## Icons

- Use icons from the **Font Awesome** library for consistency.
- Ensure icons are sized appropriately (24px x 24px) and maintain a consistent color scheme.

## Branding Elements

- **Logo**: 
  - Ensure the logo is used consistently across all platforms.
  - Maintain clear space around the logo equal to the height of the logo itself.

- **Imagery**: 
  - Use high-quality images that reflect the theme of shared experiences and collaboration.
  - Ensure images are optimized for web use to maintain performance.

## Accessibility

- Ensure all text has a contrast ratio of at least `4.5:1` against the background.
- Use `alt` attributes for all images to improve screen reader accessibility.
- Ensure interactive elements are keyboard navigable.

## Conclusion

This style guide serves as a reference for maintaining consistency across the JustSplit platform's multiple applications. Adhering to these guidelines will help create a cohesive and user-friendly experience across the entire platform ecosystem.

---

## Application-Specific Styling

### Hub App Styling (`apps/hub`)

The Hub app serves as the central authentication and application management interface.

#### Color Scheme Variations
- **Primary Accent**: `#1976D2` (Hub Blue) - Used for authentication flows
- **Secondary Accent**: `#FFC107` (Warning/Notification Orange)
- **Background Gradient**: Subtle gradient from `#F8F9FA` to `#FFFFFF`

#### Typography Hierarchy
- **Hub Title**: `36px` - Used for the main platform branding
- **App Card Titles**: `18px` - For application cards in the hub
- **Navigation**: `14px` - Hub navigation elements

#### Component Specifications
- **Application Cards**: 
  - Border Radius: `8px`
  - Box Shadow: `0 2px 8px rgba(0,0,0,0.1)`
  - Padding: `20px`
  - Hover Effect: Lift with `0 4px 16px rgba(0,0,0,0.15)`

- **Authentication Forms**:
  - Max Width: `400px`
  - Border Radius: `12px`
  - Background: `#FFFFFF` with subtle border
  - Input Height: `48px`

#### Layout Guidelines
- **Container Max Width**: `1200px`
- **Grid System**: 12-column grid with `24px` gutters
- **Header Height**: `64px`
- **Sidebar Width**: `280px` (when applicable)

### JustSplit App Styling (`apps/justsplit`)

The JustSplit app focuses on expense tracking and financial management.

#### Color Scheme Variations
- **Primary Green**: `#4CAF50` (Money/Success Green)
- **Expense Red**: `#F44336` (Debt/Expense Red)
- **Settlement Blue**: `#2196F3` (Payment/Settlement Blue)
- **Background**: Clean white with subtle gray accents

#### Typography Hierarchy
- **Amount Display**: `28px` bold - For displaying monetary amounts
- **Currency Labels**: `14px` - Currency symbols and codes
- **Balance Text**: `16px` - User balance displays
- **Transaction Details**: `14px` - Expense descriptions and details

#### Component Specifications
- **Expense Cards**:
  - Border Radius: `6px`
  - Border Left: `4px solid` (color based on status)
  - Padding: `16px`
  - Background: `#FFFFFF`

- **Balance Summary**:
  - Large typography for amounts
  - Color-coded positive/negative balances
  - Subtle background highlighting

- **Settlement Buttons**:
  - Rounded corners: `20px`
  - Gradient backgrounds for actions
  - Icon + text combinations

#### Financial Display Guidelines
- **Positive Amounts**: `#4CAF50` (Green)
- **Negative Amounts**: `#F44336` (Red)
- **Neutral/Zero**: `#757575` (Gray)
- **Currency Formatting**: Consistent decimal places, proper symbols

---

## Shared Component Library (`libs/ui-components`)

### Component Architecture
All shared components follow a consistent API and theming approach.

#### Theme Structure
```css
:root {
  /* Global Tokens */
  --color-primary: #4CAF50;
  --color-secondary: #FF9800;
  --color-background: #FFFFFF;
  --color-text: #333333;
  --color-link: #2196F3;
  
  /* App-specific overrides via CSS custom properties */
  --app-accent: var(--color-primary); /* Overridden per app */
  --app-background: var(--color-background);
}

/* Hub-specific overrides */
.hub-theme {
  --app-accent: #1976D2;
  --app-secondary: #FFC107;
}

/* JustSplit-specific overrides */
.justsplit-theme {
  --app-accent: #4CAF50;
  --app-expense-color: #F44336;
  --app-settlement-color: #2196F3;
}
```

#### Component Props Interface
All shared components accept theme and variant props:

```typescript
interface BaseComponentProps {
  theme?: 'hub' | 'justsplit' | 'default';
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  className?: string;
}
```

### Responsive Design Standards

#### Breakpoints
- **Mobile**: `0px - 767px`
- **Tablet**: `768px - 1023px`
- **Desktop**: `1024px+`

#### Grid System
- **Mobile**: Single column layout
- **Tablet**: 2-3 column layout depending on content
- **Desktop**: Up to 4 column layout with sidebar support

#### Typography Scaling
- **Mobile**: Base font size `14px`
- **Tablet**: Base font size `15px`
- **Desktop**: Base font size `16px`

---

## Implementation Guidelines

### CSS Architecture
- **Shared Styles**: Located in `libs/ui-components/styles/`
- **App Styles**: Located in each app's `src/styles/` directory
- **Component Styles**: Co-located with components using CSS Modules

### Theme Application
1. **Global Theme**: Applied at the platform level
2. **App Theme**: Applied at the app root component
3. **Component Overrides**: Applied at individual component level

### Development Workflow
1. **Design in Shared Library**: Create base components in `libs/ui-components`
2. **Theme per App**: Apply app-specific themes at application level
3. **Document Variations**: Update this style guide with app-specific patterns
4. **Test Across Apps**: Ensure consistency and proper theming

### Maintenance and Updates
- **Version Control**: Shared components follow semantic versioning
- **Breaking Changes**: Coordinate updates across all consuming apps
- **Documentation**: Keep this style guide updated with new patterns
- **Design Tokens**: Centralize token updates in shared library

This comprehensive style guide ensures visual consistency while providing flexibility for app-specific needs within the JustSplit platform's NX monorepo architecture.