import React from 'react';

// Mock Button component
const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  disabled = false, 
  className = '' 
}: {
  children: React.ReactNode;
  onClick?: (event?: React.MouseEvent<HTMLButtonElement>) => void; // Updated onClick type
  variant?: string;
  disabled?: boolean;
  className?: string;
}) => {
  return (
    <button 
      data-testid={`button-${variant}`}
      onClick={onClick}
      disabled={disabled}
      className={`button button-${variant} ${className}`} // Added className
    >
      {children}
    </button>
  );
};

export default Button;