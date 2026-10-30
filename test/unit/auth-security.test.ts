import test from 'node:test';
import assert from 'node:assert/strict';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

test('AuthSecurity: securely hashes and verifies passwords with bcrypt', async () => {
  const password = 'ResearcherSecurePassword2026!';
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);

  assert.notEqual(password, hash);
  assert.ok(hash.startsWith('$2'));

  const validMatch = await bcrypt.compare(password, hash);
  assert.equal(validMatch, true);

  const invalidMatch = await bcrypt.compare('WrongPassword123!', hash);
  assert.equal(invalidMatch, false);
});

test('AuthSecurity: calculates deterministic SHA-256 hash for rotated refresh tokens', () => {
  const rawToken = '4c1d2e3f-4567-89ab-cdef-0123456789ab.9876543210fedcba';
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  assert.equal(typeof tokenHash, 'string');
  assert.equal(tokenHash.length, 64);

  // Hash must match deterministically
  const rehashed = crypto.createHash('sha256').update(rawToken).digest('hex');
  assert.equal(tokenHash, rehashed);
});
