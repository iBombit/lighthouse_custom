import { Audit } from 'lighthouse/core/audits/audit.js';
import { MainThreadTasks as MainThreadTasksComputed } from 'lighthouse/core/computed/main-thread-tasks.js';

class CustomMainThreadTasks extends Audit {
    static get meta() {
        return {
            id: 'main-thread-tasks',
            scoreDisplayMode: Audit.SCORING_MODES.INFORMATIVE,
            title: 'Tasks',
            description: 'Lists the toplevel main thread tasks that executed during page load. Only timings, not much details here :()',
            requiredArtifacts: ['Trace'],
        };
    }

    static async audit(artifacts, context) {
        const trace = artifacts.Trace;
        const tasks = await MainThreadTasksComputed.request(trace, context);

        const results = tasks
            .filter(task => task.duration > 5 && !task.parent)
            .map(task => {
                return {
                    duration: task.duration,
                    startTime: task.startTime,
                    endTime: task.endTime,
                };
            });

        const headings = [
            {
                key: 'startTime',
                itemType: 'ms',
                granularity: 1,
                text: 'Start Time',
            },
            {
                key: 'endTime',
                itemType: 'ms',
                granularity: 1,
                text: 'End Time',
            },
            {
                key: 'duration',
                itemType: 'ms',
                granularity: 1,
                text: 'Duration',
            },
        ];

        const tableDetails = Audit.makeTableDetails(headings, results);

        return {
            score: 1,
            details: tableDetails,
        };
    }
}

export default CustomMainThreadTasks;