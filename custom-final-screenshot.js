/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('lighthouse/lighthouse-core/audits/audit.js');
const LHError = require('lighthouse/lighthouse-core/lib/lh-error.js');
const ProcessedTrace = require('lighthouse/lighthouse-core/computed/processed-trace.js');
const Screenshots = require('lighthouse/lighthouse-core/computed/screenshots.js');

const i18n = require('lighthouse/lighthouse-core/lib/i18n/i18n.js');

const UIStrings = {
  /** Title of a diagnostic audit that provides detail on the main thread work the browser did to load the page. This descriptive title is shown to users when the amount is acceptable and no user action is required. */
  title: 'Final Screenshot',
  /** Title of a diagnostic audit that provides detail on the main thread work the browser did to load the page. This imperative title is shown to users when there is a significant amount of execution time that could be reduced. */
  failureTitle: 'Final Screenshot',
  /** Description of a Lighthouse audit that tells the user *why* they should reduce JS execution times. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'Consider reducing the time spent parsing, compiling and executing JS. ' +
    'You may find delivering smaller JS payloads helps with this. ' +
    '[Learn more](https://web.dev/mainthread-work-breakdown/)',
  /** Label for the Main Thread Category column in data tables, rows will have a main thread Category and main thread Task Name. */
  columnCategory: 'Category',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);


class CustomFinalScreenshot extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'final-screenshot',
      //scoreDisplayMode: Audit.SCORING_MODES.INFORMATIVE,
      scoreDisplayMode: Audit.SCORING_MODES.NUMERIC,
      title: 'Final Screenshot Timing',
	  failureTitle: 'Final Screenshot Timing',
      description: 'The last screenshot captured of the pageload.',
      requiredArtifacts: ['traces', 'GatherContext'],
    };
  }

 /**
   * @return {LH.Audit.ScoreOptions}
   */
  static get defaultOptions() {
    return {
      // see https://www.desmos.com/calculator/vhglu1x8zv
      p10: 2017,
      median: 4000,
    };
  }
  
  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const trace = artifacts.traces[Audit.DEFAULT_PASS];
    const processedTrace = await ProcessedTrace.request(trace, context);
    const screenshots = await Screenshots.request(trace, context);
    const {timeOrigin} = processedTrace.timestamps;
    const finalScreenshot = screenshots[screenshots.length - 1];

    if (!finalScreenshot) {
      // If a timespan didn't happen to contain frames, that's fine. Just mark not applicable.
      if (artifacts.GatherContext.gatherMode === 'timespan') return {notApplicable: true, score: 1};

      // If it was another mode, that's a fatal error.
      throw new LHError(LHError.errors.NO_SCREENSHOTS);
    }
	
	const timingValue = Math.round((finalScreenshot.timestamp - timeOrigin) / 1000);
//	const score = Math.max(1 - ( timingValue / 1000), 0);
   const score = Audit.computeLogNormalScore(
      {p10: context.options.p10, median: context.options.median},
      timingValue
    );

    return {
      //score: 1,
	  score,
		numericValue: timingValue,
        numericUnit: 'millisecond',
		displayValue: str_(i18n.UIStrings.seconds, {timeInMs: timingValue}),
      details: {
        type: 'screenshot',
        timing: Math.round((finalScreenshot.timestamp - timeOrigin) / 1000),
        timestamp: finalScreenshot.timestamp,
        data: finalScreenshot.datauri,
      },
    };
  }
}

module.exports = CustomFinalScreenshot;
