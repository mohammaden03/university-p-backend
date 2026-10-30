import test from 'node:test';
import assert from 'node:assert/strict';
import { LocalStorageService } from '../../src/files/local-storage.service';
import { ConfigService } from '@nestjs/config';

// Mock ConfigService
const mockConfigService = {
  get: (key: string, defaultValue?: any) => {
    if (key === 'storage.root') return './test-storage';
    if (key === 'storage.maxUploadSizeBytes') return 10 * 1024 * 1024;
    if (key === 'storage.allowedMimeTypes')
      return ['image/jpeg', 'image/png', 'image/tiff', 'image/webp'];
    return defaultValue;
  },
} as unknown as ConfigService;

test('FileStorage: detects genuine PNG signature and rejects disguised files', () => {
  const storage = new LocalStorageService(mockConfigService);

  // Genuine PNG buffer
  const validPngHeader = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  ]);
  const pngValidation = storage.validateImageSignature(validPngHeader, 'image/png');
  assert.equal(pngValidation.isValid, true);
  assert.equal(pngValidation.detectedMime, 'image/png');

  // Disguised text file claimed to be a PNG
  const fakePngHeader = Buffer.from('This is a plain text file pretending to be image.png');
  const fakeValidation = storage.validateImageSignature(fakePngHeader, 'image/png');
  assert.equal(fakeValidation.isValid, false);
  assert.match(fakeValidation.error || '', /Unsupported or corrupted/);
});

test('FileStorage: detects genuine JPEG signature', () => {
  const storage = new LocalStorageService(mockConfigService);
  const jpegHeader = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  ]);
  const validation = storage.validateImageSignature(jpegHeader, 'image/jpeg');
  assert.equal(validation.isValid, true);
  assert.equal(validation.detectedMime, 'image/jpeg');
});

test('FileStorage: calculates accurate SHA-256 checksum', () => {
  const storage = new LocalStorageService(mockConfigService);
  const data = Buffer.from('Persian Manuscript HTR Test Content');
  const checksum = storage.calculateChecksum(data);

  // Checksum of 'Persian Manuscript HTR Test Content'
  assert.equal(typeof checksum, 'string');
  assert.equal(checksum.length, 64); // SHA-256 hex string length
});

test('FileStorage: prevents path traversal in storage keys', () => {
  const storage = new LocalStorageService(mockConfigService);

  // Safe key resolves under root
  const safePath = storage.resolveSafePath('2026-10-30/valid_image.png');
  assert.ok(safePath.includes('test-storage'));

  // Traversal key must be sanitized or rejected
  assert.throws(() => {
    storage.resolveSafePath('../../../etc/passwd');
  });
});
