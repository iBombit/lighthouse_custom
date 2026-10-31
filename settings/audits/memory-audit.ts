import { Audit } from 'lighthouse/core/audits/audit.js';
import type * as LH from 'lighthouse/types/lh.js';
import type {} from '../custom-artifacts.js'; // typings of the custom `MemoryProfile` artifact

const MB = 1024 * 1024;

/** Ids of the rows in the details table (read by the frontend-issues rules). */
export type MemoryMetricId = 'jsHeapUsed' | 'jsHeapTotal' | 'embedderHeapUsed' | 'pageElements' | 'domNodes' | 'jsEventListeners' | 'documents';

/**
 * JavaScript heap, DOM and event listeners at the end of the step (after a forced garbage
 * collection). Informative: heap and counters cover the renderer process, which also keeps earlier
 * pages of the flow alive (Chrome's back/forward cache), so absolute values grow with every page
 * visited and can't be scored per step. Growth across interactions on the same page is reported as
 * a possible leak in the issues for developers.
 */
class MemoryUsage extends Audit {
  static override get meta(): LH.Audit.Meta {
    return {
      id: 'memory-audit',
      title: 'JavaScript memory & DOM size',
      description: 'Memory at the end of the step, after a forced garbage collection, so the values are what is really ' +
        'retained (like a DevTools heap snapshot). The JS heap, DOM nodes, listeners and documents are counted for the ' +
        'renderer process, which also keeps earlier pages of this flow in the back/forward cache: compare steps on the same ' +
        'page rather than across pages. Memory that keeps growing over repeated interactions is a leak and is listed in the ' +
        'issues for developers. To investigate: DevTools → Memory → heap snapshots before and after the interaction, then ' +
        'look for detached DOM trees, listeners that are never removed and caches that only grow.',
      scoreDisplayMode: Audit.SCORING_MODES.INFORMATIVE,
      requiredArtifacts: ['MemoryProfile'],
    };
  }

  static override audit(artifacts: LH.Artifacts): LH.Audit.Product {
    const memory = artifacts.MemoryProfile;
    const gc = memory.afterGarbageCollection ? ', after garbage collection' : ', garbage collection failed: includes garbage';

    const rows: Array<{ id: MemoryMetricId; metric: string; raw: number; value: string; guidance: string }> = [];
    if (typeof memory.pageElements === 'number') {
      rows.push({ id: 'pageElements', metric: 'Elements in this page', raw: memory.pageElements, value: count(memory.pageElements),
        guidance: 'DOM size of the current document only. Lighthouse flags more than ~1,400 elements: large DOMs make style, layout and every update slower.' });
    }
    rows.push(
      { id: 'jsHeapUsed', metric: `JS heap used (renderer${gc})`, raw: memory.jsHeapUsed, value: mb(memory.jsHeapUsed),
        guidance: 'Live JavaScript objects. Growing over interactions on the same page: compare heap snapshots to find what is retained.' },
      { id: 'jsHeapTotal', metric: 'JS heap reserved', raw: memory.jsHeapTotal, value: mb(memory.jsHeapTotal),
        guidance: 'Heap size V8 has reserved.' },
    );
    if (typeof memory.embedderHeapUsed === 'number') {
      rows.push({ id: 'embedderHeapUsed', metric: 'DOM / Blink heap', raw: memory.embedderHeapUsed, value: mb(memory.embedderHeapUsed),
        guidance: 'C++ objects behind the DOM (nodes, styles, ...). Grows with DOM size and with detached DOM trees.' });
    }
    rows.push(
      { id: 'domNodes', metric: 'DOM nodes (renderer)', raw: memory.domNodes, value: count(memory.domNodes),
        guidance: 'All nodes alive in the process, incl. detached ones still referenced from JavaScript and cached earlier pages.' },
      { id: 'jsEventListeners', metric: 'JS event listeners (renderer)', raw: memory.jsEventListeners, value: count(memory.jsEventListeners),
        guidance: 'Should stay flat when the same interaction is repeated; growth means listeners are added but never removed.' },
      { id: 'documents', metric: 'Documents (renderer)', raw: memory.documents, value: count(memory.documents),
        guidance: 'This page, its same-process iframes and cached earlier pages. Growing within one page: detached iframes / documents leak.' },
    );

    return {
      score: null,
      displayValue: `JS heap ${mb(memory.jsHeapUsed)}` +
        (typeof memory.pageElements === 'number' ? ` · ${count(memory.pageElements)} elements on the page` : '') +
        ` · ${count(memory.jsEventListeners)} listeners`,
      details: Audit.makeTableDetails([
        { key: 'metric', valueType: 'text', label: 'Metric' },
        { key: 'value', valueType: 'text', label: 'Value' },
        { key: 'guidance', valueType: 'text', label: 'What it means / what to do' },
      ], rows),
    };
  }
}

function mb(bytes: number): string {
  return `${(bytes / MB).toFixed(1)} MB`;
}

function count(n: number): string {
  return n.toLocaleString('en-US');
}

export default MemoryUsage;
