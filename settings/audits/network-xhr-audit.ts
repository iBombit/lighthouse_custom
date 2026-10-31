import { Audit } from 'lighthouse/core/audits/audit.js';
import UrlUtils from 'lighthouse/core/lib/url-utils.js';
import { NetworkRecords } from 'lighthouse/core/computed/network-records.js';
import { EntityClassification } from 'lighthouse/core/computed/entity-classification.js';
import * as i18n from 'lighthouse/core/lib/i18n/i18n.js';
import type * as LH from 'lighthouse/types/lh.js';
import { getEarliestRendererStartTime, getMainFrameId } from './network-requests.js';
import { isXHRRequest, type ClassifiableRequest } from '../network-filters.js';
import type { CapturedRequestBody, NetworkRequestBodiesArtifact } from '../custom-artifacts.js';
import { requestTimingBreakdown } from './network-timing.js';

const UIStrings = {
    title: 'XHR requests are fast',
    failureTitle: 'XHR Network Requests took too long',
    description: 'API calls (XHR / fetch) of the step, slowest first, with the request body of POST/PUT calls. ' +
        'Score: sum of the API call durations, good ≤ 0.5 s, 2 s scores 0.5. "Server (TTFB)" is the time the backend ' +
        'took to start answering: when it dominates, hand the call (method, URL, body) to the backend team; long ' +
        '"Download" means a large response — paginate or trim fields. Calls that run one after another instead of in ' +
        'parallel show up in the waterfall.',
    columnCategory: 'Category',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

/** An XHR record with times (ms) relative to the earliest renderer start, plus its captured request body. */
interface NormalizedXHRRecord {
    url: string;
    rendererStartTime: number | undefined;
    networkRequestTime: number | undefined;
    networkEndTime: number | undefined;
    duration: number;
    transferSize: number;
    resourceSize: number;
    statusCode: number;
    mimeType: string;
    requestMethod: string;
    resourceType: LH.Artifacts.NetworkRequest['resourceType'];
    isLinkPreload: true | undefined;
    experimentalFromMainFrame: true | undefined;
    entity: string | undefined;
    requestBody: string | null;
    hasRequestBody: boolean;
    /** Waiting for the server (TTFB) and download time, from Chrome's resource timing. */
    serverTime: number;
    downloadTime: number;
}

interface XHRSummary {
    totalXHRRequests: number;
    totalTransferSize: number;
    totalDuration: number;
    maxExecutionTime: number;
}

class NetworkXHRAudit extends Audit {
    static override get meta(): LH.Audit.Meta {
        return {
            id: 'network-xhr-audit',
            scoreDisplayMode: Audit.SCORING_MODES.NUMERIC,
            title: str_(UIStrings.title),
            failureTitle: str_(UIStrings.failureTitle),
            description: str_(UIStrings.description),
            requiredArtifacts: ['DevtoolsLog', 'URL', 'GatherContext', 'NetworkRequestBodies'],
        };
    }

    static override get defaultOptions(): LH.Audit.ScoreOptions {
        return {
            // Scoring thresholds for total XHR duration - match CSV thresholds
            // Good: <= 500ms total, Poor: >= 2000ms
            p10: 500,
            median: 2000,
        };
    }

    /** Whether a network record is an XHR/Fetch API call (see {@link isXHRRequest}). */
    static isXHRRequest(record: ClassifiableRequest): boolean {
        return isXHRRequest(record);
    }

    static override async audit(artifacts: LH.Artifacts, context: LH.Audit.Context): Promise<LH.Audit.Product> {
        const devtoolsLog = artifacts.DevtoolsLog;
        const records = await NetworkRecords.request(devtoolsLog, context);
        const classifiedEntities = await EntityClassification.request({ URL: artifacts.URL, devtoolsLog }, context);
        const mainFrameId = await getMainFrameId(artifacts, context);
        const networkRequestBodies: Pick<NetworkRequestBodiesArtifact, 'requestBodies'> = artifacts.NetworkRequestBodies || { requestBodies: {} };

        // Filter only XHR requests
        const xhrRecords = records.filter(record => NetworkXHRAudit.isXHRRequest(record));

        const earliestRendererStartTime = getEarliestRendererStartTime(records);

        const availableRequestBodies = { ...networkRequestBodies.requestBodies };

        const normalizedRecords = xhrRecords.map(record => normalizeRecord(record, classifiedEntities, earliestRendererStartTime, mainFrameId, availableRequestBodies));

        const maxExecutionTime = getMaxExecutionTime(normalizedRecords);
        const totalDuration = getTotalDuration(normalizedRecords);
        const totalTransferSize = getTotalTransferSize(normalizedRecords);

        const score = calculateScore(context, totalDuration);

        return {
            score,
            numericValue: totalDuration,
            numericUnit: 'millisecond',
            displayValue: str_(i18n.UIStrings.seconds, { timeInMs: totalDuration }),
            details: createTableDetails(normalizedRecords, {
                totalXHRRequests: normalizedRecords.length,
                totalTransferSize: totalTransferSize,
                totalDuration: totalDuration,
                maxExecutionTime: maxExecutionTime
            }),
        };
    }
}

function normalizeRecord(
    record: LH.Artifacts.NetworkRequest,
    classifiedEntities: LH.Artifacts.EntityClassification,
    earliestRendererStartTime: number,
    mainFrameId: string | undefined,
    availableRequestBodies: Record<string, CapturedRequestBody>,
): NormalizedXHRRecord {
    const entity = classifiedEntities.entityByUrl.get(record.url);
    const normalizedTime = (time: number) => time < earliestRendererStartTime || !Number.isFinite(time) ? undefined : (time - earliestRendererStartTime);
    // NaN when either time is unavailable, exactly as before.
    const duration = normalizedTime(record.networkEndTime)! - normalizedTime(record.networkRequestTime)!;
    const timing = requestTimingBreakdown(record);

    // Find matching request body data by URL and timing
    let requestBodyData: CapturedRequestBody | null = null;

    // match by request ID first
    for (const [requestId, bodyData] of Object.entries(availableRequestBodies)) {
        if (bodyData.url === record.url && bodyData.requestId === record.requestId) {
            requestBodyData = bodyData;
            delete availableRequestBodies[requestId];
            break;
        }
    }

    // If no exact ID match, fall back to timing-based matching with content validation
    if (!requestBodyData) {
        let bestMatch: CapturedRequestBody | null = null;
        let bestTimeDiff = Infinity;
        let bestMatchKey: string | null = null;

        for (const [requestId, bodyData] of Object.entries(availableRequestBodies)) {
            if (bodyData.url === record.url) {
                // Match by URL and precise timing
                const recordTime = record.networkRequestTime;
                const bodyTime = bodyData.timestamp * 1000; // Convert to milliseconds
                const timeDiff = Math.abs(recordTime - bodyTime);

                // Accept matches within 100ms, but prefer the closest timing match
                if (timeDiff < 100 && timeDiff < bestTimeDiff) {
                    bestMatch = bodyData;
                    bestTimeDiff = timeDiff;
                    bestMatchKey = requestId;
                }
            }
        }

        // Use the best timing match
        if (bestMatch && bestMatchKey) {
            requestBodyData = bestMatch;
            delete availableRequestBodies[bestMatchKey];
        }
    }

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
        requestMethod: record.requestMethod || 'GET',
        resourceType: record.resourceType,
        isLinkPreload: record.isLinkPreload || undefined,
        experimentalFromMainFrame: mainFrameId ? ((record.frameId === mainFrameId) || undefined) : undefined,
        entity: entity?.name,
        requestBody: requestBodyData?.formattedPostData || null,
        hasRequestBody: !!(requestBodyData?.hasPostData || requestBodyData?.postData),
        serverTime: Math.round(timing.waiting),
        downloadTime: Math.round(timing.download),
    };
}

function getMaxExecutionTime(records: NormalizedXHRRecord[]): number {
    return Math.max(...records.map(record => record.networkEndTime || 0));
}

function getTotalDuration(records: NormalizedXHRRecord[]): number {
    return records.reduce((sum, record) => sum + (record.duration || 0), 0);
}

function getTotalTransferSize(records: NormalizedXHRRecord[]): number {
    return records.reduce((sum, record) => sum + (record.transferSize || 0), 0);
}

function calculateScore(context: LH.Audit.Context, time: number): number {
    return Audit.computeLogNormalScore({
        p10: context.options.p10,
        median: context.options.median,
    }, time);
}

// The summary is not rendered: `makeTableDetails` only reads `wastedMs`/`wastedBytes` at the
// top level of its options, so the former `{summary: {wastedMs}}` option was ignored.
function createTableDetails(records: NormalizedXHRRecord[], _summary: XHRSummary): LH.Audit.Details.Table {
    const headings: LH.Audit.Details.TableColumnHeading[] = [
        { key: 'url', valueType: 'url', label: 'URL', subItemsHeading: { key: 'requestBody', valueType: 'code' } },
        { key: 'requestMethod', valueType: 'text', label: 'Method' },
        { key: 'networkRequestTime', valueType: 'ms', granularity: 1, label: 'Start' },
        { key: 'duration', valueType: 'ms', granularity: 1, label: 'Duration' },
        { key: 'serverTime', valueType: 'ms', granularity: 1, label: 'Server (TTFB)' },
        { key: 'downloadTime', valueType: 'ms', granularity: 1, label: 'Download' },
        { key: 'transferSize', valueType: 'bytes', displayUnit: 'kb', granularity: 1, label: 'Transfer' },
        { key: 'statusCode', valueType: 'text', label: 'Status' },
        { key: 'mimeType', valueType: 'text', label: 'Type' },
    ];

    const items = records.map(record => {
        const body = record.requestBody || (record.hasRequestBody ? '[Binary Data]' : '');
        const item: Omit<NormalizedXHRRecord, 'networkRequestTime' | 'networkEndTime' | 'duration'> & {
            networkRequestTime: number | undefined;
            networkEndTime: number | undefined;
            duration: number | undefined;
            subItems?: LH.Audit.Details.TableSubItems;
        } = {
            ...record,
            networkRequestTime: record.networkRequestTime ? Math.round(record.networkRequestTime) : undefined,
            networkEndTime: record.networkEndTime ? Math.round(record.networkEndTime) : undefined,
            duration: record.duration ? Math.round(record.duration) : undefined,
        };
        if (body) {
            item.subItems = { type: 'subitems', items: [{ requestBody: body }] };
        }
        return item;
    });

    // Sort by duration (longest first)
    items.sort((a, b) => (b.duration || 0) - (a.duration || 0));

    // Items keep the full normalized record (incl. `requestBody: null` and `hasRequestBody`) in the
    // report JSON, as before; those extra fields aren't Lighthouse table value types, hence the cast.
    return Audit.makeTableDetails(headings, items as unknown as LH.Audit.Details.TableItem[]);
}

export default NetworkXHRAudit;
