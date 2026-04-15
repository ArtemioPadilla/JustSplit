import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProgressBar from '../components/ui/ProgressBar';

describe('ProgressBar Component', () => {
  test('renders with default props', () => {
    render(<ProgressBar value={50} />);
    const progressBarElement = screen.getByText('50%');
    expect(progressBarElement).toBeInTheDocument();
  });

  test('renders with 0% progress', () => {
    render(<ProgressBar value={0} />);
    const progressBarElement = screen.getByText('0%');
    expect(progressBarElement).toBeInTheDocument();
  });

  test('renders with 100% progress', () => {
    render(<ProgressBar value={100} />);
    const progressBarElement = screen.getByText('100%');
    expect(progressBarElement).toBeInTheDocument();
  });

  test('renders with success variant', () => {
    render(<ProgressBar value={100} variant="success" />);
    const progressBarContainer = screen.getByText('100%').parentElement;
    expect(progressBarContainer).toHaveClass('success');
  });

  test('renders with warning variant', () => {
    render(<ProgressBar value={50} variant="warning" />);
    const progressBarContainer = screen.getByText('50%').parentElement;
    expect(progressBarContainer).toHaveClass('warning');
  });

  test('renders with danger variant', () => {
    render(<ProgressBar value={25} variant="danger" />);
    const progressBarContainer = screen.getByText('25%').parentElement;
    expect(progressBarContainer).toHaveClass('danger');
  });

  test('renders with custom height', () => {
    render(<ProgressBar value={50} height={20} />);
    // Find the progress container element by its class name
    const progressBarContainer = screen.getByText('50%').closest('div.progressContainer');
    expect(progressBarContainer).toHaveStyle('height: 20px');
  });

  test('handles value greater than 100', () => {
    render(<ProgressBar value={150} />);
    const progressBarElement = screen.getByText('100%');
    expect(progressBarElement).toBeInTheDocument();
  });

  test('handles value less than 0', () => {
    render(<ProgressBar value={-10} />);
    const progressBarElement = screen.getByText('0%');
    expect(progressBarElement).toBeInTheDocument();
  });

  test('hides percentage text when showPercentage is false', () => {
    render(<ProgressBar value={50} showPercentage={false} />);
    expect(screen.queryByText('50%')).not.toBeInTheDocument();
  });
});