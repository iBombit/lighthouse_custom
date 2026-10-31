import type * as LH from 'lighthouse/types/lh.js';

/** Timing stored on `window.pageValidateTiming` by `Page.navigationValidate()`. */
export interface PageValidateTiming {
  selector: string;
  duration: number;
  stepName: string;
  timestamp: number;
}

/** `SelectorTiming` artifact (selector-timing gatherer). */
export interface SelectorTimingArtifact {
  pageValidateTiming: PageValidateTiming | null;
}

/** One XHR/Fetch request captured by the network-request-bodies gatherer. */
export interface CapturedRequestBody {
  requestId: string;
  uniqueKey: string;
  url: string;
  method: string;
  headers: LH.Crdp.Network.Headers;
  postData: string | null;
  hasPostData: boolean;
  timestamp: number;
  wallTime: number;
  responseStatus: number | null;
  responseHeaders: LH.Crdp.Network.Headers | null;
  responseMimeType: string | null;
  /** Request body as shown by the network-xhr-audit. */
  formattedPostData: string | null;
  /** GraphQL operation name, when the body is JSON with `operationName`. */
  operationName: string | null;
  summary: string;
}

/** `NetworkRequestBodies` artifact, keyed by `<requestId>_<counter>`. */
export interface NetworkRequestBodiesArtifact {
  requestBodies: Record<string, CapturedRequestBody>;
  totalRequests: number;
}

/**
 * `MemoryProfile` artifact: memory at the end of the step, after a forced garbage collection (sizes
 * in bytes). Heap and DOM counters cover the page's renderer process, including earlier pages of the
 * flow kept in Chrome's back/forward cache; `pageElements` counts the current document only.
 */
export interface MemoryProfileArtifact {
  /** Elements in the current document (`document.getElementsByTagName('*')`). */
  pageElements?: number;
  /** Live JavaScript objects (`Runtime.getHeapUsage` `usedSize`). */
  jsHeapUsed: number;
  /** Heap reserved by V8. */
  jsHeapTotal: number;
  /** Blink's garbage-collected heap (DOM objects and other C++ objects owned by JS). */
  embedderHeapUsed?: number;
  /** Array buffers and external strings. */
  backingStorage?: number;
  domNodes: number;
  jsEventListeners: number;
  documents: number;
  /** False when the garbage collection couldn't be forced (values then include garbage). */
  afterGarbageCollection: boolean;
}

// Register the custom artifacts with Lighthouse's artifact typings so audits can
// list them in `requiredArtifacts` and read them type-safely.
declare module 'lighthouse/types/artifacts.js' {
  interface GathererArtifacts {
    MemoryProfile: MemoryProfileArtifact;
    SelectorTiming: SelectorTimingArtifact;
    NetworkRequestBodies: NetworkRequestBodiesArtifact;
  }
}
