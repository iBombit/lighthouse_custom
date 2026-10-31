/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Audit } from 'lighthouse/core/audits/audit.js';
import * as i18n from 'lighthouse/core/lib/i18n/i18n.js';
import type * as LH from 'lighthouse/types/lh.js';
import type {} from '../custom-artifacts.js'; // typings of the custom `SelectorTiming` artifact

const UIStrings = {
  title: 'Time to Page Validation Element',
  description: 'Measured by the test: time from the start of `page.goto()` until the page-validation element of the ' +
    'page object was found (`navigationValidate()`; the search starts once the load event fired). A business-specific ' +
    '"page is usable" metric: good ≤ 1 s, poor ≥ 2.5 s. If it is much later than LCP / Load, the element waits for API ' +
    'data or client-side rendering: check the waterfall and the XHR requests of this step. Not applicable when the step ' +
    'did not validate the page. ' +
    '[Learn more about measuring custom timings](https://web.dev/user-centric-performance-metrics/).',
  noTimingFound: 'No page validation timing measured',
  displayValue: 'Selector "{selectorName}" appeared in {timeInMs} ms'
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

// Threshold for what we consider "good" pageValidate timing (in ms)
const GOOD_TIMING_THRESHOLD = 1000;
const POOR_TIMING_THRESHOLD = 2500;

class SelectorTimingAudit extends Audit {
  static override get meta(): LH.Audit.Meta {
    return {
      id: 'selector-timing-audit',
      title: str_(UIStrings.title),
      description: str_(UIStrings.description),
      scoreDisplayMode: Audit.SCORING_MODES.NUMERIC,
      requiredArtifacts: ['SelectorTiming'],
    };
  }

  static override audit(artifacts: LH.Artifacts): LH.Audit.Product {
    const selectorTimingData = artifacts.SelectorTiming;

    // Nothing measured (the step didn't call navigationValidate): not applicable, rather than a
    // perfect score and a 0 ms value sent to Datadog / InfluxDB as before.
    const measured = selectorTimingData?.pageValidateTiming;
    if (!measured || !(typeof measured.duration === 'number' && measured.duration > 0)) {
      return {
        score: null,
        notApplicable: true,
        explanation: str_(UIStrings.noTimingFound),
      };
    }

    const pageValidateTiming = measured;
    const timeSinceNavigation = measured.duration;
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
      displayValue: str_(UIStrings.displayValue, {
        timeInMs: Math.round(timeSinceNavigation),
        selectorName: selectorName
      }),
      details: Audit.makeTableDetails([
        { key: 'selector', valueType: 'code', label: 'Page-validation selector' },
        { key: 'duration', valueType: 'ms', granularity: 1, label: 'Visible after' },
      ], [{ selector: selectorName, duration: timeSinceNavigation }]),
    };
  }
}

export default SelectorTimingAudit;
export { UIStrings };
