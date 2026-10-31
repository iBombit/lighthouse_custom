/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import Gatherer from 'lighthouse/core/gather/base-gatherer.js';
import type * as LH from 'lighthouse/types/lh.js';
import logger from "../../logger/logger.js";
import type { PageValidateTiming, SelectorTimingArtifact } from '../custom-artifacts.js';

/** Reads the `window.pageValidateTiming` object stored by `Page.navigationValidate()`. */
class SelectorTimingGatherer extends Gatherer {
  override meta: LH.Gatherer.GathererMeta = {
    supportedModes: ['navigation'],
  };

  override async getArtifact(context: LH.Gatherer.Context): Promise<SelectorTimingArtifact> {
    try {
      const timingResult = await context.driver.defaultSession.sendCommand('Runtime.evaluate', {
        expression: `window.pageValidateTiming || null`,
        returnByValue: true,
      });

      if (timingResult.result && timingResult.result.value) {
        const value = timingResult.result.value as Partial<PageValidateTiming>;
        const timing = {
          selector: value.selector || 'pageValidate',
          duration: value.duration,
          stepName: value.stepName,
          timestamp: value.timestamp
        } as PageValidateTiming;

        return {
          pageValidateTiming: timing
        };
      }

      logger.debug('[SELECTOR-TIMING] No timing data found');
      return {
        pageValidateTiming: null
      };

    } catch (error) {
      logger.debug('[SELECTOR-TIMING] Error getting timing data:', (error as Error).message);
      return {
        pageValidateTiming: null
      };
    }
  }
}

export default SelectorTimingGatherer;
