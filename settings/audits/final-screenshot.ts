import { Audit } from 'lighthouse/core/audits/audit.js';
import { LighthouseError } from 'lighthouse/core/lib/lh-error.js';
import { ProcessedTrace } from 'lighthouse/core/computed/processed-trace.js';
import { Screenshots } from 'lighthouse/core/computed/screenshots.js';
import * as i18n from 'lighthouse/core/lib/i18n/i18n.js';
import type * as LH from 'lighthouse/types/lh.js';

const UIStrings = {
    title: 'Final Screenshot',
    failureTitle: 'Final Screenshot',
    description:
        'Time of the last screenshot in the trace, i.e. the last time anything on the screen changed ("last visual ' +
        'change"). Good ≤ 2 s, 4 s scores 0.5. When it is much later than LCP, something keeps changing the page after ' +
        'the main content: late-loading content, ads, carousels, animations or spinners. The key frames in "Screenshot ' +
        'Thumbnails with Timing" show what changed. Very long steps may be cut off by the screenshot buffer of Chrome.',
    columnCategory: 'Category',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class CustomFinalScreenshot extends Audit {
    static override get meta(): LH.Audit.Meta {
        return {
            id: 'final-screenshot',
            scoreDisplayMode: Audit.SCORING_MODES.NUMERIC,
            title: 'Final Screenshot Timing (last visual change)',
            failureTitle: 'Final Screenshot Timing (last visual change)',
            description: str_(UIStrings.description),
            requiredArtifacts: ['Trace', 'GatherContext'],
        };
    }

    static override get defaultOptions(): LH.Audit.ScoreOptions {
        return {
            p10: 2017,
            median: 4000,
        };
    }

    static override async audit(artifacts: LH.Artifacts, context: LH.Audit.Context): Promise<LH.Audit.Product> {
        const trace = artifacts.Trace;
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
