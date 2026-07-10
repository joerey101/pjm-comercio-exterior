import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { isAuthorizedCronRequest } from './cron';

describe('isAuthorizedCronRequest', () => {
  const original = process.env.CRON_SECRET;

  beforeEach(() => {
    process.env.CRON_SECRET = 'test-secret';
  });

  afterEach(() => {
    process.env.CRON_SECRET = original;
  });

  it('rejects a request with no Authorization header', () => {
    const request = new Request('https://example.com/api/cron/expire-documents');
    expect(isAuthorizedCronRequest(request)).toBe(false);
  });

  it('rejects a request with the wrong secret', () => {
    const request = new Request('https://example.com/api/cron/expire-documents', {
      headers: { authorization: 'Bearer wrong-secret' },
    });
    expect(isAuthorizedCronRequest(request)).toBe(false);
  });

  it('accepts a request with the correct bearer secret', () => {
    const request = new Request('https://example.com/api/cron/expire-documents', {
      headers: { authorization: 'Bearer test-secret' },
    });
    expect(isAuthorizedCronRequest(request)).toBe(true);
  });

  it('rejects everything when CRON_SECRET is not configured', () => {
    delete process.env.CRON_SECRET;
    const request = new Request('https://example.com/api/cron/expire-documents', {
      headers: { authorization: 'Bearer test-secret' },
    });
    expect(isAuthorizedCronRequest(request)).toBe(false);
  });
});
