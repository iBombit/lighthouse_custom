const myRelevantAudits = [
  'network-requests',
  'network-server-latency',
];

// go/lh-audit-metric-mapping
// Updated for Lighthouse v13 — removed audits replaced with insight audits
const fcpRelevantAudits = [
  'server-response-time',
  'render-blocking-insight',             // was: render-blocking-resources
  'redirects',
  'network-dependency-tree-insight',     // was: critical-request-chains, uses-rel-preconnect
  'document-latency-insight',            // was: uses-text-compression
  'font-display-insight',                // was: font-display
  'unminified-javascript',
  'unminified-css',
  'unused-css-rules',
];

const lcpRelevantAudits = [
  ...fcpRelevantAudits,
  'lcp-breakdown-insight',               // was: largest-contentful-paint-element
  'lcp-discovery-insight',               // was: prioritize-lcp-image, lcp-lazy-loaded
  'unused-javascript',
  'image-delivery-insight',              // was: efficient-animated-content, uses-optimized-images, uses-responsive-images
  'total-byte-weight',
];

const tbtRelevantAudits = [
  'long-tasks',
  'third-parties-insight',              // was: third-party-summary, third-party-facades
  'bootup-time',
  'mainthread-work-breakdown',
  'dom-size-insight',                    // was: dom-size
  'duplicated-javascript-insight',       // was: duplicated-javascript
  'legacy-javascript-insight',           // was: legacy-javascript
  'viewport-insight',                    // was: viewport
];

const clsRelevantAudits = [
  'cls-culprits-insight',               // was: layout-shift-elements
  'non-composited-animations',
  'unsized-images',
];

const inpRelevantAudits = [
  'inp-breakdown-insight',              // was: work-during-interaction
];

export const metricsToAudits = {
  myRelevantAudits,
  fcpRelevantAudits,
  lcpRelevantAudits,
  tbtRelevantAudits,
  clsRelevantAudits,
  inpRelevantAudits,
};