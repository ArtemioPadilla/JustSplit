import React from 'react';
import styles from './Button.module.css';

type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'secondarylight';
type ButtonSize = 'small' | 'medium' | 'large';

type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  type?: 'button' | 'submit' | 'reset'; // Added type prop
  title?: string; // Added for accessibility
  'data-testid'?: string; // Added for testing
};

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  disabled = false,
  onClick,
  children,
  type = 'button', // Default to 'button'
  title,
  'data-testid': dataTestId,
}) => {
  const classNames = `${styles.button} ${styles[variant]} ${styles[size]} ${disabled ? styles.disabled : ''}`;

  return (
    <button 
      className={classNames} 
      onClick={onClick} 
      disabled={disabled} 
      aria-disabled={disabled}
      type={type} // Pass type to the button element
      title={title}
      data-testid={dataTestId}
    >
      {children}
    </button>
  );
};

export default Button;