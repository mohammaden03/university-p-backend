import test from 'node:test';
import assert from 'node:assert/strict';

interface SampleRecord {
  id: string;
  manuscriptId: string;
}

// Pure partitioning logic decoupled from database
function partitionManuscripts(
  samples: SampleRecord[],
  trainRatio: number,
  valRatio: number,
  testRatio: number,
) {
  const sum = trainRatio + valRatio + testRatio;
  if (Math.abs(sum - 1.0) > 0.01) {
    throw new Error('Ratios must sum to 1.0');
  }

  const manuscriptMap = new Map<string, string[]>();
  for (const s of samples) {
    if (!manuscriptMap.has(s.manuscriptId)) {
      manuscriptMap.set(s.manuscriptId, []);
    }
    manuscriptMap.get(s.manuscriptId)!.push(s.id);
  }

  const manuscriptIds = Array.from(manuscriptMap.keys());
  const trainCount = Math.max(1, Math.round(manuscriptIds.length * trainRatio));
  const valCount = Math.max(1, Math.round(manuscriptIds.length * valRatio));

  const trainManuscripts = new Set(manuscriptIds.slice(0, trainCount));
  const valManuscripts = new Set(manuscriptIds.slice(trainCount, trainCount + valCount));
  const testManuscripts = new Set(manuscriptIds.slice(trainCount + valCount));

  const trainSamples: string[] = [];
  const valSamples: string[] = [];
  const testSamples: string[] = [];

  for (const s of samples) {
    if (trainManuscripts.has(s.manuscriptId)) {
      trainSamples.push(s.id);
    } else if (valManuscripts.has(s.manuscriptId)) {
      valSamples.push(s.id);
    } else {
      testSamples.push(s.id);
    }
  }

  return { trainSamples, valSamples, testSamples, trainManuscripts, valManuscripts, testManuscripts };
}

test('DatasetSplits: ensures zero manuscript leakage between Train, Validation, and Test sets', () => {
  // 3 manuscripts with 3 pages each (9 samples total)
  const samples: SampleRecord[] = [
    { id: 's1', manuscriptId: 'MS-HAFEZ' },
    { id: 's2', manuscriptId: 'MS-HAFEZ' },
    { id: 's3', manuscriptId: 'MS-HAFEZ' },
    { id: 's4', manuscriptId: 'MS-SAHIFEH' },
    { id: 's5', manuscriptId: 'MS-SAHIFEH' },
    { id: 's6', manuscriptId: 'MS-SAHIFEH' },
    { id: 's7', manuscriptId: 'MS-GOLESTAN' },
    { id: 's8', manuscriptId: 'MS-GOLESTAN' },
    { id: 's9', manuscriptId: 'MS-GOLESTAN' },
  ];

  const result = partitionManuscripts(samples, 0.6, 0.2, 0.2);

  // Assert no overlap between manuscript sets
  for (const m of result.trainManuscripts) {
    assert.equal(result.valManuscripts.has(m), false, `Manuscript ${m} leaked into validation set!`);
    assert.equal(result.testManuscripts.has(m), false, `Manuscript ${m} leaked into test set!`);
  }
  for (const m of result.valManuscripts) {
    assert.equal(result.testManuscripts.has(m), false, `Manuscript ${m} leaked into test set!`);
  }

  // All 9 samples must be allocated
  const totalAllocated =
    result.trainSamples.length + result.valSamples.length + result.testSamples.length;
  assert.equal(totalAllocated, 9);
});

test('DatasetSplits: validates that split ratios must sum to 1.0', () => {
  assert.throws(() => {
    partitionManuscripts([], 0.5, 0.5, 0.5); // Sum is 1.5
  });
});
