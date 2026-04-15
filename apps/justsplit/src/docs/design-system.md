# JustSplit Design System

This documentation outlines the design system used throughout the JustSplit application, ensuring consistency in UI components, layout, and user experience.

## Color Palette

### Primary Colors
- **Primary (`--color-primary`)**: #102a49 - Used for main headings, navigation elements, and primary actions
- **Primary Light (`--color-primary-light`)**: #1e3c61 - Used for hover states and secondary elements
- **Primary Dark (`--color-primary-dark`)**: #0a1c30 - Used for active states and emphasis

### Secondary Colors
- **Secondary (`--color-secondary`)**: #4CAF50 - Used for secondary actions, success states, and highlighting
- **Secondary Light (`--color-secondary-light`)**: #6abe6e - Used for hover states on secondary elements
- **Secondary Dark (`--color-secondary-dark`)**: #3d8b40 - Used for active states on secondary elements

### Accent Colors
- **Accent (`--color-accent`)**: #2196F3 - Used for links, accents, and tertiary actions
- **Accent Light (`--color-accent-light`)**: #4dabf5 - Used for hover states on accent elements
- **Accent Dark (`--color-accent-dark`)**: #0c7cd5 - Used for active states on accent elements

### Neutral Colors
- **Background (`--color-background`)**: #FFFFFF - Main background color
- **Surface (`--color-surface`)**: #F5F7FA - Secondary background for cards and sections
- **Text (`--color-text`)**: #333333 - Primary text color
- **Text Secondary (`--color-text-secondary`)**: #757575 - Secondary, less important text
- **Border (`--color-border`)**: #E0E0E0 - Borders for UI elements
- **Divider (`--color-divider`)**: #EEEEEE - Subtle divider lines

### Feedback Colors
- **Success (`--color-success`)**: #4CAF50 - Success states and confirmations
- **Error (`--color-error`)**: #F44336 - Error states and warnings
- **Warning (`--color-warning`)**: #FF9800 - Warning states and cautions
- **Info (`--color-info`)**: #2196F3 - Informational states

## Typography

### Font Families
- **Base Font (`--font-family-base`)**: 'Arial', sans-serif - Used for general text content
- **Heading Font (`--font-family-heading`)**: 'Arial', sans-serif - Used for headings

### Font Sizes
- **Extra Small (`--font-size-xs`)**: 0.75rem (12px) - Small labels, captions
- **Small (`--font-size-sm`)**: 0.875rem (14px) - Secondary text, helper text
- **Medium (`--font-size-md`)**: 1rem (16px) - Body text
- **Large (`--font-size-lg`)**: 1.125rem (18px) - Large body text, small headings
- **Extra Large (`--font-size-xl`)**: 1.25rem (20px) - Subheadings
- **2XL (`--font-size-2xl`)**: 1.5rem (24px) - H3 headings
- **3XL (`--font-size-3xl`)**: 1.875rem (30px) - H2 headings
- **4XL (`--font-size-4xl`)**: 2.25rem (36px) - H1 headings

### Font Weights
- **Regular (`--font-weight-regular`)**: 400
- **Medium (`--font-weight-medium`)**: 500
- **Bold (`--font-weight-bold`)**: 700

### Line Heights
- **Tight (`--line-height-tight`)**: 1.25 - Headings
- **Normal (`--line-height-normal`)**: 1.5 - Body text
- **Relaxed (`--line-height-relaxed`)**: 1.75 - Large blocks of text

## Spacing

A consistent spacing scale ensures proper layout rhythm throughout the application.

- **Extra Small (`--space-xs`)**: 0.25rem (4px)
- **Small (`--space-sm`)**: 0.5rem (8px)
- **Medium (`--space-md`)**: 1rem (16px)
- **Large (`--space-lg`)**: 1.5rem (24px)
- **Extra Large (`--space-xl`)**: 2rem (32px)
- **2XL (`--space-2xl`)**: 3rem (48px)
- **3XL (`--space-3xl`)**: 4rem (64px)

## Borders

### Border Radius
- **Small (`--border-radius-sm`)**: 0.25rem (4px)
- **Medium (`--border-radius-md`)**: 0.375rem (6px)
- **Large (`--border-radius-lg`)**: 0.5rem (8px)
- **Full (`--border-radius-full`)**: 9999px (circular)

### Border Width
- **Thin (`--border-width-thin`)**: 1px
- **Medium (`--border-width-medium`)**: 2px
- **Thick (`--border-width-thick`)**: 4px

## Shadows

- **Small (`--shadow-sm`)**: Subtle shadow for hover states
- **Medium (`--shadow-md`)**: Standard shadow for cards and elements
- **Large (`--shadow-lg`)**: Pronounced shadow for elevated elements
- **Extra Large (`--shadow-xl`)**: Deep shadow for modal dialogs and popovers

## Transitions

- **Fast (`--transition-fast`)**: 150ms - Quick interface reactions
- **Normal (`--transition-normal`)**: 250ms - Standard transitions
- **Slow (`--transition-slow`)**: 350ms - Elaborate animations

### Timing Functions
- **Default (`--transition-timing-default`)**: cubic-bezier(0.4, 0, 0.2, 1)
- **In (`--transition-timing-in`)**: cubic-bezier(0.4, 0, 1, 1)
- **Out (`--transition-timing-out`)**: cubic-bezier(0, 0, 0.2, 1)

## Z-index Scale

- **Dropdown (`--z-index-dropdown`)**: 1000
- **Sticky (`--z-index-sticky`)**: 1100
- **Fixed (`--z-index-fixed`)**: 1200
- **Modal Backdrop (`--z-index-modal-backdrop`)**: 1300
- **Modal (`--z-index-modal`)**: 1400
- **Popover (`--z-index-popover`)**: 1500
- **Tooltip (`--z-index-tooltip`)**: 1600

## Components

### Buttons

Buttons follow a consistent style with variations for different use cases:

- **Primary**: Used for the main action on a page
- **Secondary**: Used for alternative actions
- **Tertiary/Text**: Used for less important actions

Each button has normal, hover, active, and disabled states with appropriate visual feedback.

### Forms

Form elements maintain consistent styling:

- Text inputs
- Select dropdowns
- Checkboxes
- Radio buttons
- Textareas

### Cards

Card components for containing related information:

- Standard cards
- Interactive cards
- Outlined cards

### Data Visualization

Components for displaying data:

- Progress bars
- Charts
- Timelines

## Usage Guidelines

### Layout Principles

- Use consistent spacing between elements
- Maintain proper hierarchy with typography and color
- Use responsive design principles for different screen sizes

### Accessibility

- Ensure sufficient color contrast (WCAG AA compliance)
- Provide focus styles for keyboard navigation
- Use semantic HTML elements

### Responsive Design

- Mobile-first approach
- Breakpoints at standard device sizes

## Implementation

The design system is implemented using CSS variables and can be applied to any component. Import the theme file in your component or use global styles for application-wide consistency.

```css
/* Example usage in a component */
.myComponent {
  color: var(--color-primary);
  font-size: var(--font-size-md);
  padding: var(--space-md);
}
```