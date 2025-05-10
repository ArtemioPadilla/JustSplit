import React from 'react';
import styles from './Button.module.css';

type ButtonVariant = 'primary' | 'secondary' | 'tertiary';
type ButtonSize = 'small' | 'medium' | 'large';

type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
};

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  disabled = false,
  onClick,
  children,
}) => {
  const classNames = `${styles.button} ${styles[variant]} ${styles[size]} ${disabled ? styles.disabled : ''}`;

  return (
    <button className={classNames} onClick={onClick} disabled={disabled} aria-disabled={disabled}>
      {children}
    </button>
  );
};

export default Button;