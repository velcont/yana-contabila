import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { OptimizedImage } from '../OptimizedImage';

describe('OptimizedImage', () => {
  it('should render with required props', () => {
    const { getByAlt } = render(
      <OptimizedImage 
        src="test.jpg" 
        alt="Test image" 
      />
    );
    
    const img = getByAlt('Test image');
    expect(img).toBeInTheDocument();
  });

  it('should apply className', () => {
    const { getByAlt } = render(
      <OptimizedImage 
        src="test.jpg" 
        alt="Test image"
        className="custom-class" 
      />
    );
    
    const container = getByAlt('Test image').parentElement;
    expect(container?.className).toContain('custom-class');
  });

  it('should show low-res placeholder initially', () => {
    const { container } = render(
      <OptimizedImage 
        src="test.jpg" 
        alt="Test image"
        lowResSrc="test-low.jpg" 
      />
    );
    
    const lowResImg = container.querySelector('img[src="test-low.jpg"]');
    expect(lowResImg).toBeInTheDocument();
  });

  it('should apply aspect ratio styling', () => {
    const { getByAlt } = render(
      <OptimizedImage 
        src="test.jpg" 
        alt="Test image"
        aspectRatio="16/9" 
      />
    );
    
    const container = getByAlt('Test image').parentElement;
    expect(container?.style.aspectRatio).toBeTruthy();
  });

  it('should lazy load by default', () => {
    const { getByAlt } = render(
      <OptimizedImage 
        src="test.jpg" 
        alt="Test image" 
      />
    );
    
    const img = getByAlt('Test image');
    expect(img).toHaveAttribute('loading', 'lazy');
  });

  it('should support eager loading', () => {
    const { getByAlt } = render(
      <OptimizedImage 
        src="test.jpg" 
        alt="Test image"
        loading="eager" 
      />
    );
    
    const img = getByAlt('Test image');
    expect(img).toHaveAttribute('loading', 'eager');
  });
});
