'use client';

import { useState, useRef } from 'react';
import styles from './styles.module.css';

interface ImageUploaderProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ 
  images, 
  onImagesChange,
  maxImages = 5
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setIsUploading(true);
    
    const files = Array.from(e.target.files);
    const newImages: string[] = [];
    
    // Process each file
    files.forEach(file => {
      if (!file.type.startsWith('image/')) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          newImages.push(event.target.result as string);
          
          // If we've processed all files, update state
          if (newImages.length === files.length) {
            const combinedImages = [...images, ...newImages].slice(0, maxImages);
            onImagesChange(combinedImages);
            setIsUploading(false);
          }
        }
      };
      
      reader.readAsDataURL(file);
    });
  };
  
  const handleRemoveImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    onImagesChange(newImages);
  };
  
  return (
    <div className={styles.container}>
      {/* Image preview area */}
      <div className={styles.previewArea}>
        {images.length > 0 ? (
          <div className={styles.imagesGrid}>
            {images.map((image, index) => (
              <div key={index} className={styles.imageContainer}>
                <img 
                  src={image} 
                  alt={`Upload ${index + 1}`} 
                  className={styles.previewImage} 
                />
                <button 
                  type="button"
                  onClick={() => handleRemoveImage(index)}
                  className={styles.removeButton}
                  aria-label="Remove image"
                >
                  ✕
                </button>
              </div>
            ))}
            
            {images.length < maxImages && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={styles.addMoreButton}
                disabled={isUploading}
              >
                {isUploading ? 'Uploading...' : `+ Add ${images.length === 0 ? 'Images' : 'More'}`}
              </button>
            )}
          </div>
        ) : (
          <div className={styles.uploadPrompt}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={styles.uploadButton}
              disabled={isUploading}
            >
              {isUploading ? 'Uploading...' : 'Upload Images'}
            </button>
            <p className={styles.uploadText}>
              Upload receipt images or photos of your expenses
            </p>
          </div>
        )}
      </div>
      
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        multiple
        className={styles.fileInput}
      />
    </div>
  );
};

export default ImageUploader;
