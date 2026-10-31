import { Audit } from 'lighthouse/core/audits/audit.js';
import UrlUtils from 'lighthouse/core/lib/url-utils.js';
import { NetworkRecords } from 'lighthouse/core/computed/network-records.js';
import { EntityClassification } from 'lighthouse/core/computed/entity-classification.js';
import { ProcessedTrace } from 'lighthouse/core/computed/processed-trace.js';
import { ProcessedNavigation } from 'lighthouse/core/computed/processed-navigation.js';
import { MainThreadTasks } from 'lighthouse/core/computed/main-thread-tasks.js';
import * as i18n from 'lighthouse/core/lib/i18n/i18n.js';
import type * as LH from 'lighthouse/types/lh.js';
import { buildWaterfallSVG, type TimingMarker, type WaterfallEntityGroup, type WaterfallRequest } from '../../reporting/waterfall.js';
import { svgToDataUri } from '../../reporting/charts/svg.js';
import { fmtBytes } from '../../reporting/charts/format.js';
import { cacheSource, requestTimingBreakdown, timingHint, traceRequestFlags, type RequestTimingBreakdown } from './network-timing.js';

const UIStrings = {
    title: 'Network Waterfall',
    description: 'Every request in start order, split into DevTools timing phases (queueing, DNS, connection, SSL, ' +
                 'waiting for the server = TTFB, download), with render-blocking requests and the LCP resource flagged, ' +
                 'FCP / LCP / DCL / Load markers and the main thread underneath. Long light bars = slow server; long dark ' +
                 'bars = large or slow downloads; red rows delay the first render. Hover a row for all its details (URL, priority, initiator, protocol, ' +
                 'cache, phase timings); "Open full size" opens the chart in a new tab.',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

const SLOWEST_ROWS = 10;

class NetworkWaterfall extends Audit {
    static override get meta(): LH.Audit.Meta {
        return {
            id: 'network-waterfall',
            scoreDisplayMode: Audit.SCORING_MODES.INFORMATIVE,
            title: str_(UIStrings.title),
            description: str_(UIStrings.description),
            requiredArtifacts: ['DevtoolsLog', 'URL', 'GatherContext', 'Trace', 'SourceMaps', 'HostDPR'],
        };
    }

    static override async audit(artifacts: LH.Artifacts, context: LH.Audit.Context): Promise<LH.Audit.Product> {
        const devtoolsLog = artifacts.DevtoolsLog;
        const records = await NetworkRecords.request(devtoolsLog, context);
        if (records.length === 0) {
            return { score: null, notApplicable: true };
        }
        const entities = await EntityClassification.request({ URL: artifacts.URL, devtoolsLog }, context);

        // Time origin shared with the trace (navigation start / start of the timespan), so requests,
        // metric markers and main-thread tasks line up. Falls back to the first request.
        let originMs = records.reduce((min, r) => Math.min(min, r.rendererStartTime), Infinity);
        const markers: TimingMarker[] = [];
        let tasks: Array<{ start: number; duration: number }> | undefined;
        try {
            const processedTrace = await ProcessedTrace.request(artifacts.Trace, context);
            originMs = processedTrace.timestamps.timeOrigin / 1000;
            const mainThreadTasks = await MainThreadTasks.request(artifacts.Trace, context);
            tasks = mainThreadTasks.filter(t => !t.parent).map(t => ({ start: t.startTime, duration: t.duration }));
            try {
                const { timings: t } = await ProcessedNavigation.request(processedTrace, context);
                if (t.firstContentfulPaint)   markers.push({ t: t.firstContentfulPaint,   label: 'FCP',  color: '#1a73e8' });
                if (t.largestContentfulPaint) markers.push({ t: t.largestContentfulPaint, label: 'LCP',  color: '#0cce6b' });
                if (t.domContentLoaded)       markers.push({ t: t.domContentLoaded,       label: 'DCL',  color: '#4a90d9' });
                if (t.load)                   markers.push({ t: t.load,                   label: 'Load', color: '#e86c8d' });
            } catch {
                // Timespan: no navigation metrics.
            }
        } catch {
            // No usable trace: request times stay relative to the first request.
        }
        const flags = await traceRequestFlags(artifacts, context);
        const firstParty = entities.firstParty?.name;

        const rows: Array<{ request: WaterfallRequest; timing: RequestTimingBreakdown; record: LH.Artifacts.NetworkRequest }> = [];
        for (const record of records) {
            const entity = entities.entityByUrl.get(record.url)?.name || 'Unknown';
            const timing = requestTimingBreakdown(record);
            const start = (timing.phases[0]?.start ?? record.rendererStartTime) - originMs;
            rows.push({
                record,
                timing,
                request: {
                    url:          UrlUtils.elideDataURI(record.url),
                    start,
                    duration:     timing.total,
                    transferSize: record.transferSize ?? 0,
                    resourceSize: record.resourceSize ?? 0,
                    statusCode:   record.statusCode,
                    mimeType:     record.mimeType || '',
                    entity,
                    phases:       timing.phases.map(p => ({ name: p.name, start: p.start - originMs, end: p.end - originMs })),
                    resourceType: record.resourceType,
                    priority:     record.priority,
                    renderBlocking: flags.renderBlocking.has(record.requestId),
                    lcp:          flags.lcpRequestId !== undefined && record.requestId === flags.lcpRequestId,
                    party:        firstParty !== undefined && entity === firstParty ? 'first' : 'third',
                    cache:        cacheSource(record),
                    protocol:     record.protocol || undefined,
                    initiator:    record.initiator?.type,
                    failed:       record.failed || undefined,
                    failReason:   record.failed ? record.localizedFailDescription || undefined : undefined,
                },
            });
        }

        // Entity groups (by first request) for the "by entity" summary.
        const byEntity = new Map<string, WaterfallRequest[]>();
        for (const { request } of rows) byEntity.set(request.entity, [...(byEntity.get(request.entity) ?? []), request]);
        const requests: WaterfallRequest[] = [];
        const entityGroups: WaterfallEntityGroup[] = [];
        for (const [name, reqs] of [...byEntity.entries()].sort((a, b) => Math.min(...a[1].map(r => r.start)) - Math.min(...b[1].map(r => r.start)))) {
            reqs.sort((a, b) => a.start - b.start);
            entityGroups.push({
                name,
                startIndex: requests.length,
                count: reqs.length,
                totalDuration: reqs.reduce((s, r) => s + r.duration, 0),
                totalTransfer: reqs.reduce((s, r) => s + r.transferSize, 0),
            });
            requests.push(...reqs);
        }

        const isNavigation = artifacts.GatherContext.gatherMode === 'navigation';
        const svg = buildWaterfallSVG(requests, entityGroups, markers, 'Network Waterfall', {
            tasks,
            subtitle: `${requests.length} requests · ${fmtBytes(requests.reduce((s, r) => s + r.transferSize, 0))} transferred · ` +
                `times from ${isNavigation ? 'navigation start' : 'the start of the step'}`,
        });

        const slowest = rows
            .filter(({ record }) => !record.url.startsWith('data:'))
            .sort((a, b) => b.timing.total - a.timing.total)
            .slice(0, SLOWEST_ROWS)
            .map(({ request, timing }) => ({
                url: request.url,
                // `site`, not `entity`: Lighthouse's renderer regroups tables with an `entity` key by entity.
                site: `${request.entity}${request.party === 'first' ? ' (1st party)' : ''}`,
                startTime: Math.max(request.start, 0),
                queueing: timing.queueing,
                connection: timing.dns + timing.connect + timing.ssl,
                waiting: timing.waiting,
                download: timing.download,
                total: timing.total,
                transferSize: request.transferSize,
                notes: [
                    request.renderBlocking ? 'render-blocking' : '',
                    request.lcp ? 'LCP resource' : '',
                    request.cache ? `from ${request.cache}` : '',
                    request.failed ? `failed: ${request.failReason || 'network error'}`
                        : typeof request.statusCode === 'number' && request.statusCode >= 400 ? `HTTP ${request.statusCode}` : '',
                    timingHint(timing),
                ].filter(Boolean).join(' · '),
            }));

        return {
            score: 1,
            details: Audit.makeListDetails([
                Audit.makeListDetailSectionItem(
                    Audit.makeTableDetails([{ key: 'chart', valueType: 'thumbnail', label: '' }], [{ chart: svgToDataUri(svg) }]),
                    'Request waterfall',
                ),
                Audit.makeListDetailSectionItem(Audit.makeTableDetails([
                    { key: 'url', valueType: 'url', label: 'URL' },
                    { key: 'site', valueType: 'text', label: 'Entity' },
                    { key: 'startTime', valueType: 'ms', granularity: 1, label: 'Start' },
                    { key: 'total', valueType: 'ms', granularity: 1, label: 'Total' },
                    { key: 'waiting', valueType: 'ms', granularity: 1, label: 'Server (TTFB)' },
                    { key: 'download', valueType: 'ms', granularity: 1, label: 'Download' },
                    { key: 'queueing', valueType: 'ms', granularity: 1, label: 'Queued' },
                    { key: 'connection', valueType: 'ms', granularity: 1, label: 'Connect' },
                    { key: 'transferSize', valueType: 'bytes', displayUnit: 'kb', granularity: 0.1, label: 'Transfer' },
                    { key: 'notes', valueType: 'text', label: 'Notes' },
                ], slowest), `Slowest ${slowest.length} requests — where the time went`),
            ]),
        };
    }
}

export default NetworkWaterfall;
