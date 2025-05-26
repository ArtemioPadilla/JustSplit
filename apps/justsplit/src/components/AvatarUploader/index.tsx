'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import styles from './styles.module.css';

interface AvatarUploaderProps {
  avatarUrl: string | null;
  onAvatarChange: (avatarUrl: string) => void;
  name: string;
}

const AvatarUploader: React.FC<AvatarUploaderProps> = ({ 
  avatarUrl, 
  onAvatarChange,
  name
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setIsUploading(true);
    
    const file = e.target.files[0];
    if (!file.type.startsWith('image/')) {
      setIsUploading(false);
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        onAvatarChange(event.target.result as string);
        setIsUploading(false);
        
        // Reset file input to allow selecting same file again
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    
    reader.readAsDataURL(file);
  };
  
  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };
  
  return (
    <div className={styles.container}>
      <div 
        className={styles.avatarContainer}
        onClick={() => fileInputRef.current?.click()}
      >
        {avatarUrl ? (
          <Image 
            src={avatarUrl} 
            alt={`${name}&apos;s avatar`} 
            className={styles.avatarImage}
            width={100}
            height={100}
          />
        ) : (
          <div className={styles.avatarPlaceholder}>
            <span>{getInitials(name)}</span>
          </div>
        )}
        
        <div className={styles.avatarOverlay}>
          <div className={styles.avatarUploadIcon}>
            {isUploading ? '...' : '📷'}
          </div>
        </div>
      </div>
      
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className={styles.fileInput}
        aria-label="Upload profile picture"
      />
      
      <p className={styles.helpText}>Click to change profile photo</p>
    </div>
  );
};

export default AvatarUploader;
