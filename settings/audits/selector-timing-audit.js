/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {Audit} from 'lighthouse';
import * as i18n from 'lighthouse/core/lib/i18n/i18n.js';

const UIStrings = {
  title: 'Time to Page Validation Element',
  description: 'Measures the time between page navigation and when the page validation element becomes visible. ' +
    'This helps track how quickly the critical validation element appears after navigation. ' +
    '[Learn more about measuring custom timings](https://web.dev/user-centric-performance-metrics/).',
  noTimingFound: 'No page validation timing measured',
  displayValue: 'Selector "{selectorName}" appeared in {timeInMs} ms'
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

// Threshold for what we consider "good" pageValidate timing (in ms)
const GOOD_TIMING_THRESHOLD = 1000;
const POOR_TIMING_THRESHOLD = 2500;

class SelectorTimingAudit extends Audit {
  static get meta() {
    return {
      id: 'selector-timing-audit',
      title: str_(UIStrings.title),
      description: str_(UIStrings.description),
      scoreDisplayMode: Audit.SCORING_MODES.NUMERIC,
      requiredArtifacts: ['SelectorTiming'],
    };
  }

  static audit(artifacts) {
    const selectorTimingData = artifacts.SelectorTiming;
    
    if (!selectorTimingData || !selectorTimingData.pageValidateTiming) {
      return {
        score: 1,
        numericValue: 0,
        numericUnit: 'millisecond',
        displayValue: str_(UIStrings.noTimingFound),
      };
    }

    const pageValidateTiming = selectorTimingData.pageValidateTiming;
    const timeSinceNavigation = pageValidateTiming.duration || 0;
    const selectorName = pageValidateTiming.selector || 'pageValidate element';
    
    // Calculate score based on the pageValidate timing
    let score = 1;
    if (timeSinceNavigation > POOR_TIMING_THRESHOLD) {
      score = 0;
    } else if (timeSinceNavigation > GOOD_TIMING_THRESHOLD) {
      score = Math.max(0, (POOR_TIMING_THRESHOLD - timeSinceNavigation) / (POOR_TIMING_THRESHOLD - GOOD_TIMING_THRESHOLD));
    }

    return {
      score: score,
      numericValue: timeSinceNavigation,
      numericUnit: 'millisecond',
      displayValue: timeSinceNavigation > 0 ? 
        str_(UIStrings.displayValue, { 
          timeInMs: Math.round(timeSinceNavigation),
          selectorName: selectorName
        }) : 
        str_(UIStrings.noTimingFound),
    };
  }
}

export default SelectorTimingAudit;
export { UIStrings };
