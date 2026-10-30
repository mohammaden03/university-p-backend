import test from 'node:test';
import assert from 'node:assert/strict';

function validateAiResponse(data: any) {
  if (!data || typeof data !== 'object') {
    throw new Error('Expected JSON object');
  }
  if (typeof data.recognizedText !== 'string') {
    throw new Error('missing or invalid recognizedText');
  }
  if (!data.modelName || typeof data.modelName !== 'string') {
    throw new Error('missing modelName');
  }
  if (!data.modelVersion || typeof data.modelVersion !== 'string') {
    throw new Error('missing modelVersion');
  }
  if (typeof data.processingDurationMs !== 'number' || data.processingDurationMs < 0) {
    throw new Error('invalid processingDurationMs');
  }
  if (data.confidence !== undefined) {
    if (typeof data.confidence !== 'number' || data.confidence < 0 || data.confidence > 1) {
      throw new Error('confidence must be a number between 0.0 and 1.0');
    }
  }
  return true;
}

test('AiResponseValidation: accepts compliant Python HTR response', () => {
  const validResponse = {
    recognizedText: 'بشنو این نکته که خود را ز غم آزاده کنی',
    language: 'PERSIAN',
    modelName: 'qajar-nastaliq-v2',
    modelVersion: '2.1.0',
    processingDurationMs: 420,
    confidence: 0.95,
  };

  assert.equal(validateAiResponse(validResponse), true);
});

test('AiResponseValidation: rejects response with out-of-bounds confidence', () => {
  const invalidResponse = {
    recognizedText: 'متن تستی',
    modelName: 'test-model',
    modelVersion: '1.0',
    processingDurationMs: 100,
    confidence: 1.5, // Invalid > 1.0
  };

  assert.throws(() => validateAiResponse(invalidResponse), /confidence must be a number/);
});

test('AiResponseValidation: rejects response with missing model information', () => {
  const invalidResponse = {
    recognizedText: 'متن تستی',
    processingDurationMs: 100,
  };

  assert.throws(() => validateAiResponse(invalidResponse), /missing modelName/);
});
