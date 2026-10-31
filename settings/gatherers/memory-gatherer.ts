import Gatherer from 'lighthouse/core/gather/base-gatherer.js';
import type * as LH from 'lighthouse/types/lh.js';
import logger from '../../logger/logger.js';
import type { MemoryProfileArtifact } from '../custom-artifacts.js';

/**
 * JavaScript heap and DOM counters at the end of the step, measured after a forced garbage
 * collection, so the values are retained memory (what a DevTools heap snapshot shows) and can be
 * compared between steps to spot leaks. Artifacts are collected after the trace has been recorded,
 * so the collection never shows up in the step's metrics.
 *
 * The heap and counters cover the page's renderer process, which also holds earlier pages of the
 * flow that Chrome keeps in its back/forward cache; `pageElements` counts the current document only.
 */
class MemoryProfile extends Gatherer {
  override meta: LH.Gatherer.GathererMeta = {
    supportedModes: ['navigation', 'timespan'],
  };

  override async getArtifact(context: LH.Gatherer.Context): Promise<MemoryProfileArtifact> {
    const session = context.driver.defaultSession;
    let afterGarbageCollection = true;
    try {
      await session.sendCommand('HeapProfiler.collectGarbage');
    } catch (error) {
      afterGarbageCollection = false;
      logger.debug(`[MEMORY] Garbage collection failed: ${(error as Error).message}`);
    }
    const heap = await session.sendCommand('Runtime.getHeapUsage');
    const dom = await session.sendCommand('Memory.getDOMCounters');
    let pageElements: number | undefined;
    try {
      const result = await session.sendCommand('Runtime.evaluate', {
        expression: 'document.getElementsByTagName("*").length',
        returnByValue: true,
      });
      if (typeof result.result.value === 'number') pageElements = result.result.value;
    } catch (error) {
      logger.debug(`[MEMORY] Could not count the page's elements: ${(error as Error).message}`);
    }
    return {
      pageElements,
      jsHeapUsed: heap.usedSize,
      jsHeapTotal: heap.totalSize,
      embedderHeapUsed: heap.embedderHeapUsedSize,
      backingStorage: heap.backingStorageSize,
      domNodes: dom.nodes,
      jsEventListeners: dom.jsEventListeners,
      documents: dom.documents,
      afterGarbageCollection,
    };
  }
}

export default MemoryProfile;
