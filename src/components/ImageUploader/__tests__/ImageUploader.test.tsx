import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ImageUploader from '../index';

// Setup mocks for FileReader
const originalFileReader = window.FileReader;
const mockFileReaders = [];

// Create a custom mock for FileReader
beforeEach(() => {
  mockFileReaders.length = 0;
  window.FileReader = jest.fn(() => {
    const reader = {
      readAsDataURL: jest.fn(),
      onload: null,
    };
    mockFileReaders.push(reader);
    return reader;
  });
});

afterEach(() => {
  window.FileReader = originalFileReader;
});

describe('ImageUploader Component', () => {
  const mockImages = ['data:image/jpeg;base64,test-image-data'];
  const mockOnImagesChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with existing images', () => {
    render(<ImageUploader images={mockImages} onImagesChange={mockOnImagesChange} />);
    
    // Check if the existing image is displayed
    const imagePreview = screen.getByAltText('Upload 1');
    expect(imagePreview).toBeInTheDocument();
    expect(imagePreview).toHaveAttribute('src', mockImages[0]);
    
    // Check if remove button is visible
    expect(screen.getByLabelText('Remove image')).toBeInTheDocument();
  });

  it('shows empty state when no images are provided', () => {
    render(<ImageUploader images={[]} onImagesChange={mockOnImagesChange} />);
    
    // Check for upload prompt text
    expect(screen.getByText('Upload receipt images or photos of your expenses')).toBeInTheDocument();
    expect(screen.getByText('Upload Images')).toBeInTheDocument();
  });

  it('handles file upload correctly', async () => {
    render(<ImageUploader images={[]} onImagesChange={mockOnImagesChange} />);
    
    // Create a mock file
    const file = new File(['test image content'], 'test-image.jpg', { type: 'image/jpeg' });
    
    // Get the file input (it's hidden, so we'll need to find it by its type)
    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).not.toBeNull();
    
    // Simulate file selection
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    // Simulate FileReader onload event with a base64 result
    const mockResult = 'data:image/jpeg;base64,test-image-data';
    const mockReader = mockFileReaders[0];
    mockReader.result = mockResult;
    mockReader.onload({ target: mockReader });
    
    // Wait for state updates
    await waitFor(() => {
      expect(mockOnImagesChange).toHaveBeenCalledWith([mockResult]);
    });
  });

  it('handles image removal correctly', () => {
    render(<ImageUploader images={mockImages} onImagesChange={mockOnImagesChange} />);
    
    // Find and click the remove button
    const removeButton = screen.getByLabelText('Remove image');
    fireEvent.click(removeButton);
    
    // Check if onImagesChange was called with an empty array
    expect(mockOnImagesChange).toHaveBeenCalledWith([]);
  });

  it('limits the number of images based on maxImages prop', async () => {
    // Create mock images at the limit (3 in this case)
    const images = [
      'data:image/jpeg;base64,image1',
      'data:image/jpeg;base64,image2',
      'data:image/jpeg;base64,image3'
    ];
    
    render(<ImageUploader 
      images={images} 
      onImagesChange={mockOnImagesChange} 
      maxImages={3} 
    />);
    
    // Check we don't see the add more button when at limit
    expect(screen.queryByText(/\+ Add More/)).not.toBeInTheDocument();
    
    // Now remove one image to get under the limit
    const removeButton = screen.getAllByLabelText('Remove image')[0];
    fireEvent.click(removeButton);
    
    // Now we should see the add button again
    expect(mockOnImagesChange).toHaveBeenCalledWith([
      'data:image/jpeg;base64,image2',
      'data:image/jpeg;base64,image3'
    ]);
  });
});
