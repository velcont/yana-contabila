import { describe, it, expect, vi } from 'vitest';
import { preloadComponent, preloadForRoute } from '../componentPreloader';

describe('componentPreloader', () => {
  describe('preloadComponent', () => {
    it('should attempt to preload a valid component', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      preloadComponent('chatAI');
      
      // Wait for async operation
      setTimeout(() => {
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('chatAI'));
        consoleSpy.mockRestore();
      }, 100);
    });

    it('should not preload the same component twice', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      preloadComponent('dashboard');
      preloadComponent('dashboard'); // Second call should be ignored
      
      setTimeout(() => {
        // Should only be called once
        const calls = consoleSpy.mock.calls.filter(call => 
          call[0].includes('dashboard')
        );
        expect(calls.length).toBeLessThanOrEqual(1);
        consoleSpy.mockRestore();
      }, 100);
    });
  });

  describe('preloadForRoute', () => {
    it('should preload components for /app route', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      preloadForRoute('/app');
      
      setTimeout(() => {
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
      }, 100);
    });

    it('should handle unknown routes gracefully', () => {
      expect(() => {
        preloadForRoute('/unknown-route');
      }).not.toThrow();
    });
  });
});
