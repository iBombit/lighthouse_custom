import { Audit } from 'lighthouse/core/audits/audit.js';
import { Screenshots } from 'lighthouse/core/computed/screenshots.js';
import { ProcessedTrace } from 'lighthouse/core/computed/processed-trace.js';
import * as i18n from 'lighthouse/core/lib/i18n/i18n.js';

const UIStrings = {
  title: 'Screenshot Thumbnails with Timing',
  failureTitle: 'Screenshot Thumbnails with Timing (failure)',
  description: 'Screenshots of the page during load with timing information.',
  displayValue: `{itemCount, plural,
    =1 {1 screenshot}
    other {# screenshots}
  }`,
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class EnhancedScreenshotThumbnails extends Audit {
  static get meta() {
    return {
      id: 'enhanced-screenshot-thumbnails',
      scoreDisplayMode: Audit.SCORING_MODES.INFORMATIVE,
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['traces'],
    };
  }

  static async audit(artifacts, context) {
    const trace = artifacts.traces[Audit.DEFAULT_PASS];
    const processedTrace = await ProcessedTrace.request(trace, context);
    const screenshots = await Screenshots.request(trace, context);
    
    if (!screenshots.length) {
      return {
        score: null,
        notApplicable: true,
      };
    }

    const { timeOrigin } = processedTrace.timestamps;

    // Transform screenshots into format with clear timing information
    const items = screenshots.map((screenshot, index) => {
      const timing = Math.round((screenshot.timestamp - timeOrigin) / 1000);
      
      return {
        timing,
        timestamp: screenshot.timestamp,
        data: screenshot.datauri,
        timingLabel: `${timing}ms`,
        sequenceNumber: index + 1,
      };
    });

    /** @type {LH.Audit.Details.Table} */
    const details = {
      type: 'table',
      headings: [
        { key: 'sequenceNumber', itemType: 'text', text: '#' },
        { key: 'timingLabel', itemType: 'text', text: 'Timing' },
        { key: 'screenshot', itemType: 'thumbnail', text: 'Screenshot' },
      ],
      items: items.map(item => ({
        sequenceNumber: item.sequenceNumber,
        timingLabel: item.timingLabel,
        screenshot: item.data,
      })),
    };

    const displayValue = str_(UIStrings.displayValue, {itemCount: items.length});

    return {
      score: 1,
      displayValue,
      details,
    };
  }
}

export default EnhancedScreenshotThumbnails;
