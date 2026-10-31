import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chdirToTemp } from './helpers.ts';

chdirToTemp();
const { isXHRRequest } = await import('lh-pptr-framework/settings/network-filters.js');
const { default: NetworkXHRAudit } = await import('lh-pptr-framework/settings/audits/network-xhr-audit.js');
const { default: XHRCountAudit } = await import('lh-pptr-framework/settings/audits/xhr-count-audit.js');
const { default: RequestBodiesGatherer } = await import('lh-pptr-framework/settings/gatherers/network-request-bodies-gatherer.js');

test('XHR requests count unless they are static resources or ads', () => {
  assert.equal(isXHRRequest({ url: 'https://a.com/users', resourceType: 'XHR' }), true);
  assert.equal(isXHRRequest({ url: 'https://a.com/app.JS?v=1', resourceType: 'XHR' }), false);
  assert.equal(isXHRRequest({ url: 'https://stats.doubleclick.net/collect', resourceType: 'XHR' }), false);
  assert.equal(isXHRRequest({ url: 'https://a.com/users', resourceType: 'XHR', mimeType: 'text/html' }), false);
});

test('Fetch requests count only for API mime types, API-like URLs or non-GET methods', () => {
  assert.equal(isXHRRequest({ url: 'https://a.com/x', resourceType: 'Fetch', mimeType: 'application/json; charset=utf-8' }), true);
  assert.equal(isXHRRequest({ url: 'https://a.com/x', resourceType: 'Fetch', mimeType: 'text/xml' }), true);
  assert.equal(isXHRRequest({ url: 'https://a.com/graphql', resourceType: 'Fetch', mimeType: 'text/plain' }), true);
  assert.equal(isXHRRequest({ url: 'https://a.com/x', resourceType: 'Fetch', mimeType: 'text/plain', requestMethod: 'POST' }), true);
  assert.equal(isXHRRequest({ url: 'https://a.com/x', resourceType: 'Fetch', mimeType: 'text/plain', requestMethod: 'GET' }), false);
  assert.equal(isXHRRequest({ url: 'https://a.com/api/x', resourceType: 'Document' }), false);
});

test('the XHR audits expose the shared classifier as a static method', () => {
  const record = { url: 'https://a.com/api/x', resourceType: 'Fetch', mimeType: '' };
  assert.equal(NetworkXHRAudit.isXHRRequest(record), true);
  assert.equal(XHRCountAudit.isXHRRequest(record), true);
});

test('the request-bodies gatherer captures API-like and non-GET requests only', () => {
  const g = new RequestBodiesGatherer();
  const req = (url: string, method = 'GET', extra: Record<string, unknown> = {}) => g.isXHROrFetchRequest({ url, method, headers: {}, ...extra } as never);
  assert.equal(req('https://a.com/rest/items'), true);
  assert.equal(req('https://a.com/page', 'POST'), true);
  assert.equal(req('https://a.com/page', 'GET', { hasPostData: true }), true);
  assert.equal(req('https://a.com/page', 'GET', { headers: { 'X-Requested-With': 'XMLHttpRequest' } }), true);
  assert.equal(req('https://a.com/page', 'GET', { headers: { 'Content-Type': 'application/json' } }), true);
  assert.equal(req('https://a.com/page'), false);
  assert.equal(req('https://a.com/api/logo.png', 'POST'), false);
  assert.equal(req('https://googleadservices.com/api/x', 'POST'), false);
});
