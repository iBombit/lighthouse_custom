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

class NetworkRequests extends Audit {
    static get meta() {
        return {
            id: 'network-requests',
            scoreDisplayMode: Audit.SCORING_MODES.NUMERIC,
            title: str_(UIStrings.title),
            description: str_(UIStrings.description),
            requiredArtifacts: ['devtoolsLogs', 'URL', 'GatherContext'],
        };
    }

    static get defaultOptions() {
        return {
            p10: 2017,
            median: 4000,
        };
    }

    static async audit(artifacts, context) {
        const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
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
        const mainResource = await MainResource.request({ devtoolsLog: artifacts.devtoolsLogs[Audit.DEFAULT_PASS], URL: artifacts.URL }, context);
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
    const headings = [
        { key: 'url', valueType: 'url', label: 'URL' },
        { key: 'networkRequestTime', valueType: 'ms', granularity: 1, label: 'Network Request Time' },
        { key: 'networkEndTime', valueType: 'ms', granularity: 1, label: 'Network End Time' },
        { key: 'duration', valueType: 'ms', granularity: 1, label: 'Duration' },
        { key: 'transferSize', valueType: 'bytes', displayUnit: 'kb', granularity: 1, label: 'Transfer Size' },
        { key: 'resourceSize', valueType: 'bytes', displayUnit: 'kb', granularity: 1, label: 'Resource Size' },
        { key: 'statusCode', valueType: 'text', label: 'Status Code' },
        { key: 'mimeType', valueType: 'text', label: 'MIME Type' },
    ];

    const items = records.map(record => ({
        ...record,
        networkRequestTime: record.networkRequestTime ? Math.round(record.networkRequestTime) : undefined,
        networkEndTime: record.networkEndTime ? Math.round(record.networkEndTime) : undefined,
        duration: record.duration ? Math.round(record.duration) : undefined,
    }));

    return Audit.makeTableDetails(headings, items, {
        networkStartTimeTs: Number.isFinite(earliestRendererStartTime) ? earliestRendererStartTime * 1000 : undefined,
    });
}

export default NetworkRequests;