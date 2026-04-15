import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import EditableText from '../EditableText';

describe('EditableText Component', () => {
  const mockSave = jest.fn();
  
  beforeEach(() => {
    mockSave.mockClear();
  });

  test('renders with provided value', () => {
    render(<EditableText value="Test Value" onSave={mockSave} />);
    expect(screen.getByText('Test Value')).toBeInTheDocument();
  });

  test('shows placeholder when value is empty', () => {
    render(<EditableText value="" onSave={mockSave} placeholder="Click to edit" />);
    expect(screen.getByText('Click to edit')).toBeInTheDocument();
  });

  test('renders with correct HTML element based on as prop', () => {
    const { container, rerender } = render(<EditableText value="Heading 1" onSave={mockSave} as="h1" />);
    expect(container.querySelector('h1')).toBeInTheDocument();
    
    rerender(<EditableText value="Heading 2" onSave={mockSave} as="h2" />);
    expect(container.querySelector('h2')).toBeInTheDocument();
    
    rerender(<EditableText value="Paragraph" onSave={mockSave} as="p" />);
    expect(container.querySelector('p')).toBeInTheDocument();
  });

  test('switches to edit mode on click', () => {
    render(<EditableText value="Click Me" onSave={mockSave} />);
    
    const textElement = screen.getByText('Click Me');
    fireEvent.click(textElement);
    
    // Verify input is shown with the current value
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('Click Me');
  });

  test('calls onSave when Enter is pressed', () => {
    render(<EditableText value="Initial Value" onSave={mockSave} />);
    
    // Enter edit mode
    const textElement = screen.getByText('Initial Value');
    fireEvent.click(textElement);
    
    // Change the value
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'New Value' } });
    
    // Press Enter
    fireEvent.keyDown(input, { key: 'Enter' });
    
    // Check if onSave was called with the new value
    expect(mockSave).toHaveBeenCalledWith('New Value');
  });

  test('calls onSave when input loses focus', () => {
    render(<EditableText value="Initial Value" onSave={mockSave} />);
    
    // Enter edit mode
    const textElement = screen.getByText('Initial Value');
    fireEvent.click(textElement);
    
    // Change the value
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'New Value' } });
    
    // Blur the input
    fireEvent.blur(input);
    
    // Check if onSave was called with the new value
    expect(mockSave).toHaveBeenCalledWith('New Value');
  });

  test('restores original value when Escape is pressed', () => {
    render(<EditableText value="Initial Value" onSave={mockSave} />);
    
    // Enter edit mode
    const textElement = screen.getByText('Initial Value');
    fireEvent.click(textElement);
    
    // Change the value
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'New Value' } });
    
    // Press Escape
    fireEvent.keyDown(input, { key: 'Escape' });
    
    // Check that onSave was not called
    expect(mockSave).not.toHaveBeenCalled();
    
    // Check that we've exited edit mode and the original value is displayed
    expect(screen.getByText('Initial Value')).toBeInTheDocument();
  });

  test('does not save when input is empty', () => {
    render(<EditableText value="Initial Value" onSave={mockSave} />);
    
    // Enter edit mode
    const textElement = screen.getByText('Initial Value');
    fireEvent.click(textElement);
    
    // Change to empty value
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '' } });
    
    // Press Enter
    fireEvent.keyDown(input, { key: 'Enter' });
    
    // Check that onSave was not called
    expect(mockSave).not.toHaveBeenCalled();
    
    // Check that we've exited edit mode and the original value is displayed
    expect(screen.getByText('Initial Value')).toBeInTheDocument();
  });

  test('respects maxLength prop', () => {
    render(<EditableText value="Test" onSave={mockSave} maxLength={10} />);
    
    // Enter edit mode
    const textElement = screen.getByText('Test');
    fireEvent.click(textElement);
    
    // Check if input has maxLength attribute
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('maxLength', '10');
  });

  test('applies custom className', () => {
    const { container } = render(<EditableText value="Test" onSave={mockSave} className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});