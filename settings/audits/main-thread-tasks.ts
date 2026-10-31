import { Audit } from 'lighthouse/core/audits/audit.js';
import type * as LH from 'lighthouse/types/lh.js';
import { TASK_GROUP_STYLE } from '../../reporting/charts/svg.js';
import { DEEP_DIVE_ARTIFACTS, loadDeepDiveContext } from './deep-dive-context.js';
import { LONG_TASK_MS, shortScriptName, summarizeTask } from './main-thread-analysis.js';

/** Tasks shorter than this are left out (as in Lighthouse's own `main-thread-tasks`). */
const MIN_TASK_MS = 5;

/**
 * Every top-level main-thread task over 5 ms in start order, with what it was doing and which
 * script it ran (the table used to have start / end / duration only).
 */
class CustomMainThreadTasks extends Audit {
    static override get meta(): LH.Audit.Meta {
        return {
            id: 'main-thread-tasks',
            scoreDisplayMode: Audit.SCORING_MODES.INFORMATIVE,
            title: 'Main-thread tasks over 5 ms',
            description: `Every top-level main-thread task longer than ${MIN_TASK_MS} ms in start order — the "Task" bars of the ` +
                'DevTools Performance panel — with the activity it spent most time on and the script it ran. Tasks over ' +
                `${LONG_TASK_MS} ms are long tasks: the part over ${LONG_TASK_MS} ms is blocking time, and inside the TBT window ` +
                'it adds to Total Blocking Time. Use it to follow the sequence of work; "Total Blocking Time breakdown" ranks ' +
                'the scripts and functions to fix.',
            requiredArtifacts: DEEP_DIVE_ARTIFACTS,
        };
    }

    static override async audit(artifacts: LH.Artifacts, context: LH.Audit.Context): Promise<LH.Audit.Product> {
        const dd = await loadDeepDiveContext(artifacts, context);
        const tasks = dd.topLevel.filter(task => task.duration > MIN_TASK_MS).sort((a, b) => a.startTime - b.startTime);

        const results = tasks.map(task => {
            const summary = summarizeTask(task, dd.urlOf);
            return {
                startTime: task.startTime,
                endTime: task.endTime,
                duration: task.duration,
                blockingTime: summary.blockingTime,
                tbtImpact: summary.tbtImpact,
                activity: TASK_GROUP_STYLE[summary.mainGroup].label,
                script: summary.urls[0] ? shortScriptName(summary.urls[0].url) : '',
            };
        });
        const longTasks = results.filter(r => r.duration > LONG_TASK_MS).length;

        return {
            score: 1,
            displayValue: `${results.length} tasks · ${longTasks} long`,
            details: Audit.makeTableDetails([
                { key: 'startTime', valueType: 'ms', granularity: 1, label: 'Start Time' },
                { key: 'endTime', valueType: 'ms', granularity: 1, label: 'End Time' },
                { key: 'duration', valueType: 'ms', granularity: 1, label: 'Duration' },
                { key: 'blockingTime', valueType: 'ms', granularity: 1, label: `Blocking (> ${LONG_TASK_MS} ms)` },
                { key: 'tbtImpact', valueType: 'ms', granularity: 1, label: 'Counted in TBT' },
                { key: 'activity', valueType: 'text', label: 'Mostly' },
                { key: 'script', valueType: 'text', label: 'Main script' },
            ], results),
        };
    }
}

export default CustomMainThreadTasks;
