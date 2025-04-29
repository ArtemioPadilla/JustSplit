'use client';

import { useState, useRef } from 'react';
import styles from './styles.module.css';

interface ImageUploaderProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ images, onImagesChange }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadError(null);

    const file = files[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload image');
      }

      const data = await response.json();
      
      // Add the new image URL to the existing images array
      onImagesChange([...images, data.url]);
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(error instanceof Error ? error.message : 'Failed to upload image');
    } finally {
      setIsUploading(false);
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    onImagesChange(newImages);
  };

  return (
    <div className={styles.uploader}>
      <div className={styles.imageGrid}>
        {images.map((image, index) => (
          <div key={index} className={styles.imageContainer}>
            <img 
              src={image} 
              alt={`Receipt ${index + 1}`} 
              className={styles.thumbnail} 
            />
            <button 
              type="button" 
              className={styles.removeButton}
              onClick={() => handleRemoveImage(index)}
            >
              ✕
            </button>
          </div>
        ))}
        
        <label className={styles.uploadButton}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleUpload}
            className={styles.fileInput}
            disabled={isUploading}
          />
          {isUploading ? (
            <span>Uploading...</span>
          ) : (
            <>
              <span className={styles.uploadIcon}>+</span>
              <span>Add Image</span>
            </>
          )}
        </label>
      </div>
      
      {uploadError && (
        <div className={styles.errorMessage}>{uploadError}</div>
      )}
      
      <p className={styles.helpText}>
        Upload receipts or other evidence of the expense.
        Supported formats: JPEG, PNG, WebP. Max size: 5MB.
      </p>
    </div>
  );
};

export default ImageUploader;
