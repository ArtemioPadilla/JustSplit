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

  // Determine if this is a money flow (non-zero value)
  const hasFlow = Math.abs(value) > 0;

  // Determine tooltip text based on direction
  const tooltipText =
    direction === 'left' ? 'You owe them money' : 'They owe you money';

  return (
    <div
      className={`${styles.userBalance} ${styles.userBalanceHover}`}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onClick}
      style={{
        padding: '10px',
        borderRadius: '8px',
        transition: 'background-color 0.2s, transform 0.2s',
        cursor: 'pointer',
      }}
    >
      <div className={styles.userName}>
        {label}
        {hasFlow && (
          <span
            style={{
              marginLeft: '8px',
              fontSize: '0.8rem',
              padding: '2px 6px',
              borderRadius: '10px',
              backgroundColor:
                direction === 'left'
                  ? 'rgba(244, 67, 54, 0.1)'
                  : 'rgba(76, 175, 80, 0.1)',
              color: direction === 'left' ? '#F44336' : '#4CAF50',
            }}
            title={tooltipText}
          >
            {direction === 'left' ? 'You owe' : 'Owes you'}
          </span>
        )}
      </div>
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

        {/* Direction indicator */}
        {hasFlow && (
          <div
            style={{
              position: 'absolute',
              [direction === 'left' ? 'right' : 'left']: '50%',
              top: '-16px',
              color: color,
              fontSize: '13px',
              fontWeight: 'bold',
              transform: `translateX(${
                direction === 'left' ? '50%' : '-50%'
              })`,
              zIndex: 3,
            }}
            title={tooltipText}
          >
            <span
            className={styles.directionArrow}
            style={{
              animation: 'pulse 2s infinite',
              display: 'inline-block',
            }}
          >
            {direction === 'left' ? '←' : '→'}
          </span>
          </div>
        )}

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
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          />
        )}
      </div>
      <span
        className={valueClassName}
        style={{
          width: 80,
          textAlign: 'right',
          color,
          fontWeight: 500,
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
        }}
      >
        {barLabel}
        {hasFlow && (
          <span
            style={{
              fontSize: '0.8rem',
              marginLeft: '4px',
              opacity: 0.7,
            }}
            title={`Click for details on ${Math.abs(value)} transactions`}
          >
            ⓘ
          </span>
        )}
      </span>
    </div>
  );
};

export default BalanceLine;
