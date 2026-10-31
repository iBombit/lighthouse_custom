import { Audit } from 'lighthouse/core/audits/audit.js';
import { NetworkRecords } from 'lighthouse/core/computed/network-records.js';
import * as i18n from 'lighthouse/core/lib/i18n/i18n.js';
import type * as LH from 'lighthouse/types/lh.js';
import { isXHRRequest, type ClassifiableRequest } from '../network-filters.js';

const UIStrings = {
    title: 'XHR Request Count',
    failureTitle: 'Too many XHR requests',
    description: 'Number of API calls (XHR / fetch) in the step, broken down by method, status and domain, plus calls ' +
        'made more than once with the same method and URL ("Repeated call"). Repeated identical calls are the easiest ' +
        'win: cache or de-duplicate them (e.g. one request shared by several components). Failed calls (4xx / 5xx) waste ' +
        'time and often trigger retries. Good ≤ 5 calls, 15 scores 0.5.',
    displayValue: `{itemCount, plural,
        =1 {1 XHR request}
        other {# XHR requests}
    }`,
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class XHRCountAudit extends Audit {
    static override get meta(): LH.Audit.Meta {
        return {
            id: 'xhr-count-audit',
            scoreDisplayMode: Audit.SCORING_MODES.NUMERIC,
            title: str_(UIStrings.title),
            failureTitle: str_(UIStrings.failureTitle),
            description: str_(UIStrings.description),
            requiredArtifacts: ['DevtoolsLog'],
        };
    }

    static override get defaultOptions(): LH.Audit.ScoreOptions {
        return {
            // Scoring thresholds for XHR count
            // Good: <= 5 requests, Average: 6-15 requests, Poor: > 15 requests
            p10: 5,
            median: 15,
        };
    }

    /** Whether a network record is an XHR/Fetch API call (see {@link isXHRRequest}). */
    static isXHRRequest(record: ClassifiableRequest): boolean {
        return isXHRRequest(record);
    }

    static override async audit(artifacts: LH.Artifacts, context: LH.Audit.Context): Promise<LH.Audit.Product> {
        const devtoolsLog = artifacts.DevtoolsLog;
        const records = await NetworkRecords.request(devtoolsLog, context);

        // Filter only XHR requests
        const xhrRecords = records.filter(record => XHRCountAudit.isXHRRequest(record));
        const xhrCount = xhrRecords.length;

        // Create breakdown by request method
        const methodBreakdown: Record<string, number> = {};
        const statusBreakdown: Record<string, number> = {};
        const domainBreakdown: Record<string, number> = {};

        xhrRecords.forEach(record => {
            // Method breakdown
            const method = record.requestMethod || 'GET';
            methodBreakdown[method] = (methodBreakdown[method] || 0) + 1;

            // Status code breakdown: 2xx … 5xx; failed requests have no HTTP status (-1 / 0; was "NaNxx" / "-100xx")
            const status = record.statusCode;
            const statusGroup = status > 0 ? `${Math.floor(status / 100)}xx` : 'failed (no response)';
            statusBreakdown[statusGroup] = (statusBreakdown[statusGroup] || 0) + 1;

            // Domain breakdown
            try {
                const domain = new URL(record.url).hostname;
                domainBreakdown[domain] = (domainBreakdown[domain] || 0) + 1;
            } catch {
                domainBreakdown['Unknown'] = (domainBreakdown['Unknown'] || 0) + 1;
            }
        });

        // Calculate score based on XHR count
        // Lower count = better score
        const score = XHRCountAudit.calculateScore(context.options as LH.Audit.ScoreOptions, xhrCount);

        // Create table details for breakdown
        const breakdownItems = [
            ...Object.entries(methodBreakdown).map(([method, count]) => ({
                category: 'HTTP Method',
                name: method,
                count: count,
                percentage: Math.round((count / xhrCount) * 100)
            })),
            ...Object.entries(statusBreakdown).map(([status, count]) => ({
                category: 'Status Code',
                name: status,
                count: count,
                percentage: Math.round((count / xhrCount) * 100)
            })),
            ...Object.entries(domainBreakdown).map(([domain, count]) => ({
                category: 'Domain',
                name: domain,
                count: count,
                percentage: Math.round((count / xhrCount) * 100)
            })),
            // Same method + URL requested more than once in the step: cache or de-duplicate.
            ...repeatedCalls(xhrRecords).map(([call, count]) => ({
                category: 'Repeated call',
                name: call,
                count: count,
                percentage: Math.round((count / xhrCount) * 100)
            }))
        ];

        const headings: LH.Audit.Details.TableColumnHeading[] = [
            { key: 'category', valueType: 'text', label: 'Category' },
            { key: 'name', valueType: 'text', label: 'Name' },
            { key: 'count', valueType: 'numeric', label: 'Count' },
            { key: 'percentage', valueType: 'numeric', label: 'Percentage' },
        ];

        const tableDetails = Audit.makeTableDetails(headings, breakdownItems);

        return {
            score,
            numericValue: xhrCount,
            numericUnit: 'unitless',
            displayValue: str_(UIStrings.displayValue, { itemCount: xhrCount }),
            details: tableDetails,
            // `XHR` is a custom metric key (Lighthouse's typings only list LCP/FCP/CLS/TBT/INP).
            metricSavings: {
                XHR: xhrCount
            } as LH.Audit.ProductMetricSavings
        };
    }

    static calculateScore(options: LH.Audit.ScoreOptions, xhrCount: number): number {
        // Inverse log-normal scoring - fewer requests = better score
        if (xhrCount <= options.p10) {
            return 1; // Perfect score for low XHR count
        }

        // Use inverse scoring where higher count = lower score
        const score = Audit.computeLogNormalScore(
            {
                p10: options.p10,
                median: options.median,
            },
            xhrCount
        );

        return Math.max(0, Math.min(1, score));
    }
}

/** `METHOD url` of API calls made more than once, most repeated first. */
function repeatedCalls(records: LH.Artifacts.NetworkRequest[]): Array<[string, number]> {
    const counts = new Map<string, number>();
    for (const record of records) {
        const key = `${record.requestMethod || 'GET'} ${record.url}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()].filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1]);
}

export default XHRCountAudit;
