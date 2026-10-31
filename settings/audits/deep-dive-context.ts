/**
 * Data shared by the "Performance Deep Dive" audits, built from Lighthouse's own computed artifacts
 * (cached per step, so the audits don't recompute each other's work).
 */
import { Audit } from 'lighthouse/core/audits/audit.js';
import { TBTImpactTasks } from 'lighthouse/core/computed/tbt-impact-tasks.js';
import { MainThreadTasks } from 'lighthouse/core/computed/main-thread-tasks.js';
import { ProcessedTrace } from 'lighthouse/core/computed/processed-trace.js';
import { ProcessedNavigation } from 'lighthouse/core/computed/processed-navigation.js';
import { NetworkRecords } from 'lighthouse/core/computed/network-records.js';
import { EntityClassification } from 'lighthouse/core/computed/entity-classification.js';
import { getAttributableURLForTask, getJavaScriptURLs } from 'lighthouse/core/lib/tracehouse/task-summary.js';
import thirdPartyWeb from 'lighthouse/core/lib/third-party-web.js';
import UrlUtils from 'lighthouse/core/lib/url-utils.js';
import type * as LH from 'lighthouse/types/lh.js';
import { MARKER_COLOR, type ChartMarker, type Party } from '../../reporting/charts/svg.js';
import type { AnalysisTask } from './main-thread-analysis.js';

/** Artifacts needed to reproduce Lighthouse's TBT calculation (same as the `bootup-time` audit). */
export const DEEP_DIVE_ARTIFACTS: Array<keyof LH.Artifacts> = ['Trace', 'DevtoolsLog', 'URL', 'GatherContext', 'SourceMaps', 'HostDPR'];

export interface DeepDiveContext {
    gatherMode: LH.Gatherer.GatherMode;
    /** Every main-thread task (incl. descendants) with its TBT impact. */
    tasks: LH.Artifacts.TBTImpactTask[];
    topLevel: LH.Artifacts.TBTImpactTask[];
    /** TBT window to shade in charts (navigation only: FCP → TTI). */
    window?: { start: number; end: number; label: string };
    /** Sum of the top-level tasks' TBT impact — equals Lighthouse's Total Blocking Time. */
    totalTbt: number;
    markers: ChartMarker[];
    /** End of the chart time axis (ms). */
    timelineEnd: number;
    /** Set when the TBT window couldn't be computed and blocking time covers the whole step. */
    windowNote?: string;
    processedTrace: LH.Artifacts.ProcessedTrace;
    urlOf: (task: AnalysisTask) => string;
    partyOf: (url: string) => Party;
    entityOf: (url: string) => string;
}

const isUrl = (s: string) => /^[a-z][a-z0-9+.-]*:\/\//i.test(s);

export async function loadDeepDiveContext(artifacts: LH.Artifacts, context: LH.Audit.Context): Promise<DeepDiveContext> {
    const gatherMode = artifacts.GatherContext.gatherMode;
    const metricData = Audit.makeMetricComputationDataInput(artifacts, context);
    const processedTrace = await ProcessedTrace.request(artifacts.Trace, context);
    const records = await NetworkRecords.request(artifacts.DevtoolsLog, context);
    const entities = await EntityClassification.request({ URL: artifacts.URL, devtoolsLog: artifacts.DevtoolsLog }, context);
    const jsURLs = getJavaScriptURLs(records);

    let tasks: LH.Artifacts.TBTImpactTask[];
    let bounds: { startTimeMs: number; endTimeMs: number } | undefined;
    let windowNote: string | undefined;
    try {
        tasks = await TBTImpactTasks.request(metricData, context);
        bounds = await TBTImpactTasks.getTbtBounds(metricData, context);
    } catch (error) {
        // E.g. no FCP or TTI in the trace: show blocking time over the whole step instead.
        const all = await MainThreadTasks.request(artifacts.Trace, context);
        tasks = TBTImpactTasks.computeImpactsFromObservedTasks(all, 0, Infinity);
        windowNote = `The TBT window could not be computed (${(error as Error).message}); blocking time covers the whole step.`;
    }
    const topLevel = tasks.filter(t => !t.parent);
    const totalTbt = topLevel.reduce((sum, t) => sum + t.tbtImpact, 0);

    const markers: ChartMarker[] = [];
    let loadMs = 0;
    if (gatherMode === 'navigation') {
        try {
            const { timings } = await ProcessedNavigation.request(processedTrace, context);
            const add = (t: number | undefined, label: string) => { if (t !== undefined && Number.isFinite(t)) markers.push({ t, label, color: MARKER_COLOR[label] ?? '#5f6368' }); };
            add(timings.firstContentfulPaint, 'FCP');
            add(timings.largestContentfulPaint, 'LCP');
            add(timings.domContentLoaded, 'DCL');
            add(timings.load, 'Load');
            loadMs = timings.load ?? 0;
        } catch {
            // No navigation in the trace.
        }
        if (bounds && Number.isFinite(bounds.endTimeMs)) markers.push({ t: bounds.endTimeMs, label: 'TTI', color: MARKER_COLOR.TTI });
    }

    const traceEnd = processedTrace.timings.traceEnd;
    const lastTaskEnd = topLevel.reduce((max, t) => (t.duration >= 10 ? Math.max(max, t.endTime) : max), 0);
    const finiteTtiEnd = bounds && Number.isFinite(bounds.endTimeMs) ? bounds.endTimeMs : 0;
    const rawEnd = gatherMode === 'navigation'
        ? Math.min(Math.max(finiteTtiEnd, loadMs, lastTaskEnd, 1) * 1.03, traceEnd > 0 ? traceEnd : Infinity)
        : traceEnd;
    const timelineEnd = Number.isFinite(rawEnd) && rawEnd > 0 ? rawEnd : Math.max(lastTaskEnd, 1);

    const window = gatherMode === 'navigation' && bounds && Number.isFinite(bounds.endTimeMs)
        ? { start: bounds.startTimeMs, end: bounds.endTimeMs, label: 'TBT window (FCP → TTI)' }
        : undefined;

    // Same rules as Lighthouse's EntityClassification, also for scripts that weren't requested in this
    // step (e.g. a timespan after the page loaded): known third-party-web entity, else the root domain.
    const entityName = (url: string): string => {
        if (!isUrl(url)) return url;
        const known = entities.entityByUrl.get(url)?.name ?? thirdPartyWeb.getEntity(url)?.name;
        if (known) return known;
        try {
            return UrlUtils.getRootDomain(url) || new URL(url).hostname;
        } catch {
            return url;
        }
    };
    const firstPartyName = entities.firstParty?.name;

    return {
        gatherMode, tasks, topLevel, window, totalTbt, markers, windowNote, processedTrace, timelineEnd,
        urlOf: task => getAttributableURLForTask(task as unknown as LH.Artifacts.TaskNode, jsURLs),
        partyOf: url => (!isUrl(url) ? 'other' : firstPartyName !== undefined && entityName(url) === firstPartyName ? 'first' : 'third'),
        entityOf: entityName,
    };
}

/** Lighthouse's TBT scoring curve (p10 → score 0.9, median → 0.5) for the form factor. */
export function tbtScoring(formFactor: string | undefined): LH.Audit.ScoreOptions {
    return formFactor === 'mobile' ? { p10: 200, median: 600 } : { p10: 150, median: 350 };
}
