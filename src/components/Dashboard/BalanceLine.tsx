import React from 'react';
import styles from '../../app/page.module.css';

interface BalanceLineProps {
  label: string;
  value: number;
  max: number;
  color: string;
  direction: 'left' | 'right';
  onHover: (e: React.MouseEvent) => void;
  onLeave: () => void;
  onClick: (e: React.MouseEvent) => void;
  barLabel?: string;
  barClassName?: string;
  valueClassName?: string;
}

const BalanceLine: React.FC<BalanceLineProps> = ({
  label,
  value,
  max,
  color,
  direction,
  onHover,
  onLeave,
  onClick,
  barLabel,
  barClassName = '',
  valueClassName = '',
}) => {
  const widthPercent = max > 0 ? (Math.abs(value) / max) * 50 : 0; // 50% is half the bar
  return (
    <div className={styles.userBalance}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onClick}
    >
      <div className={styles.userName}>{label}</div>
      <div
        style={{
          position: 'relative',
          height: '16px',
          marginTop: '10px',
          marginBottom: '15px',
          backgroundColor: '#E0E0E0',
          width: '100%',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {/* Center line */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: 0,
            bottom: 0,
            width: '2px',
            background: '#222',
            zIndex: 2,
          }}
        />
        {/* Bar */}
        {value !== 0 && (
          <div
            className={barClassName}
            style={{
              position: 'absolute',
              left: direction === 'left' ? `calc(50% - ${widthPercent}%)` : '50%',
              width: `${widthPercent}%`,
              top: 0,
              height: '100%',
              backgroundColor: color,
              borderRadius: direction === 'left' ? '4px 0 0 4px' : '0 4px 4px 0',
              zIndex: 1,
              transition: 'width 0.3s, left 0.3s',
            }}
          />
        )}
      </div>
      <span className={valueClassName} style={{ width: 80, textAlign: 'right', color, fontWeight: 500 }}>
        {barLabel}
      </span>
    </div>
  );
};

export default BalanceLine;
