/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {Gatherer} from 'lighthouse';
import logger from "lh-pptr-framework/logger/logger.js";

class SelectorTimingGatherer extends Gatherer {
  meta = {
    supportedModes: ['navigation'],
  };

  async getArtifact(context) {
    try {
      const timingResult = await context.driver.defaultSession.sendCommand('Runtime.evaluate', {
        expression: `window.pageValidateTiming || null`,
        returnByValue: true,
      });

      if (timingResult.result && timingResult.result.value) {
        const timing = {
          selector: timingResult.result.value.selector || 'pageValidate',
          duration: timingResult.result.value.duration,
          stepName: timingResult.result.value.stepName,
          timestamp: timingResult.result.value.timestamp
        };
        
        return {
          pageValidateTiming: timing
        };
      }
      
      logger.debug('[SELECTOR-TIMING] No timing data found');
      return {
        pageValidateTiming: null
      };
      
    } catch (error) {
      logger.debug('[SELECTOR-TIMING] Error getting timing data:', error.message);
      return {
        pageValidateTiming: null
      };
    }
  }
}

export default SelectorTimingGatherer;
