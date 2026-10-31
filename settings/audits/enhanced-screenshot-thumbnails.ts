import { Audit } from 'lighthouse/core/audits/audit.js';
import { Screenshots } from 'lighthouse/core/computed/screenshots.js';
import { ProcessedTrace } from 'lighthouse/core/computed/processed-trace.js';
import { ProcessedNavigation } from 'lighthouse/core/computed/processed-navigation.js';
import { Speedline } from 'lighthouse/core/computed/speedline.js';
import * as i18n from 'lighthouse/core/lib/i18n/i18n.js';
import type * as LH from 'lighthouse/types/lh.js';

const UIStrings = {
  title: 'Screenshot Thumbnails with Timing',
  failureTitle: 'Screenshot Thumbnails with Timing (failure)',
  description: 'Key frames of how the page rendered: the first frame, the frames showing First and Largest Contentful ' +
    'Paint, when visual progress reached 50 / 90 / 100 %, and the last visual change, plus evenly spaced frames in ' +
    'between. Long gaps of blank or unchanged frames point at render-blocking resources or late data; late changes ' +
    'after "visually complete" are usually ads, carousels or spinners.',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

/** At most this many frames are embedded (all screenshots of a long step made reports huge). */
export const MAX_KEY_FRAMES = 10;

interface Frame {
  /** ms from the time origin. */
  timing: number;
  timestamp: number;
  data: string;
  /** Visual completeness 0–100, when known. */
  progress?: number;
}

/**
 * Picks at most `max` frame indices: first and last, the given must-have frames, then frames
 * spread evenly over time. Sorted.
 */
export function pickKeyFrames(timings: number[], mustHave: number[], max = MAX_KEY_FRAMES): number[] {
  const n = timings.length;
  if (n <= max) return timings.map((_, i) => i);
  const picked = new Set<number>([0, n - 1]);
  for (const i of mustHave) if (picked.size < max && i >= 0 && i < n) picked.add(i);
  const start = timings[0], end = timings[n - 1];
  // Evenly spaced targets; take the frame closest to each target that isn't picked yet.
  for (let slots = max - picked.size, k = 1; picked.size < max && k <= slots * 4; k++) {
    const target = start + ((end - start) * k) / (slots * 4 + 1);
    const candidates = [...Array(n).keys()].filter(i => !picked.has(i));
    if (!candidates.length) break;
    const best = candidates.reduce((a, b) => (Math.abs(timings[b] - target) < Math.abs(timings[a] - target) ? b : a));
    // Only add frames that aren't crammed next to one already picked.
    const minGap = (end - start) / (max * 2);
    if ([...picked].every(i => Math.abs(timings[i] - timings[best]) >= minGap)) picked.add(best);
  }
  return [...picked].sort((a, b) => a - b);
}

class EnhancedScreenshotThumbnails extends Audit {
  static override get meta(): LH.Audit.Meta {
    return {
      id: 'enhanced-screenshot-thumbnails',
      scoreDisplayMode: Audit.SCORING_MODES.INFORMATIVE,
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['Trace'],
    };
  }

  static override async audit(artifacts: LH.Artifacts, context: LH.Audit.Context): Promise<LH.Audit.Product> {
    const trace = artifacts.Trace;
    const processedTrace = await ProcessedTrace.request(trace, context);
    const { timeOrigin } = processedTrace.timestamps;

    // Speedline (also used by Lighthouse's own filmstrip, so usually cached) adds visual progress.
    let frames: Frame[] = [];
    try {
      const speedline = await Speedline.request(trace, context);
      frames = speedline.frames.map(frame => ({
        timing: Math.round(frame.getTimeStamp() - timeOrigin / 1000),
        timestamp: frame.getTimeStamp() * 1000,
        data: `data:image/jpeg;base64,${frame.getImage().toString('base64')}`,
        progress: frame.getProgress(),
      }));
    } catch {
      const screenshots = await Screenshots.request(trace, context);
      frames = screenshots.map(s => ({ timing: Math.round((s.timestamp - timeOrigin) / 1000), timestamp: s.timestamp, data: s.datauri }));
    }
    if (!frames.length) {
      return { score: null, notApplicable: true };
    }

    // Frames to keep: what was on screen at FCP / LCP and at visual-progress milestones.
    const events = new Map<number, string[]>();
    const tag = (index: number, label: string) => { if (index >= 0) events.set(index, [...(events.get(index) ?? []), label]); };
    const frameAt = (ms: number) => frames.findIndex(fr => fr.timing >= ms);
    try {
      const { timings } = await ProcessedNavigation.request(processedTrace, context);
      tag(frameAt(timings.firstContentfulPaint), `FCP ${Math.round(timings.firstContentfulPaint)} ms`);
      if (timings.largestContentfulPaint !== undefined) tag(frameAt(timings.largestContentfulPaint), `LCP ${Math.round(timings.largestContentfulPaint)} ms`);
    } catch {
      // Timespan: no paint metrics.
    }
    const hasProgress = frames.some(fr => typeof fr.progress === 'number');
    if (hasProgress) {
      for (const pct of [50, 90]) tag(frames.findIndex(fr => (fr.progress ?? 0) >= pct), `${pct}% visually complete`);
      tag(frames.findIndex(fr => (fr.progress ?? 0) >= 100), 'Visually complete');
    }
    tag(0, 'First frame');
    tag(frames.length - 1, 'Last visual change');

    const keep = pickKeyFrames(frames.map(fr => fr.timing), [...events.keys()]);
    const kept = keep.map(i => frames[i]);
    const visuallyComplete = hasProgress ? frames.find(fr => (fr.progress ?? 0) >= 100) : undefined;
    const last = frames[frames.length - 1];

    const filmstrip = {
      type: 'filmstrip',
      scale: Math.max(last.timing, 1),
      items: kept.map(fr => ({ timing: fr.timing, timestamp: fr.timestamp, data: fr.data })),
    } as LH.Audit.Details.Filmstrip;

    return {
      score: 1,
      displayValue: `${visuallyComplete ? `visually complete at ${(visuallyComplete.timing / 1000).toFixed(1)} s · ` : ''}` +
        `last change at ${(last.timing / 1000).toFixed(1)} s · ${kept.length} of ${frames.length} frames shown`,
      details: Audit.makeListDetails([
        Audit.makeListDetailSectionItem(filmstrip as unknown as LH.Audit.Details.Table, `Key frames (${kept.length} of ${frames.length} screenshots)`),
        Audit.makeListDetailSectionItem(Audit.makeTableDetails([
          { key: 'timing', valueType: 'ms', granularity: 1, label: 'Time' },
          { key: 'progress', valueType: 'text', label: 'Visual progress' },
          { key: 'event', valueType: 'text', label: 'What happened' },
        ], keep.map(i => ({
          timing: frames[i].timing,
          progress: typeof frames[i].progress === 'number' ? `${Math.round(frames[i].progress!)}%` : '',
          event: (events.get(i) ?? []).join(' · '),
        }))), 'Frame timeline'),
      ]),
    };
  }
}

export default EnhancedScreenshotThumbnails;
