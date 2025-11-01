import { describe, it, expect } from 'vitest';
import { generateSrcSet, getOptimalImageSize, supportsWebP } from '../imageOptimization';

describe('imageOptimization', () => {
  describe('generateSrcSet', () => {
    it('should generate srcset with multiple sizes', () => {
      const srcSet = generateSrcSet('test.jpg', [400, 800, 1200]);
      expect(srcSet).toContain('400w');
      expect(srcSet).toContain('800w');
      expect(srcSet).toContain('1200w');
    });

    it('should handle single size', () => {
      const srcSet = generateSrcSet('test.jpg', [800]);
      expect(srcSet).toBe('test-800w.jpg 800w');
    });

    it('should preserve file extension', () => {
      const srcSet = generateSrcSet('test.png', [400]);
      expect(srcSet).toContain('.png');
    });
  });

  describe('getOptimalImageSize', () => {
    it('should return appropriate size for mobile', () => {
      const size = getOptimalImageSize(375, 1);
      expect(size).toBeLessThanOrEqual(800);
    });

    it('should return appropriate size for desktop', () => {
      const size = getOptimalImageSize(1920, 1);
      expect(size).toBeGreaterThan(800);
    });

    it('should account for devicePixelRatio', () => {
      const size1x = getOptimalImageSize(375, 1);
      const size2x = getOptimalImageSize(375, 2);
      expect(size2x).toBeGreaterThan(size1x);
    });
  });

  describe('supportsWebP', () => {
    it('should return a boolean', () => {
      const result = supportsWebP();
      expect(typeof result).toBe('boolean');
    });
  });
});
