import { describe, it, expect, beforeEach, vi } from 'vitest';
import { performanceMonitor } from '../performanceMonitor';

describe('performanceMonitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('mark', () => {
    it('should create a performance mark', () => {
      const markName = 'test-mark';
      performanceMonitor.mark(markName);
      
      const marks = performance.getEntriesByName(markName, 'mark');
      expect(marks.length).toBeGreaterThan(0);
    });

    it('should handle errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Force an error by passing invalid input
      performanceMonitor.mark(null as any);
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('measure', () => {
    it('should measure time between marks', () => {
      const markName = 'test-measure';
      performanceMonitor.mark(markName);
      
      // Simulate some work
      const start = Date.now();
      while (Date.now() - start < 10) {} // Wait 10ms
      
      const duration = performanceMonitor.measure(markName);
      expect(duration).toBeGreaterThan(0);
    });

    it('should return 0 if mark does not exist', () => {
      const duration = performanceMonitor.measure('non-existent-mark');
      expect(duration).toBe(0);
    });
  });

  describe('performance tracking', () => {
    it('should track performance marks', () => {
      const markName = 'test-track';
      performanceMonitor.mark(markName);
      
      const marks = performance.getEntriesByName(markName, 'mark');
      expect(marks.length).toBeGreaterThan(0);
    });
  });
});
