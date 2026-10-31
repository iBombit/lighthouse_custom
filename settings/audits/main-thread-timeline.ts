import { Audit } from 'lighthouse/core/audits/audit.js';
import type { TaskGroupIds } from 'lighthouse/core/lib/tracehouse/task-groups.js';
import type * as LH from 'lighthouse/types/lh.js';
import { buildActivityChart } from '../../reporting/charts/activityChart.js';
import { fmtMs } from '../../reporting/charts/format.js';
import { TASK_GROUP_STYLE, svgToDataUri } from '../../reporting/charts/svg.js';
import { DEEP_DIVE_ARTIFACTS, loadDeepDiveContext } from './deep-dive-context.js';
import { LONG_TASK_MS, activityBins, activityTotals, shortScriptName, summarizeTask } from './main-thread-analysis.js';

const PARTY_LABEL = { first: '1st party', third: '3rd party', other: 'Browser / unattributed' } as const;
const SCRIPTING: TaskGroupIds[] = ['scriptEvaluation', 'scriptParseCompile', 'garbageCollection'];

/**
 * DevTools-style view of the main thread: CPU activity by category over time (like the Performance
 * panel's CPU track), the task lane, the activity summary and main-thread time per script (Bottom-Up by URL).
 */
class MainThreadTimeline extends Audit {
    static override get meta(): LH.Audit.Meta {
        return {
            id: 'main-thread-timeline',
            title: 'Main-thread activity',
            description: 'What the browser main thread was busy with over time, like the CPU track and the Summary / ' +
                'Bottom-Up tabs of the DevTools Performance panel: script evaluation, parse & compile, style & layout, ' +
                'paint, HTML parsing and garbage collection, with long tasks and FCP / LCP / TTI markers. Use it to see ' +
                'whether time goes to JavaScript or to rendering, and which scripts keep the main thread busy. ' +
                '[Analyze runtime performance](https://developer.chrome.com/docs/devtools/performance).',
            scoreDisplayMode: Audit.SCORING_MODES.INFORMATIVE,
            supportedModes: ['navigation', 'timespan'],
            requiredArtifacts: DEEP_DIVE_ARTIFACTS,
        };
    }

    static override async audit(artifacts: LH.Artifacts, context: LH.Audit.Context): Promise<LH.Audit.Product> {
        const dd = await loadDeepDiveContext(artifacts, context);
        const { binMs, bins } = activityBins(dd.topLevel, dd.timelineEnd, 240);
        const totals = activityTotals(dd.topLevel);
        const busy = totals.reduce((s, t) => s + t.total, 0);
        const scripting = totals.filter(t => SCRIPTING.includes(t.group)).reduce((s, t) => s + t.total, 0);
        const longTasks = dd.topLevel.filter(t => t.duration > LONG_TASK_MS);

        const chart = buildActivityChart({
            title: 'Main-thread activity',
            subtitle: `${fmtMs(busy)} busy · ${busy ? Math.round((scripting / busy) * 100) : 0}% JavaScript · ${longTasks.length} long tasks`,
            endMs: dd.timelineEnd,
            binMs,
            bins,
            tasks: dd.topLevel.filter(t => t.duration >= 3).map(t => {
                const summary = t.duration > LONG_TASK_MS ? summarizeTask(t, dd.urlOf) : undefined;
                return {
                    start: t.startTime, duration: t.duration, tbtImpact: t.tbtImpact,
                    group: summary?.mainGroup ?? t.group.id,
                    label: summary?.urls[0] ? shortScriptName(summary.urls[0].url) : undefined,
                };
            }),
            markers: dd.markers,
            window: dd.window,
            totals: totals.map(t => ({ group: t.group, ms: t.total })),
        });

        // Bottom-up by script URL: self time per activity.
        const byUrl = new Map<string, Partial<Record<TaskGroupIds, number>> & { total: number }>();
        for (const task of dd.tasks) {
            const url = dd.urlOf(task);
            const entry = byUrl.get(url) ?? { total: 0 };
            entry[task.group.id] = (entry[task.group.id] ?? 0) + task.selfTime;
            entry.total += task.selfTime;
            byUrl.set(url, entry);
        }
        const scripts = [...byUrl.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 15);

        return {
            score: 1,
            displayValue: `${fmtMs(busy)} main-thread time · ${busy ? Math.round((scripting / busy) * 100) : 0}% JavaScript`,
            explanation: dd.windowNote,
            details: Audit.makeListDetails([
                Audit.makeListDetailSectionItem(
                    Audit.makeTableDetails([{ key: 'chart', valueType: 'thumbnail', label: '' }], [{ chart: svgToDataUri(chart) }]),
                    'CPU activity over time',
                    'Stacked share of main-thread time per activity (like the DevTools CPU track), with long tasks in the lane below. ' +
                    'Hover the chart for details; "Open full size" opens it in a new tab.'),
                Audit.makeListDetailSectionItem(Audit.makeTableDetails([
                    { key: 'activity', valueType: 'text', label: 'Activity' },
                    { key: 'total', valueType: 'ms', granularity: 1, label: 'Main-thread time' },
                    { key: 'share', valueType: 'text', label: 'Share' },
                    { key: 'inLongTasks', valueType: 'ms', granularity: 1, label: 'In long tasks' },
                ], totals.map(t => ({
                    activity: TASK_GROUP_STYLE[t.group].label,
                    total: t.total,
                    share: busy ? `${Math.round((t.total / busy) * 100)}%` : '-',
                    inLongTasks: t.inLongTasks,
                }))), 'Summary'),
                Audit.makeListDetailSectionItem(Audit.makeTableDetails([
                    { key: 'url', valueType: 'url', label: 'Script' },
                    { key: 'party', valueType: 'text', label: 'Party' },
                    { key: 'scripting', valueType: 'ms', granularity: 1, label: 'Script evaluation' },
                    { key: 'compile', valueType: 'ms', granularity: 1, label: 'Parse & compile' },
                    { key: 'rendering', valueType: 'ms', granularity: 1, label: 'Style, layout & paint' },
                    { key: 'total', valueType: 'ms', granularity: 1, label: 'Total self time' },
                ], scripts.map(([url, e]) => ({
                    url,
                    party: PARTY_LABEL[dd.partyOf(url)],
                    scripting: e.scriptEvaluation ?? 0,
                    compile: e.scriptParseCompile ?? 0,
                    rendering: (e.styleLayout ?? 0) + (e.paintCompositeRender ?? 0),
                    total: e.total,
                }))), 'Bottom-up by script', 'Main-thread self time attributed to each script, like DevTools Bottom-Up grouped by URL.'),
            ]),
        };
    }
}

export default MainThreadTimeline;
