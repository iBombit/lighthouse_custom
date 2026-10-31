import { Audit } from 'lighthouse/core/audits/audit.js';
import { CpuProfileModel } from 'lighthouse/core/lib/tracehouse/cpu-profile-model.js';
import type * as LH from 'lighthouse/types/lh.js';
import { buildBarChart } from '../../reporting/charts/barChart.js';
import { fmtMs } from '../../reporting/charts/format.js';
import { PARTY_COLOR, svgToDataUri } from '../../reporting/charts/svg.js';
import { functionHotspots, type CpuProfileData } from './cpu-profile-analysis.js';
import { DEEP_DIVE_ARTIFACTS, loadDeepDiveContext } from './deep-dive-context.js';
import { LONG_TASK_MS, shortScriptName } from './main-thread-analysis.js';

const PARTY_LABEL = { first: '1st party', third: '3rd party', other: 'Browser / unattributed' } as const;

/** Formats a zero-based `line:column` as the one-based position editors and DevTools show. */
const position = (line: number, column: number) => (line >= 0 ? `${line + 1}:${column + 1}` : '');

/**
 * JavaScript functions with the most self time inside long tasks ("Bottom-Up" view), from the V8 CPU
 * samples that `--jsProfiling=true` adds to the trace. Not applicable without samples.
 */
class JsHotspots extends Audit {
    static override get meta(): LH.Audit.Meta {
        return {
            id: 'js-hotspots',
            title: 'JavaScript hot spots in long tasks',
            description: 'The JavaScript functions that kept the main thread busy during long tasks, from the V8 CPU ' +
                'profile — like the Bottom-Up tab of the DevTools Performance panel. "Self time" is time spent in the ' +
                'function itself; "total time" includes the functions it called. Requires `--jsProfiling=true` ' +
                '(JavaScript sampling adds overhead, so compare metrics only between runs with the same setting). ' +
                '[Find slow functions with the Bottom-Up tab](https://developer.chrome.com/docs/devtools/performance/reference#bottom-up).',
            scoreDisplayMode: Audit.SCORING_MODES.INFORMATIVE,
            supportedModes: ['navigation', 'timespan'],
            requiredArtifacts: DEEP_DIVE_ARTIFACTS,
        };
    }

    static override async audit(artifacts: LH.Artifacts, context: LH.Audit.Context): Promise<LH.Audit.Product> {
        const allProfiles = CpuProfileModel.collectProfileEvents(artifacts.Trace.traceEvents);
        if (!allProfiles.length) {
            return {
                score: null,
                notApplicable: true,
                explanation: 'No JavaScript samples in the trace. Run with --jsProfiling=true to see the slowest functions.',
            };
        }

        const dd = await loadDeepDiveContext(artifacts, context);
        const mainThread = dd.processedTrace.mainThreadEvents[0];
        const profiles = allProfiles
            .filter(p => !mainThread || (p.pid === mainThread.pid && p.tid === mainThread.tid)) as unknown as CpuProfileData[];
        const longTaskRanges = dd.topLevel
            .filter(t => t.duration > LONG_TASK_MS)
            .map((t): [number, number] => [t.startTime, t.endTime])
            .sort((a, b) => a[0] - b[0]);
        const hotspots = functionHotspots(profiles, dd.processedTrace.timestamps.timeOrigin, longTaskRanges)
            .filter(h => h.selfInLongTasks >= 0.5 || h.selfTime >= 1);
        const inLongTasks = hotspots.filter(h => h.selfInLongTasks >= 0.5);
        const shown = (inLongTasks.length ? inLongTasks : hotspots).slice(0, 25);
        const metric = inLongTasks.length ? 'selfInLongTasks' : 'selfTime';
        const partyOf = (url: string) => (url ? dd.partyOf(url) : 'other');

        const chart = buildBarChart({
            title: inLongTasks.length ? 'JavaScript functions with the most self time in long tasks' : 'JavaScript functions with the most self time',
            subtitle: inLongTasks.length
                ? `${longTaskRanges.length} long tasks · ${fmtMs(inLongTasks.reduce((s, h) => s + h.selfInLongTasks, 0))} of JavaScript self time sampled inside them`
                : 'No JavaScript ran inside long tasks in this step; showing the busiest functions overall',
            rows: shown.slice(0, 15).map(h => ({
                label: h.functionName,
                sublabel: h.url ? `${shortScriptName(h.url)}:${position(h.lineNumber, h.columnNumber)}` : 'native / browser',
                tooltip: `${h.functionName} ${h.url}:${position(h.lineNumber, h.columnNumber)}\nself in long tasks ${fmtMs(h.selfInLongTasks)} · total in long tasks ${fmtMs(h.totalInLongTasks)} · self overall ${fmtMs(h.selfTime)}`,
                value: h[metric],
                color: PARTY_COLOR[partyOf(h.url)],
                valueLabel: fmtMs(h[metric]),
            })),
            legend: [{ label: '1st party', fill: PARTY_COLOR.first }, { label: '3rd party', fill: PARTY_COLOR.third }, { label: 'Browser / unattributed', fill: PARTY_COLOR.other }],
            emptyText: 'No JavaScript samples on the main thread in this step.',
        });

        const top = shown[0];
        return {
            score: 1,
            displayValue: top ? `Top: ${top.functionName} (${fmtMs(top[metric])} self time${inLongTasks.length ? ' in long tasks' : ''})` : 'No JavaScript samples',
            details: Audit.makeListDetails([
                Audit.makeListDetailSectionItem(
                    Audit.makeTableDetails([{ key: 'chart', valueType: 'thumbnail', label: '' }], [{ chart: svgToDataUri(chart) }]),
                    'Hot spots', 'Hover the chart for details; "Open full size" opens it in a new tab.'),
                Audit.makeListDetailSectionItem(Audit.makeTableDetails([
                    { key: 'functionName', valueType: 'code', label: 'Function' },
                    { key: 'url', valueType: 'url', label: 'Script' },
                    { key: 'position', valueType: 'text', label: 'Line:column' },
                    { key: 'party', valueType: 'text', label: 'Party' },
                    { key: 'selfInLongTasks', valueType: 'ms', granularity: 0.1, label: 'Self time in long tasks' },
                    { key: 'totalInLongTasks', valueType: 'ms', granularity: 0.1, label: 'Total time in long tasks' },
                    { key: 'selfTime', valueType: 'ms', granularity: 0.1, label: 'Self time (whole step)' },
                ], shown.map(h => ({
                    functionName: h.functionName,
                    url: h.url || '(native)',
                    position: position(h.lineNumber, h.columnNumber),
                    party: PARTY_LABEL[partyOf(h.url)],
                    selfInLongTasks: h.selfInLongTasks,
                    totalInLongTasks: h.totalInLongTasks,
                    selfTime: h.selfTime,
                }))), 'Functions', 'Bottom-Up by function. Positions are 1-based, as shown in DevTools Sources.'),
            ]),
        };
    }
}

export default JsHotspots;
