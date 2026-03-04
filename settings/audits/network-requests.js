import { Audit } from 'lighthouse/core/audits/audit.js';
import UrlUtils from 'lighthouse/core/lib/url-utils.js';
import { NetworkRecords } from 'lighthouse/core/computed/network-records.js';
import { MainResource } from 'lighthouse/core/computed/main-resource.js';
import { EntityClassification } from 'lighthouse/core/computed/entity-classification.js';
import * as i18n from 'lighthouse/core/lib/i18n/i18n.js';

const UIStrings = {
    title: 'Network Requests',
    failureTitle: 'Network Requests',
    description: 'Lists the network requests that were made during page load.',
    columnCategory: 'Category',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

// ── Audit ──────────────────────────────────────────────────────────────
class NetworkRequests extends Audit {
    static get meta() {
        return {
            id: 'network-requests',
            scoreDisplayMode: Audit.SCORING_MODES.NUMERIC,
            title: str_(UIStrings.title),
            description: str_(UIStrings.description),
            requiredArtifacts: ['DevtoolsLog', 'URL', 'GatherContext'],
        };
    }

    static get defaultOptions() {
        return {
            p10: 2017,
            median: 4000,
        };
    }

    static async audit(artifacts, context) {
        const devtoolsLog = artifacts.DevtoolsLog;
        const records = await NetworkRecords.request(devtoolsLog, context);
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
            displayValue: str_(i18n.UIStrings.seconds, { timeInMs: maxExecutionTime }),
            details: createTableDetails(normalizedRecords, earliestRendererStartTime),
        };
    }
}

async function getMainFrameId(artifacts, context) {
    if (artifacts.GatherContext.gatherMode === 'navigation') {
        const mainResource = await MainResource.request({ devtoolsLog: artifacts.DevtoolsLog, URL: artifacts.URL }, context);
        return mainResource.frameId;
    }
    return undefined;
}

function getEarliestRendererStartTime(records) {
    return records.reduce((min, record) => Math.min(min, record.rendererStartTime), Infinity);
}

function normalizeRecord(record, classifiedEntities, earliestRendererStartTime, mainFrameId) {
    const entity = classifiedEntities.entityByUrl.get(record.url);
    const normalizedTime = time => time < earliestRendererStartTime || !Number.isFinite(time) ? undefined : (time - earliestRendererStartTime);
    const duration = normalizedTime(record.networkEndTime) - normalizedTime(record.networkRequestTime);

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

function getMaxExecutionTime(records) {
    return Math.max(...records.map(record => record.networkEndTime || 0));
}

function calculateScore(context, maxExecutionTime) {
    return Audit.computeLogNormalScore({
        p10: context.options.p10,
        median: context.options.median,
    }, maxExecutionTime);
}

function createTableDetails(records, earliestRendererStartTime) {
    // ── Group by entity ────────────────────────────────────────────────
    const grouped = new Map();
    for (const r of records) {
        const key = r.entity || 'Unknown';
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key).push(r);
    }

    const items = [];
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
    items.sort((a, b) => a.networkRequestTime - b.networkRequestTime);

    // ── Headings ───────────────────────────────────────────────────────
    const headings = [
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

    return Audit.makeTableDetails(headings, items, {
        networkStartTimeTs: Number.isFinite(earliestRendererStartTime) ? earliestRendererStartTime * 1000 : undefined,
    });
}

export default NetworkRequests;