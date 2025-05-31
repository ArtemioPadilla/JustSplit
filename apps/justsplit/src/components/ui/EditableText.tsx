import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import styles from './EditableText.module.css';

interface EditableTextProps {
  value: string;
  onSave: (newValue: string) => void;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
  placeholder?: string;
  maxLength?: number;
}

const EditableText: React.FC<EditableTextProps> = ({
  value,
  onSave,
  className = '',
  as = 'span',
  placeholder = 'Click to edit',
  maxLength = 100,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Update text if external value changes
    setText(value);
  }, [value]);

  useEffect(() => {
    // Focus input when entering edit mode
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleClick = () => {
    setIsEditing(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
  };

  const handleSave = () => {
    if (text.trim()) {
      onSave(text.trim());
    } else {
      setText(value); // Reset to original if empty
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setText(value); // Cancel and reset to original
      setIsEditing(false);
    }
  };

  const handleBlur = () => {
    handleSave();
  };

  // Dynamically create the element based on the "as" prop
  const DisplayComponent = as;

  return (
    <div className={`${styles.editableContainer} ${className}`}>
      {isEditing ? (
        <div className={styles.inputWrapper}>
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={handleInputChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className={styles.editInput}
            maxLength={maxLength}
          />
          <div className={styles.tooltip}>
            Press Enter to save, Esc to cancel
          </div>
        </div>
      ) : (
        <DisplayComponent
          onClick={handleClick}
          className={styles.editableText}
          title="Click to edit"
        >
          {value || placeholder}
          <span className={styles.editIcon}>✏️</span>
        </DisplayComponent>
      )}
    </div>
  );
};

export default EditableText;