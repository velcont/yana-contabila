import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useVisualFeedback } from '../useVisualFeedback';

// Mock the VisualFeedback class
vi.mock('@/components/VisualFeedback', () => ({
  VisualFeedback: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(),
    ai: vi.fn(),
    promise: vi.fn(),
  },
}));

describe('useVisualFeedback', () => {
  it('should return feedback object with methods', () => {
    const { result } = renderHook(() => useVisualFeedback());
    
    expect(result.current).toHaveProperty('showSuccess');
    expect(result.current).toHaveProperty('showError');
    expect(result.current).toHaveProperty('showWarning');
    expect(result.current).toHaveProperty('showInfo');
    expect(result.current).toHaveProperty('showLoading');
    expect(result.current).toHaveProperty('showAI');
    expect(result.current).toHaveProperty('showPromise');
  });

  it('should have callable methods', () => {
    const { result } = renderHook(() => useVisualFeedback());
    
    expect(typeof result.current.showSuccess).toBe('function');
    expect(typeof result.current.showError).toBe('function');
    expect(typeof result.current.showWarning).toBe('function');
  });
});
