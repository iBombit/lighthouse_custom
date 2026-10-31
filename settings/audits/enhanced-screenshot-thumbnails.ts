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
  description: 'Key frames of how the page rendered: the first frame, the first visual change, the frames showing First ' +
    'and Largest Contentful Paint, the moment the page was visually complete and the last visual change, plus evenly ' +
    'spaced frames in between. Long gaps of blank or unchanged frames point at render-blocking resources or late data; ' +
    'changes after "visually complete" are usually ads, carousels or spinners.',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

/** At most this many frames are embedded (all screenshots of a long step made reports huge). */
export const MAX_KEY_FRAMES = 10;

interface Frame {
  /** ms from the time origin. */
  timing: number;
  timestamp: number;
  data: string;
}

/** Moments of the step (ms from the time origin) to point out on the filmstrip, when known. */
export interface FrameMarks {
  /** First visual change (Speedline `first`). */
  firstVisualChange?: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  /** Visually complete (Speedline `complete`). */
  visuallyComplete?: number;
}

/**
 * What each frame shows: the frame on screen at each mark (the first frame at or after it), plus the
 * first and the last frame. `timings` are sorted, in ms from the time origin.
 */
export function frameEvents(timings: number[], marks: FrameMarks): Map<number, string[]> {
  const events = new Map<number, string[]>();
  const tag = (index: number, label: string) => {
    if (index >= 0) events.set(index, [...(events.get(index) ?? []), label]);
  };
  const frameAt = (ms: number | undefined) => (typeof ms === 'number' && Number.isFinite(ms) ? timings.findIndex(t => t >= ms) : -1);
  tag(0, 'First frame');
  tag(frameAt(marks.firstVisualChange), 'First visual change');
  if (marks.firstContentfulPaint !== undefined) tag(frameAt(marks.firstContentfulPaint), `FCP ${Math.round(marks.firstContentfulPaint)} ms`);
  if (marks.largestContentfulPaint !== undefined) tag(frameAt(marks.largestContentfulPaint), `LCP ${Math.round(marks.largestContentfulPaint)} ms`);
  tag(frameAt(marks.visuallyComplete), 'Visually complete');
  tag(timings.length - 1, 'Last visual change');
  return events;
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
    const marks: FrameMarks = {};

    // Speedline (also used by Lighthouse's own filmstrip, so usually cached) knows when the page first
    // changed and when it was visually complete. Per-frame progress isn't used: Lighthouse 13.6 no longer
    // exposes it.
    let frames: Frame[] = [];
    try {
      const speedline = await Speedline.request(trace, context);
      frames = speedline.frames.map(frame => ({
        timing: Math.round(frame.getTimeStamp() - timeOrigin / 1000),
        timestamp: frame.getTimeStamp() * 1000,
        data: `data:image/jpeg;base64,${frame.getImage().toString('base64')}`,
      }));
      marks.firstVisualChange = speedline.first;
      marks.visuallyComplete = speedline.complete;
    } catch {
      const screenshots = await Screenshots.request(trace, context);
      frames = screenshots.map(s => ({ timing: Math.round((s.timestamp - timeOrigin) / 1000), timestamp: s.timestamp, data: s.datauri }));
    }
    if (!frames.length) {
      return { score: null, notApplicable: true };
    }

    try {
      const { timings } = await ProcessedNavigation.request(processedTrace, context);
      marks.firstContentfulPaint = timings.firstContentfulPaint;
      marks.largestContentfulPaint = timings.largestContentfulPaint;
    } catch {
      // Timespan: no paint metrics.
    }

    const timings = frames.map(fr => fr.timing);
    const events = frameEvents(timings, marks);
    const keep = pickKeyFrames(timings, [...events.keys()]);
    const kept = keep.map(i => frames[i]);
    const last = frames[frames.length - 1];

    const filmstrip = {
      type: 'filmstrip',
      scale: Math.max(last.timing, 1),
      items: kept.map(fr => ({ timing: fr.timing, timestamp: fr.timestamp, data: fr.data })),
    } as LH.Audit.Details.Filmstrip;

    return {
      score: 1,
      displayValue: `${marks.visuallyComplete !== undefined ? `visually complete at ${(marks.visuallyComplete / 1000).toFixed(1)} s · ` : ''}` +
        `last change at ${(last.timing / 1000).toFixed(1)} s · ${kept.length} of ${frames.length} frames shown`,
      details: Audit.makeListDetails([
        Audit.makeListDetailSectionItem(filmstrip as unknown as LH.Audit.Details.Table, `Key frames (${kept.length} of ${frames.length} screenshots)`),
        Audit.makeListDetailSectionItem(Audit.makeTableDetails([
          { key: 'timing', valueType: 'ms', granularity: 1, label: 'Time' },
          { key: 'event', valueType: 'text', label: 'What happened' },
        ], keep.map(i => ({
          timing: frames[i].timing,
          event: (events.get(i) ?? []).join(' · '),
        }))), 'Frame timeline'),
      ]),
    };
  }
}

export default EnhancedScreenshotThumbnails;
