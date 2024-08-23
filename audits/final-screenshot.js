import { Audit } from 'lighthouse/core/audits/audit.js';
import { LighthouseError } from 'lighthouse/core/lib/lh-error.js';
import { ProcessedTrace } from 'lighthouse/core/computed/processed-trace.js';
import { Screenshots } from 'lighthouse/core/computed/screenshots.js';
import * as i18n from 'lighthouse/core/lib/i18n/i18n.js';

const UIStrings = {
    title: 'Final Screenshot',
    failureTitle: 'Final Screenshot',
    description:
        'The last screenshot captured of the pageload. May not be accurate if loading time exceeds ~17sec.',
    columnCategory: 'Category',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class CustomFinalScreenshot extends Audit {
    static get meta() {
        return {
            id: 'final-screenshot',
            scoreDisplayMode: Audit.SCORING_MODES.NUMERIC,
            title: 'Final Screenshot Timing',
            failureTitle: 'Final Screenshot Timing',
            description: str_(UIStrings.description),
            requiredArtifacts: ['traces', 'GatherContext'],
        };
    }

    static get defaultOptions() {
        return {
            p10: 2017,
            median: 4000,
        };
    }

    static async audit(artifacts, context) {
        const trace = artifacts.traces[Audit.DEFAULT_PASS];
        const processedTrace = await ProcessedTrace.request(trace, context);
        const screenshots = await Screenshots.request(trace, context);
        const { timeOrigin } = processedTrace.timestamps;
        const finalScreenshot = screenshots[screenshots.length - 1];

        if (!finalScreenshot) {
            // If a timespan didn't happen to contain frames, that's fine. Just mark not applicable.
            if (artifacts.GatherContext.gatherMode === 'timespan') {
                return { notApplicable: true, score: 1 };
            }

            // If it was another mode, that's a fatal error.
            throw new LighthouseError(LighthouseError.errors.NO_SCREENSHOTS);
        }

        const timingValue = Math.round((finalScreenshot.timestamp - timeOrigin) / 1000);
        const score = Audit.computeLogNormalScore(
            { p10: context.options.p10, median: context.options.median },
            timingValue
        );

        return {
            score,
            numericValue: timingValue,
            numericUnit: 'millisecond',
            displayValue: str_(i18n.UIStrings.seconds, { timeInMs: timingValue }),
            details: {
                type: 'screenshot',
                timing: Math.round((finalScreenshot.timestamp - timeOrigin) / 1000),
                timestamp: finalScreenshot.timestamp,
                data: finalScreenshot.datauri,
            },
        };
    }
}

export { UIStrings };
export default CustomFinalScreenshot;