import { Audit } from 'lighthouse/core/audits/audit.js';
import type * as LH from 'lighthouse/types/lh.js';
import { buildLongTasksChart } from '../../reporting/charts/longTasksChart.js';
import { TASK_GROUP_STYLE, svgToDataUri } from '../../reporting/charts/svg.js';
import { DEEP_DIVE_ARTIFACTS, loadDeepDiveContext, tbtScoring } from './deep-dive-context.js';
import { LONG_TASK_MS, activityTotals, blockingByUrl, shortScriptName, summarizeTask } from './main-thread-analysis.js';

const PARTY_LABEL = { first: '1st party', third: '3rd party', other: 'Browser / unattributed' } as const;

/**
 * Drill-down of Total Blocking Time: which long tasks are counted in TBT, what they were doing and
 * which scripts caused them. Built on Lighthouse's TBTImpactTasks, so it adds up to the reported TBT.
 * No `numericValue` on purpose: the Datadog/InfluxDB reporters forward every numeric audit.
 */
class TbtBreakdown extends Audit {
    static override get meta(): LH.Audit.Meta {
        return {
            id: 'tbt-breakdown',
            title: 'Total Blocking Time breakdown',
            failureTitle: 'Total Blocking Time breakdown — long tasks to break up',
            description: 'Where Total Blocking Time (TBT) comes from: every main-thread task longer than 50 ms ' +
                'in the TBT window (FCP → TTI for navigations, the whole step for timespans), the part of it that blocked ' +
                'input, what the main thread was doing and which scripts (first or third party) ran in it. Uses Lighthouse\'s ' +
                'own TBT calculation, so the contributions add up to the reported TBT. For call stacks, open the step\'s trace in ' +
                'the DevTools Performance panel (run with `--saveTraces=true`) or enable `--jsProfiling=true` for the ' +
                '"JavaScript hot spots" audit. [Learn how to optimize long tasks](https://web.dev/articles/optimize-long-tasks).',
            scoreDisplayMode: Audit.SCORING_MODES.NUMERIC,
            supportedModes: ['navigation', 'timespan'],
            requiredArtifacts: DEEP_DIVE_ARTIFACTS,
        };
    }

    static override async audit(artifacts: LH.Artifacts, context: LH.Audit.Context): Promise<LH.Audit.Product> {
        const dd = await loadDeepDiveContext(artifacts, context);
        const tbt = Math.round(dd.totalTbt);
        const longTasks = dd.topLevel.filter(t => t.duration > LONG_TASK_MS);
        const counted = longTasks.filter(t => t.tbtImpact > 0);
        const scripts = blockingByUrl(dd.tasks, dd.urlOf).filter(s => s.tbtImpact >= 0.5 || s.blockingTime >= 0.5);
        const contributing = scripts.filter(s => s.tbtImpact >= 0.5);
        const summaries = longTasks.map(t => summarizeTask(t, dd.urlOf));
        const share = (ms: number) => (tbt > 0 ? `${Math.round((ms / dd.totalTbt) * 100)}%` : '-');

        // ── Chart ──────────────────────────────────────────────────────────
        const chart = buildLongTasksChart({
            title: 'Where does Total Blocking Time come from?',
            subtitle: dd.gatherMode === 'navigation'
                ? `TBT ${tbt} ms · ${counted.length} of ${longTasks.length} long tasks inside the TBT window (FCP → TTI)`
                : `TBT ${tbt} ms over the whole step · ${longTasks.length} long tasks`,
            endMs: dd.timelineEnd,
            tasks: dd.topLevel
                .filter(t => t.duration >= 4)
                .map(t => {
                    const summary = t.duration > LONG_TASK_MS ? summarizeTask(t, dd.urlOf) : undefined;
                    return {
                        start: t.startTime, duration: t.duration, tbtImpact: t.tbtImpact,
                        group: summary?.mainGroup ?? t.group.id,
                        label: summary?.urls[0] ? shortScriptName(summary.urls[0].url) : undefined,
                    };
                }),
            window: dd.window,
            markers: dd.markers,
            scripts: contributing.slice(0, 10).map(s => {
                const party = dd.partyOf(s.url);
                return {
                    label: party === 'third' ? `${shortScriptName(s.url)} — ${dd.entityOf(s.url)}` : shortScriptName(s.url),
                    tooltip: `${s.url} (${dd.entityOf(s.url)}, ${PARTY_LABEL[party]})`,
                    value: s.tbtImpact,
                    party,
                };
            }),
            totalTbt: dd.totalTbt,
        });

        // ── Tables ─────────────────────────────────────────────────────────
        const sections: LH.Audit.Details.ListSectionItem[] = [
            Audit.makeListDetailSectionItem(
                Audit.makeTableDetails([{ key: 'chart', valueType: 'thumbnail', label: '' }], [{ chart: svgToDataUri(chart) }]),
                'Main-thread timeline',
                'Each bar is a main-thread task. The first 50 ms of a task are fine; the red hatched part is blocking time. ' +
                'Only blocking time inside the shaded TBT window counts towards TBT. Hover the chart for details; "Open full size" opens it in a new tab.'),
        ];

        if (scripts.length) {
            sections.push(Audit.makeListDetailSectionItem(Audit.makeTableDetails([
                { key: 'url', valueType: 'url', label: 'Script' },
                { key: 'entity', valueType: 'text', label: 'Entity' },
                { key: 'party', valueType: 'text', label: 'Party' },
                { key: 'tbtImpact', valueType: 'ms', granularity: 1, label: 'TBT contribution' },
                { key: 'share', valueType: 'text', label: '% of TBT' },
                { key: 'longTasks', valueType: 'numeric', granularity: 1, label: 'Long tasks' },
                { key: 'blockingTime', valueType: 'ms', granularity: 1, label: 'Blocking (whole step)' },
                { key: 'selfTime', valueType: 'ms', granularity: 1, label: 'Main-thread time' },
            ], scripts.slice(0, 15).map(s => ({
                url: s.url,
                entity: dd.entityOf(s.url),
                party: PARTY_LABEL[dd.partyOf(s.url)],
                tbtImpact: s.tbtImpact,
                share: share(s.tbtImpact),
                longTasks: s.longTasks,
                blockingTime: s.blockingTime,
                selfTime: s.selfTime,
            }))), 'TBT contribution by script',
            'Blocking time attributed to the script that ran (Lighthouse\'s attribution, as in "Reduce JavaScript execution time"). ' +
            '"Blocking (whole step)" also counts long tasks outside the TBT window.'));
        }

        if (summaries.length) {
            const rows = [...summaries].sort((a, b) => b.tbtImpact - a.tbtImpact || b.duration - a.duration).slice(0, 20);
            sections.push(Audit.makeListDetailSectionItem(Audit.makeTableDetails([
                { key: 'startTime', valueType: 'ms', granularity: 1, label: 'Start' },
                { key: 'duration', valueType: 'ms', granularity: 1, label: 'Duration', subItemsHeading: { key: 'selfTime', valueType: 'ms', granularity: 1 } },
                { key: 'blockingTime', valueType: 'ms', granularity: 1, label: 'Blocking (> 50 ms)' },
                { key: 'tbtImpact', valueType: 'ms', granularity: 1, label: 'Counted in TBT' },
                { key: 'activity', valueType: 'text', label: 'Main activity' },
                { key: 'url', valueType: 'url', label: 'Top script', subItemsHeading: { key: 'url', valueType: 'url' } },
            ], rows.map(s => {
                const main = s.groups[0];
                return {
                    startTime: s.startTime,
                    duration: s.duration,
                    blockingTime: s.blockingTime,
                    tbtImpact: s.tbtImpact,
                    activity: main ? `${TASK_GROUP_STYLE[main.group].label} (${Math.round((main.ms / s.duration) * 100)}%)` : '',
                    url: s.urls[0]?.url ?? '',
                    subItems: { type: 'subitems' as const, items: s.urls.slice(0, 5).map(u => ({ url: u.url, selfTime: u.ms })) },
                };
            })), 'Long tasks',
            `Tasks over ${LONG_TASK_MS} ms, most TBT first (times from the start of the step). Expand a row for the scripts that ran in it.`));

            const activity = activityTotals(dd.topLevel).filter(a => a.inLongTasks > 0);
            sections.push(Audit.makeListDetailSectionItem(Audit.makeTableDetails([
                { key: 'activity', valueType: 'text', label: 'Activity' },
                { key: 'inLongTasks', valueType: 'ms', granularity: 1, label: 'In long tasks' },
                { key: 'total', valueType: 'ms', granularity: 1, label: 'Total main-thread time' },
            ], activity.map(a => ({ activity: TASK_GROUP_STYLE[a.group].label, inLongTasks: a.inLongTasks, total: a.total }))),
            'What the main thread was doing in long tasks'));
        } else {
            sections.push(Audit.makeListDetailSectionItem({ type: 'text', value: 'No main-thread task took longer than 50 ms in this step.' }, 'Long tasks'));
        }

        const top = contributing[0];
        return {
            score: Audit.computeLogNormalScore(tbtScoring(context.settings.formFactor), tbt),
            displayValue: tbt === 0
                ? (longTasks.length ? `No blocking time in the TBT window · ${longTasks.length} long task(s) outside it` : 'No long tasks')
                : `${tbt} ms TBT from ${counted.length} long task(s)` + (top ? ` · top: ${shortScriptName(top.url)} (${Math.round(top.tbtImpact)} ms)` : ''),
            explanation: dd.windowNote,
            details: Audit.makeListDetails(sections),
        };
    }
}

export default TbtBreakdown;
