import { describe, it, expect } from 'vitest';

describe('Project Setup', () => {
  it('should have a working test environment', () => {
    expect(true).toBe(true);
  });

  it('should support TypeScript', () => {
    const value: string = 'order-notifications';
    expect(value).toBe('order-notifications');
  });
});
