'use client';

import React from 'react';
import styles from './Logo.module.css';

export interface LogoProps {
  /** Logo variant to display */
  variant?: 'default' | 'horizontal' | 'icon';
  /** Size of the logo */
  size?: 'small' | 'medium' | 'large';
  /** Custom width in pixels */
  width?: number;
  /** Custom height in pixels */
  height?: number;
  /** Alternative text for accessibility */
  altText?: string;
  /** Whether to display the CyberEco text alongside the logo */
  showText?: boolean;
  /** Optional click handler */
  onClick?: () => void;
}

export function Logo({
  variant = 'default',
  size = 'medium',
  width,
  height,
  altText = 'CyberEco Logo',
  showText = false,
  onClick,
}: LogoProps) {
  const getLogoSrc = () => {
    switch (variant) {
      case 'horizontal':
        return '/logo-rectangle.svg';
      case 'icon':
        return '/logo-ico.svg';
      default:
        return '/logo-rectangle.svg';
    }
  };

  // Only apply size classes if custom dimensions are not provided
  const sizeClass = !width && !height ? `logo-size-${size}` : '';
  const textSizeClass = `text-${size}`;
  const containerClass = showText ? styles['container-with-text'] : styles.container;
  
  // Apply custom inline styles for width and height if provided
  const imgStyle: React.CSSProperties = {};
  if (width) imgStyle.width = `${width}px`;
  if (height) imgStyle.height = `${height}px`;
  
  return (
    <div 
      className={containerClass} 
      onClick={onClick}
      style={width || height ? { display: 'flex', alignItems: 'center' } : undefined}
    >
      <img 
        src={getLogoSrc()}
        alt={altText}
        className={`${styles.logo} ${sizeClass ? styles[sizeClass] : ''}`}
        style={imgStyle}
      />
      {showText && (
        <span className={`${styles.text} ${styles[textSizeClass]}`}>
          CyberEco
        </span>
      )}
    </div>
  );
}

export default Logo;