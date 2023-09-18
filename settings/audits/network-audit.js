import { Audit } from 'lighthouse/core/audits/audit.js';
import { taskGroups } from 'lighthouse/core/lib/tracehouse/task-groups.js';
import i18n from 'lighthouse/core/lib/i18n/i18n.js';
import MainThreadTasks from 'lighthouse/core/computed/main-thread-tasks.js';

const UIStrings = {
    title: 'Minimizes main-thread work',
    failureTitle: 'Minimize main-thread work',
    description:
        'Consider reducing the time spent parsing, compiling and executing JS. ' +
        'You may find delivering smaller JS payloads helps with this. ' +
        '[Learn more](https://web.dev/mainthread-work-breakdown/)',
    columnCategory: 'Category',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class CustomNetworkAudit extends Audit {
    static get meta() {
        return {
            id: 'network-audit',
            title: str_(UIStrings.title),
            failureTitle: str_(UIStrings.failureTitle),
            description: str_(UIStrings.description),
            scoreDisplayMode: Audit.SCORING_MODES.INFORMATIVE,
            requiredArtifacts: ['traces'],
        };
    }

    static get defaultOptions() {
        return {
            p10: 2017,
            median: 4000,
        };
    }

    static getExecutionTimingsByGroup(tasks) {
        const result = new Map();

        for (const task of tasks) {
            const originalTime = result.get(task.group.id) || 0;
            result.set(task.group.id, originalTime + task.selfTime);
        }

        return result;
    }

    static getExecutionTimingsBySelf(tasks) {
        const result = new Map();

        for (const task of tasks) {
            const originalTime = result.get(task.attributableURLs[0]) || 0;
            result.set(task.attributableURLs[0], originalTime + task.selfTime);
        }

        return result;
    }

    static async audit(artifacts, context) {
        const settings = context.settings || {};
        const trace = artifacts.traces[Audit.DEFAULT_PASS];

        const tasks = await MainThreadTasks.request(trace, context);
        const multiplier =
            settings.throttlingMethod === 'simulate'
                ? settings.throttling.cpuSlowdownMultiplier
                : 1;

        const executionTimings = CustomNetworkAudit.getExecutionTimingsByGroup(
            tasks
        );

        let totalExecutionTime = 0;
        const categoryTotals = {};

        const results = Array.from(executionTimings).map(
            ([groupId, rawDuration]) => {
                const duration = rawDuration * multiplier;
                totalExecutionTime += duration;

                const categoryTotal = categoryTotals[groupId] || 0;
                categoryTotals[groupId] = categoryTotal + duration;

                return {
                    group: groupId,
                    groupLabel: taskGroups[groupId].label,
                    duration: duration,
                };
            }
        );

        const headings = [
            {
                key: 'groupLabel',
                itemType: 'text',
                text: str_(UIStrings.columnCategory),
            },
            {
                key: 'duration',
                itemType: 'ms',
                granularity: 1,
                text: str_(i18n.UIStrings.columnTimeSpent),
            },
        ];

        results.sort((a, b) => categoryTotals[b.group] - categoryTotals[a.group]);
        const tableDetails = Audit.makeTableDetails(headings, results);

        const score = Audit.computeLogNormalScore(
            {
                p10: context.options.p10,
                median: context.options.median,
            },
            totalExecutionTime
        );

        return {
            score,
            //score: 1,
            numericValue: totalExecutionTime,
            numericUnit: 'millisecond',
            displayValue: str_(i18n.UIStrings.seconds, {
                timeInMs: totalExecutionTime,
            }),
            details: tableDetails,
        };
    }
}

export { UIStrings };
export default CustomNetworkAudit;