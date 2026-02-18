import { describe, expect, it } from 'vitest';
import { isValidAvatarDataUrl, sanitizeMessageText } from '../src/lib/sanitize';

describe('sanitize helpers', () => {
  it('normalizes message whitespace', () => {
    expect(sanitizeMessageText('  hello\n\n there   team  ')).toBe('hello there team');
    expect(sanitizeMessageText('\t\t')).toBe('');
  });

  it('validates avatar data URLs', () => {
    expect(isValidAvatarDataUrl('data:image/png;base64,aGVsbG8=')).toBe(true);
    expect(isValidAvatarDataUrl('data:image/jpeg;base64,Zm9vYmFy')).toBe(true);
    expect(isValidAvatarDataUrl('https://example.com/avatar.png')).toBe(false);
    expect(isValidAvatarDataUrl('data:text/plain;base64,aGVsbG8=')).toBe(false);
  });
});
