import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ImageUploader from '../index';

// Mock fetch for uploading images
global.fetch = jest.fn().mockImplementation(() => 
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ url: 'https://example.com/test-image.jpg' })
  })
);

// Mock file reading
const mockFileReader = {
  readAsDataURL: jest.fn(),
  onload: null,
  result: 'data:image/jpeg;base64,test-image-data'
};

window.FileReader = jest.fn(() => mockFileReader);

describe('ImageUploader Component', () => {
  const mockImages = ['https://example.com/image1.jpg'];
  const mockOnImagesChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with existing images', () => {
    render(<ImageUploader images={mockImages} onImagesChange={mockOnImagesChange} />);
    
    // Check if the existing image is displayed
    const imagePreview = screen.getByAltText('Uploaded image 1');
    expect(imagePreview).toHaveAttribute('src', 'https://example.com/image1.jpg');
    
    // Check if upload button is visible
    expect(screen.getByText('Add Image')).toBeInTheDocument();
  });

  it('shows empty state when no images are provided', () => {
    render(<ImageUploader images={[]} onImagesChange={mockOnImagesChange} />);
    
    expect(screen.getByText('No images uploaded yet')).toBeInTheDocument();
    expect(screen.getByText('Add Image')).toBeInTheDocument();
  });

  it('handles file upload correctly', async () => {
    render(<ImageUploader images={mockImages} onImagesChange={mockOnImagesChange} />);
    
    // Create a mock file
    const file = new File(['test image content'], 'test-image.jpg', { type: 'image/jpeg' });
    
    // Get the hidden file input
    const fileInput = screen.getByTestId('file-input');
    
    // Simulate file selection
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    // Simulate the FileReader onload event
    mockFileReader.onload();
    
    // Wait for the upload process
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/upload', expect.any(Object));
    });
    
    // Check if onImagesChange was called with the new image URL
    expect(mockOnImagesChange).toHaveBeenCalledWith([
      'https://example.com/image1.jpg',
      'https://example.com/test-image.jpg'
    ]);
  });

  it('handles image removal correctly', () => {
    render(<ImageUploader images={mockImages} onImagesChange={mockOnImagesChange} />);
    
    // Find and click the remove button
    const removeButton = screen.getByLabelText('Remove image');
    fireEvent.click(removeButton);
    
    // Check if onImagesChange was called with an empty array
    expect(mockOnImagesChange).toHaveBeenCalledWith([]);
  });

  it('handles upload errors gracefully', async () => {
    // Mock fetch to return an error
    global.fetch = jest.fn().mockRejectedValueOnce(new Error('Upload failed'));
    
    render(<ImageUploader images={mockImages} onImagesChange={mockOnImagesChange} />);
    
    // Create a mock file
    const file = new File(['test image content'], 'test-image.jpg', { type: 'image/jpeg' });
    
    // Get the hidden file input
    const fileInput = screen.getByTestId('file-input');
    
    // Simulate file selection
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    // Simulate the FileReader onload event
    mockFileReader.onload();
    
    // Wait for the upload process to fail
    await waitFor(() => {
      expect(screen.getByText('Error uploading image')).toBeInTheDocument();
    });
    
    // Original images should remain unchanged
    expect(mockOnImagesChange).not.toHaveBeenCalled();
  });
});
