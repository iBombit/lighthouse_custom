import { Audit } from 'lighthouse/core/audits/audit.js';
import UrlUtils from 'lighthouse/core/lib/url-utils.js';
import { NetworkRecords } from 'lighthouse/core/computed/network-records.js';
import { MainResource } from 'lighthouse/core/computed/main-resource.js';
import { EntityClassification } from 'lighthouse/core/computed/entity-classification.js';
import * as i18n from 'lighthouse/core/lib/i18n/i18n.js';
import type * as LH from 'lighthouse/types/lh.js';
import { fmtBytes } from '../../reporting/charts/format.js';
import { requestTimingBreakdown, timingHint } from './network-timing.js';

const UIStrings = {
    title: 'Network Requests',
    failureTitle: 'Network Requests',
    description: 'All requests of the step, grouped by entity (company / site) with each request as a sub-row. ' +
        'Score: time from the first request until the last one finished (network idle), good ≤ 2 s, 4 s scores 0.5. ' +
        'Late requests (ads, analytics, polling) push it out even when the page is usable: use the Network Waterfall ' +
        'to see which requests delay rendering.',
    columnCategory: 'Category',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

/** A network record with times (ms) relative to the earliest renderer start. */
interface NormalizedRecord {
    url: string;
    rendererStartTime: number | undefined;
    networkRequestTime: number | undefined;
    networkEndTime: number | undefined;
    duration: number;
    transferSize: number;
    resourceSize: number;
    statusCode: number;
    mimeType: string;
    isLinkPreload: true | undefined;
    experimentalFromMainFrame: true | undefined;
    entity: string | undefined;
}

/**
 * Row of the `network-requests` table: one row per entity, with its individual
 * requests (sorted by start time) as sub-items.
 */
export interface NetworkRequestsTableItem extends LH.Audit.Details.TableItem {
    url: string;
    networkRequestTime?: number;
    duration?: number;
    transferSize: number;
    resourceSize: number;
    statusCode: number | string;
    mimeType: string;
    entity?: string;
    networkEndTime?: number;
}

// ── Audit ──────────────────────────────────────────────────────────────
class NetworkRequests extends Audit {
    static override get meta(): LH.Audit.Meta {
        return {
            id: 'network-requests',
            scoreDisplayMode: Audit.SCORING_MODES.NUMERIC,
            title: str_(UIStrings.title),
            description: str_(UIStrings.description),
            requiredArtifacts: ['DevtoolsLog', 'URL', 'GatherContext'],
        };
    }

    static override get defaultOptions(): LH.Audit.ScoreOptions {
        return {
            p10: 2017,
            median: 4000,
        };
    }

    static override async audit(artifacts: LH.Artifacts, context: LH.Audit.Context): Promise<LH.Audit.Product> {
        const devtoolsLog = artifacts.DevtoolsLog;
        const records = await NetworkRecords.request(devtoolsLog, context);
        if (records.length === 0) {
            // E.g. an interaction that made no requests (was: "-∞ s" with a null value).
            return { score: null, notApplicable: true, explanation: 'No network requests in this step.' };
        }
        const classifiedEntities = await EntityClassification.request({ URL: artifacts.URL, devtoolsLog }, context);
        const mainFrameId = await getMainFrameId(artifacts, context);

        const earliestRendererStartTime = getEarliestRendererStartTime(records);
        const normalizedRecords = records.map(record => normalizeRecord(record, classifiedEntities, earliestRendererStartTime, mainFrameId));

        const maxExecutionTime = getMaxExecutionTime(normalizedRecords);
        const score = calculateScore(context, maxExecutionTime);

        return {
            score,
            numericValue: maxExecutionTime,
            numericUnit: 'millisecond',
            displayValue: `${(maxExecutionTime / 1000).toFixed(1)} s · ${records.length} requests · ${fmtBytes(records.reduce((sum, r) => sum + (r.transferSize || 0), 0))}`,
            details: createTableDetails(normalizedRecords),
        };
    }
}

/** Frame id of the main document in navigation mode (`undefined` in timespan/snapshot mode). */
export async function getMainFrameId(artifacts: LH.Artifacts, context: LH.Audit.Context): Promise<string | undefined> {
    if (artifacts.GatherContext.gatherMode === 'navigation') {
        const mainResource = await MainResource.request({ devtoolsLog: artifacts.DevtoolsLog, URL: artifacts.URL }, context);
        return mainResource.frameId;
    }
    return undefined;
}

/** Earliest `rendererStartTime` of all records (`Infinity` when there are none). */
export function getEarliestRendererStartTime(records: LH.Artifacts.NetworkRequest[]): number {
    return records.reduce((min, record) => Math.min(min, record.rendererStartTime), Infinity);
}

/**
 * The request with the longest duration (the first one on ties). Requests without a
 * duration — never finished, or started before the step, like a beacon from the previous
 * page — are skipped; returns `undefined` when no request has a duration.
 */
export function findLongestRequest<T extends { duration?: number }>(requests: T[]): T | undefined {
    let longest: T | undefined;
    for (const request of requests) {
        if (typeof request.duration !== 'number' || !Number.isFinite(request.duration)) continue;
        if (!longest || request.duration > longest.duration!) longest = request;
    }
    return longest;
}

function normalizeRecord(record: LH.Artifacts.NetworkRequest, classifiedEntities: LH.Artifacts.EntityClassification, earliestRendererStartTime: number, mainFrameId: string | undefined): NormalizedRecord {
    const entity = classifiedEntities.entityByUrl.get(record.url);
    const normalizedTime = (time: number) => time < earliestRendererStartTime || !Number.isFinite(time) ? undefined : (time - earliestRendererStartTime);
    // NaN when either time is unavailable, exactly as before.
    const duration = normalizedTime(record.networkEndTime)! - normalizedTime(record.networkRequestTime)!;

    return {
        url: UrlUtils.elideDataURI(record.url),
        rendererStartTime: normalizedTime(record.rendererStartTime),
        networkRequestTime: normalizedTime(record.networkRequestTime),
        networkEndTime: normalizedTime(record.networkEndTime),
        duration: duration,
        transferSize: record.transferSize,
        resourceSize: record.resourceSize,
        statusCode: record.statusCode,
        mimeType: record.mimeType,
        isLinkPreload: record.isLinkPreload || undefined,
        experimentalFromMainFrame: mainFrameId ? ((record.frameId === mainFrameId) || undefined) : undefined,
        entity: entity?.name,
    };
}

function getMaxExecutionTime(records: NormalizedRecord[]): number {
    return Math.max(...records.map(record => record.networkEndTime || 0));
}

function calculateScore(context: LH.Audit.Context, maxExecutionTime: number): number {
    return Audit.computeLogNormalScore({
        p10: context.options.p10,
        median: context.options.median,
    }, maxExecutionTime);
}

function createTableDetails(records: NormalizedRecord[]): LH.Audit.Details.Table {
    // ── Group by entity ────────────────────────────────────────────────
    const grouped = new Map<string, NormalizedRecord[]>();
    for (const r of records) {
        const key = r.entity || 'Unknown';
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(r);
    }

    const items: NetworkRequestsTableItem[] = [];
    for (const [entity, reqs] of grouped) {
        // Sort sub-items by start time (natural waterfall order)
        const sorted = reqs.sort((a, b) => (a.networkRequestTime ?? 0) - (b.networkRequestTime ?? 0));

        const totalDuration = sorted.reduce((s, r) => s + (r.duration ?? 0), 0);
        const totalTransfer = sorted.reduce((s, r) => s + (r.transferSize ?? 0), 0);
        const totalResource = sorted.reduce((s, r) => s + (r.resourceSize ?? 0), 0);
        const groupStart    = Math.min(...sorted.map(r => r.networkRequestTime ?? 0));
        const groupEnd      = Math.max(...sorted.map(r => r.networkEndTime ?? 0));

        items.push({
            url: entity,
            networkRequestTime: Math.round(groupStart),
            duration: Math.round(totalDuration),
            transferSize: totalTransfer,
            resourceSize: totalResource,
            statusCode: '',
            mimeType: '',
            entity: entity,
            networkEndTime: Math.round(groupEnd),
            subItems: {
                type: 'subitems',
                items: sorted.map(r => ({
                    url: r.url,
                    networkRequestTime: r.networkRequestTime ? Math.round(r.networkRequestTime) : undefined,
                    duration: r.duration ? Math.round(r.duration) : undefined,
                    transferSize: r.transferSize,
                    resourceSize: r.resourceSize,
                    statusCode: r.statusCode,
                    mimeType: r.mimeType,
                    entity: r.entity,
                    networkEndTime: r.networkEndTime ? Math.round(r.networkEndTime) : undefined,
                })),
            },
        });
    }

    // Sort entity groups by start time (waterfall reading order)
    items.sort((a, b) => a.networkRequestTime! - b.networkRequestTime!);

    // ── Headings ───────────────────────────────────────────────────────
    const headings: LH.Audit.Details.TableColumnHeading[] = [
        {
            key: 'url', valueType: 'url', label: 'URL',
            subItemsHeading: { key: 'url', valueType: 'url' },
        },
        {
            key: 'networkRequestTime', valueType: 'ms', granularity: 1, label: 'Start',
            subItemsHeading: { key: 'networkRequestTime', valueType: 'ms', granularity: 1 },
        },
        {
            key: 'duration', valueType: 'ms', granularity: 1, label: 'Duration',
            subItemsHeading: { key: 'duration', valueType: 'ms', granularity: 1 },
        },
        {
            key: 'transferSize', valueType: 'bytes', displayUnit: 'kb', granularity: 1, label: 'Transfer',
            subItemsHeading: { key: 'transferSize', valueType: 'bytes', displayUnit: 'kb', granularity: 1 },
        },
        {
            key: 'resourceSize', valueType: 'bytes', displayUnit: 'kb', granularity: 1, label: 'Resource',
            subItemsHeading: { key: 'resourceSize', valueType: 'bytes', displayUnit: 'kb', granularity: 1 },
        },
        {
            key: 'statusCode', valueType: 'text', label: 'Status',
            subItemsHeading: { key: 'statusCode', valueType: 'text' },
        },
        {
            key: 'mimeType', valueType: 'text', label: 'Type',
            subItemsHeading: { key: 'mimeType', valueType: 'text' },
        },
    ];

    // Note: the pre-TypeScript version also passed `{networkStartTimeTs}` here, but
    // `makeTableDetails` has no such option and silently ignored it.
    return Audit.makeTableDetails(headings, items);
}

export default NetworkRequests;

/** The network record behind a row of the `network-requests` table (same URL and start time). */
export function findRecordForRow(records: LH.Artifacts.NetworkRequest[], row: { url: string; networkRequestTime?: number }): LH.Artifacts.NetworkRequest | undefined {
    const earliest = getEarliestRendererStartTime(records);
    const start = row.networkRequestTime ?? 0;
    let best: LH.Artifacts.NetworkRequest | undefined;
    let bestDiff = Infinity;
    for (const record of records) {
        if (UrlUtils.elideDataURI(record.url) !== row.url) continue;
        const diff = Math.abs(record.networkRequestTime - earliest - start);
        if (diff < bestDiff) {
            best = record;
            bestDiff = diff;
        }
    }
    return bestDiff <= 1.5 ? best : undefined;
}

/** Columns added to the slowest / longest request rows: where the request's time went. */
export const TIMING_BREAKDOWN_HEADINGS: LH.Audit.Details.TableColumnHeading[] = [
    { key: 'setupTime', valueType: 'ms', granularity: 1, label: 'Stalled + connect' },
    { key: 'serverTime', valueType: 'ms', granularity: 1, label: 'Server (TTFB)' },
    { key: 'downloadTime', valueType: 'ms', granularity: 1, label: 'Download' },
    { key: 'diagnosis', valueType: 'text', label: 'Where the time went' },
];

/**
 * A `network-requests` row with its timing breakdown (stalled + connection setup, waiting for the
 * server, download — together the row's duration) and a short diagnosis.
 */
export async function withTimingBreakdown<T extends { url: string; networkRequestTime?: number }>(
    artifacts: LH.Artifacts, context: LH.Audit.Context, row: T,
): Promise<T & { setupTime?: number; serverTime?: number; downloadTime?: number; diagnosis: string }> {
    const records = await NetworkRecords.request(artifacts.DevtoolsLog, context);
    const record = findRecordForRow(records, row);
    if (!record) return { ...row, setupTime: undefined, serverTime: undefined, downloadTime: undefined, diagnosis: '' };
    const timing = requestTimingBreakdown(record);
    const rendererQueue = Math.max(record.networkRequestTime - record.rendererStartTime, 0);
    return {
        ...row,
        setupTime: Math.max(timing.queueing - rendererQueue, 0) + timing.dns + timing.connect + timing.ssl,
        serverTime: timing.waiting,
        downloadTime: timing.download,
        diagnosis: timingHint(timing, 0),
    };
}
