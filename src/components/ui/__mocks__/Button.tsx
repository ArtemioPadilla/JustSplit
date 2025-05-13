import React from 'react';

// Mock Button component
const Button = ({ children, onClick, variant = 'primary', disabled = false }) => {
  return (
    <button 
      data-testid={`button-${variant}`}
      onClick={onClick}
      disabled={disabled}
      className={`button button-${variant}`}
    >
      {children}
    </button>
  );
};

export default Button;