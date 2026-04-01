import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock factory cannot reference outer variables — use vi.hoisted
const { mockCreateSignedUrl, mockFrom } = vi.hoisted(() => {
  const mockCreateSignedUrl = vi.fn();
  const mockFrom = vi.fn(() => ({ createSignedUrl: mockCreateSignedUrl }));
  return { mockCreateSignedUrl, mockFrom };
});

vi.mock('@/lib/supabase', () => ({
  supabase: {
    storage: { from: mockFrom },
  },
}));

import { getAccessibleUrl } from '@/lib/utils';

describe('getAccessibleUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null for null input', async () => {
    expect(await getAccessibleUrl(null)).toBeNull();
  });

  it('returns null for empty string', async () => {
    expect(await getAccessibleUrl('')).toBeNull();
  });

  it('treats non-http string as storage path and creates signed URL from exams bucket', async () => {
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://signed.example.com/file.jpg' },
      error: null,
    });

    const result = await getAccessibleUrl('clinicId/exam_123.jpg');

    expect(mockFrom).toHaveBeenCalledWith('exams');
    expect(mockCreateSignedUrl).toHaveBeenCalledWith('clinicId/exam_123.jpg', 3600);
    expect(result).toBe('https://signed.example.com/file.jpg');
  });

  it('returns null when signed URL creation fails for storage path', async () => {
    mockCreateSignedUrl.mockResolvedValue({
      data: null,
      error: { message: 'Not found' },
    });

    const result = await getAccessibleUrl('clinicId/missing.jpg');
    expect(result).toBeNull();
  });

  it('parses public Supabase URL and creates signed URL from extracted bucket/path', async () => {
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://signed.example.com/signed' },
      error: null,
    });

    const publicUrl = 'https://abc.supabase.co/storage/v1/object/public/exams/clinic1/file.png';
    const result = await getAccessibleUrl(publicUrl);

    expect(mockFrom).toHaveBeenCalledWith('exams');
    expect(mockCreateSignedUrl).toHaveBeenCalledWith('clinic1/file.png', 3600);
    expect(result).toBe('https://signed.example.com/signed');
  });

  it('handles URL-encoded paths in public URLs', async () => {
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://signed.example.com/encoded' },
      error: null,
    });

    const publicUrl = 'https://abc.supabase.co/storage/v1/object/public/exams/clinic1/arquivo%20com%20espa%C3%A7o.jpg';
    const result = await getAccessibleUrl(publicUrl);

    expect(mockCreateSignedUrl).toHaveBeenCalledWith('clinic1/arquivo com espaço.jpg', 3600);
    expect(result).toBe('https://signed.example.com/encoded');
  });

  it('returns original URL when signed URL creation fails for public URL', async () => {
    mockCreateSignedUrl.mockResolvedValue({
      data: null,
      error: { message: 'Bucket not found' },
    });

    const publicUrl = 'https://abc.supabase.co/storage/v1/object/public/exams/clinic1/file.png';
    const result = await getAccessibleUrl(publicUrl);

    expect(result).toBe(publicUrl);
  });

  it('returns external URLs unchanged', async () => {
    const externalUrl = 'https://cdn.example.com/image.jpg';
    const result = await getAccessibleUrl(externalUrl);

    expect(mockFrom).not.toHaveBeenCalled();
    expect(result).toBe(externalUrl);
  });

  it('re-signs already-signed URLs with a fresh token', async () => {
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://abc.supabase.co/storage/v1/object/sign/exams/file.jpg?token=fresh' },
      error: null,
    });

    const signedUrl = 'https://abc.supabase.co/storage/v1/object/sign/exams/file.jpg?token=expired';
    const result = await getAccessibleUrl(signedUrl);

    expect(mockFrom).toHaveBeenCalledWith('exams');
    expect(mockCreateSignedUrl).toHaveBeenCalledWith('file.jpg', 3600);
    expect(result).toBe('https://abc.supabase.co/storage/v1/object/sign/exams/file.jpg?token=fresh');
  });

  it('handles //protocol-relative URLs as external', async () => {
    const protoRelative = '//cdn.example.com/image.jpg';
    const result = await getAccessibleUrl(protoRelative);

    expect(mockFrom).not.toHaveBeenCalled();
    expect(result).toBe(protoRelative);
  });
});
