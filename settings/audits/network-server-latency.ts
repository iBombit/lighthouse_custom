/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Audit } from 'lighthouse/core/audits/audit.js';
import * as i18n from 'lighthouse/core/lib/i18n/i18n.js';
import { NetworkRecords } from 'lighthouse/core/computed/network-records.js';
import { NetworkAnalysis } from 'lighthouse/core/computed/network-analysis.js';
import type * as LH from 'lighthouse/types/lh.js';
import { requestTimingBreakdown } from './network-timing.js';

const UIStrings = {
    /** Descriptive title of a Lighthouse audit that tells the user the server latencies observed from each origin the page connected to. This is displayed in a list of audit titles that Lighthouse generates. */
    title: 'Server Backend Latencies',
    /** Description of a Lighthouse audit that tells the user that server latency can effect their website's performance negatively. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
    description: 'Estimated server response time of each origin the step talked to: the median time to first byte of its ' +
        'requests minus the network round trip, i.e. backend time. Score: 0 ms → 1, 500 ms or more → 0 (the slowest origin ' +
        'counts). High values are for the team owning that origin (slow API or page generation, cold caches, overloaded ' +
        'servers); the slowest request of each origin is listed to start from. ' +
        '[Learn more about server response time](https://hpbn.co/primer-on-web-performance/#analyzing-the-resource-waterfall).',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class NetworkServerLatency extends Audit {
    static override get meta(): LH.Audit.Meta {
        return {
            id: 'network-server-latency',
            scoreDisplayMode: Audit.SCORING_MODES.NUMERIC,
            title: str_(UIStrings.title),
            description: str_(UIStrings.description),
            requiredArtifacts: ['DevtoolsLog'],
        };
    }

    static override async audit(artifacts: LH.Artifacts, context: LH.Audit.Context): Promise<LH.Audit.Product> {
        const devtoolsLog = artifacts.DevtoolsLog;
        const records = await NetworkRecords.request(devtoolsLog, context);
        if (!records.length) {
            return {
                score: 1,
                notApplicable: true,
            };
        }

        const analysis = await NetworkAnalysis.request(devtoolsLog, context);

        // Requests and the slowest time to first byte per origin, to start the investigation from.
        const byOrigin = new Map<string, { requests: number; slowestTtfb: number; slowestUrl: string }>();
        for (const record of records) {
            const origin = record.parsedURL?.securityOrigin;
            if (!origin) continue;
            const entry = byOrigin.get(origin) ?? { requests: 0, slowestTtfb: 0, slowestUrl: '' };
            entry.requests++;
            const ttfb = requestTimingBreakdown(record).waiting;
            if (ttfb > entry.slowestTtfb || !entry.slowestUrl) {
                entry.slowestTtfb = ttfb;
                entry.slowestUrl = record.url;
            }
            byOrigin.set(origin, entry);
        }

        let maxLatency = 0;
        const results: Array<{ origin: string; serverResponseTime: number; requests: number; slowestTtfb: number; slowestUrl: string }> = [];
        for (const [origin, serverResponseTime] of analysis.serverResponseTimeByOrigin.entries()) {
            // Ignore entries that don't look like real origins, like the __SUMMARY__ entry.
            if (!origin.startsWith('http')) continue;

            maxLatency = Math.max(serverResponseTime, maxLatency);
            const stats = byOrigin.get(origin) ?? { requests: 0, slowestTtfb: 0, slowestUrl: '' };
            results.push({ origin, serverResponseTime, ...stats });
        }

        results.sort((a, b) => b.serverResponseTime - a.serverResponseTime);

        const headings: LH.Audit.Details.Table['headings'] = [
            { key: 'origin', valueType: 'text', label: str_(i18n.UIStrings.columnURL) },
            { key: 'serverResponseTime', valueType: 'ms', granularity: 1, label: 'Server time (median)' },
            { key: 'requests', valueType: 'numeric', granularity: 1, label: 'Requests' },
            { key: 'slowestTtfb', valueType: 'ms', granularity: 1, label: 'Slowest TTFB' },
            { key: 'slowestUrl', valueType: 'url', label: 'Slowest request' },
        ];

        const tableDetails = Audit.makeTableDetails(headings, results,
            { sortedBy: ['serverResponseTime'] });

        return {
            score: Math.max(1 - (maxLatency / 500), 0),
            numericValue: maxLatency,
            numericUnit: 'millisecond',
            displayValue: str_(i18n.UIStrings.ms, { timeInMs: maxLatency }),
            details: tableDetails,
        };
    }
}

export default NetworkServerLatency;
export { UIStrings };
