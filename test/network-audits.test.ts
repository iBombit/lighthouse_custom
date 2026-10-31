import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chdirToTemp } from './helpers.ts';

chdirToTemp();
const { findLongestRequest } = await import('lh-pptr-framework/settings/audits/network-requests.js');

test('findLongestRequest skips requests without a duration, even when one comes first', () => {
  // Regression: a beacon from the previous page (never finished, no timings) sorted first made
  // slowest-network-request fail with "Invalid score for slowest-network-request: NaN".
  const requests = [
    { url: 'https://trc.taboola.com/log/beacon', statusCode: -1 },
    { url: 'https://demoqa.com/upload-download', duration: 209 },
    { url: 'https://demoqa.com/app.js', duration: 1327 },
    { url: 'https://ads.example.com/pixel', duration: Number.NaN },
  ];
  assert.equal(findLongestRequest(requests)?.url, 'https://demoqa.com/app.js');
});

test('findLongestRequest keeps the first request on ties and returns undefined when nothing has a duration', () => {
  assert.equal(findLongestRequest([{ id: 1, duration: 5 }, { id: 2, duration: 5 }, { id: 3, duration: 1 }])?.id, 1);
  assert.equal(findLongestRequest([{ url: 'a' }, { url: 'b', duration: undefined }]), undefined);
  assert.equal(findLongestRequest([]), undefined);
});
