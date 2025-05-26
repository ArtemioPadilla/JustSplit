import React from 'react';
import styles from './IconButton.module.css';

type IconButtonProps = {
  onClick: () => void;
  variant?: 'sandwich' | 'default' | 'close';
  ariaLabel: string;
  className?: string;
};

const IconButton: React.FC<IconButtonProps> = ({ onClick, variant = 'default', ariaLabel, className }) => {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      className={`${styles.iconButton} ${styles[variant]} ${className || ''}`}
    >
      {variant === 'sandwich' ? (
        <span className={styles.sandwichIcon}>
          <span></span>
          <span></span>
          <span></span>
        </span>
      ) : variant === 'close' ? (
        <span className={styles.closeIcon}>
          <span></span>
          <span></span>
        </span>
      ) : (
        <span className={styles.defaultIcon}></span>
      )}
    </button>
  );
};

export default IconButton;