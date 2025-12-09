import { describe, it, expect } from 'vitest';
import { detectGender, extractPreferredName } from '../genderDetection';

describe('detectGender', () => {
  describe('male names', () => {
    it('should detect common male names', () => {
      expect(detectGender('Andrei Popescu')).toBe('male');
      expect(detectGender('Ion Ionescu')).toBe('male');
      expect(detectGender('Mihai Eminescu')).toBe('male');
      expect(detectGender('Alexandru Macedon')).toBe('male');
      expect(detectGender('Stefan cel Mare')).toBe('male');
    });

    it('should detect less common male names', () => {
      expect(detectGender('Bogdan Vasilescu')).toBe('male');
      expect(detectGender('Razvan Lucescu')).toBe('male');
      expect(detectGender('Ciprian Marica')).toBe('male');
      expect(detectGender('Vlad Tepes')).toBe('male');
    });

    it('should handle uppercase names', () => {
      expect(detectGender('ANDREI POPESCU')).toBe('male');
      expect(detectGender('MIHAI ION')).toBe('male');
    });

    it('should handle mixed case names', () => {
      expect(detectGender('AnDrEi PoPeScU')).toBe('male');
    });
  });

  describe('female names', () => {
    it('should detect common female names', () => {
      expect(detectGender('Maria Ionescu')).toBe('female');
      expect(detectGender('Elena Pop')).toBe('female');
      expect(detectGender('Ana Blandiana')).toBe('female');
      expect(detectGender('Ioana Petrescu')).toBe('female');
      expect(detectGender('Andreea Marin')).toBe('female');
    });

    it('should detect less common female names', () => {
      expect(detectGender('Roxana Ciuhulescu')).toBe('female');
      expect(detectGender('Raluca Turcan')).toBe('female');
      expect(detectGender('Madalina Ghenea')).toBe('female');
    });

    it('should use heuristics for unknown names ending in -a', () => {
      expect(detectGender('Mirabela Dauer')).toBe('female');
      expect(detectGender('Codruta Kovesi')).toBe('female');
    });
  });

  describe('unknown/ambiguous names', () => {
    it('should return unknown for empty input', () => {
      expect(detectGender('')).toBe('unknown');
      expect(detectGender('   ')).toBe('unknown');
    });

    it('should return unknown for null/undefined-like input', () => {
      expect(detectGender(null as any)).toBe('unknown');
      expect(detectGender(undefined as any)).toBe('unknown');
    });

    it('should handle ambiguous names', () => {
      // Alex can be male or female
      expect(detectGender('Alex Smith')).toBe('unknown');
    });

    it('should handle foreign names with heuristics', () => {
      // Names ending in consonants are usually male
      expect(detectGender('John Smith')).toBe('male');
      // Names ending in 'a' are usually female
      expect(detectGender('Jessica Alba')).toBe('female');
    });
  });

  describe('edge cases', () => {
    it('should handle single names', () => {
      expect(detectGender('Andrei')).toBe('male');
      expect(detectGender('Maria')).toBe('female');
    });

    it('should handle names with extra whitespace', () => {
      expect(detectGender('  Andrei   Popescu  ')).toBe('male');
      expect(detectGender('  Maria   Pop  ')).toBe('female');
    });

    it('should handle names with special characters', () => {
      expect(detectGender('Ștefan cel Mare')).toBe('unknown'); // ș not in ASCII set
      expect(detectGender('Stefan cel Mare')).toBe('male'); // normalized version works
    });
  });
});

describe('extractPreferredName', () => {
  it('should extract and capitalize first name', () => {
    expect(extractPreferredName('andrei popescu')).toBe('Andrei');
    expect(extractPreferredName('MARIA ION')).toBe('Maria');
    expect(extractPreferredName('elena')).toBe('Elena');
  });

  it('should handle empty input', () => {
    expect(extractPreferredName('')).toBe('');
    expect(extractPreferredName('   ')).toBe('');
  });

  it('should handle names with extra whitespace', () => {
    expect(extractPreferredName('  andrei   popescu  ')).toBe('Andrei');
  });
});
