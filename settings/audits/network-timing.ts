/**
 * Per-request timing breakdown (DevTools "Timing" tab phases) and trace-engine request flags
 * (render-blocking, LCP resource), shared by the network audits and the waterfall.
 */
import { TraceEngineResult } from 'lighthouse/core/computed/trace-engine-result.js';
import { ProcessedTrace } from 'lighthouse/core/computed/processed-trace.js';
import type * as LH from 'lighthouse/types/lh.js';

/** Request phases, in DevTools order. */
export type RequestPhaseName = 'queue' | 'dns' | 'connect' | 'ssl' | 'send' | 'wait' | 'download';

/** A phase of a request; times are absolute (same clock as the network record), in ms. */
export interface RequestPhase {
    name: RequestPhaseName;
    start: number;
    end: number;
}

export interface RequestTimingBreakdown {
    phases: RequestPhase[];
    /** Queued in the renderer + stalled in the network stack before the connection / request was made. */
    queueing: number;
    dns: number;
    /** TCP connection, excluding TLS. */
    connect: number;
    ssl: number;
    /** Request sent → first response byte ("Waiting for server response", TTFB). */
    waiting: number;
    download: number;
    /** Renderer start → end of the response. */
    total: number;
}

export const PHASE_LABEL: Record<RequestPhaseName, string> = {
    queue: 'Queueing / stalled',
    dns: 'DNS lookup',
    connect: 'Initial connection',
    ssl: 'SSL / TLS',
    send: 'Request sent',
    wait: 'Waiting for server response (TTFB)',
    download: 'Content download',
};

type TimingRecord = Pick<LH.Artifacts.NetworkRequest,
    'rendererStartTime' | 'networkRequestTime' | 'responseHeadersEndTime' | 'networkEndTime' | 'timing'>;

/**
 * Splits a request into DevTools-style phases using its Chrome `ResourceTiming`. Requests without
 * timing data (memory cache, failed early) get a waiting + download split from Lighthouse's own times.
 */
export function requestTimingBreakdown(record: TimingRecord): RequestTimingBreakdown {
    const rendererStart = finiteOr(record.rendererStartTime, record.networkRequestTime);
    const end = Math.max(finiteOr(record.networkEndTime, rendererStart), rendererStart);
    const phases: RequestPhase[] = [];
    let cursor = rendererStart;
    // Phases are contiguous: a phase starts where the previous one ended (small gaps, e.g. between
    // connection end and request start, are counted in the next phase), so they add up to the total.
    const push = (name: RequestPhaseName, from: number | undefined, to: number | undefined) => {
        if (from === undefined || to === undefined) return;
        const s = Math.min(cursor, end);
        const e = Math.min(Math.max(to, s), end);
        if (e - s > 0) {
            const last = phases[phases.length - 1];
            if (last && last.name === name && Math.abs(last.end - s) < 1e-6) last.end = e;
            else phases.push({ name, start: s, end: e });
        }
        cursor = Math.max(cursor, e);
    };

    const timing = record.timing;
    const headersEnd = Math.min(Math.max(finiteOr(record.responseHeadersEndTime, end), rendererStart), end);
    if (timing && timing.requestTime > 0 && timing.receiveHeadersEnd >= 0) {
        const base = timing.requestTime * 1000;
        const at = (v: number | undefined) => (typeof v === 'number' && v >= 0 ? base + v : undefined);
        const dnsStart = at(timing.dnsStart), dnsEnd = at(timing.dnsEnd);
        const connectStart = at(timing.connectStart), connectEnd = at(timing.connectEnd);
        const sslStart = at(timing.sslStart), sslEnd = at(timing.sslEnd);
        const sendStart = at(timing.sendStart), sendEnd = at(timing.sendEnd);
        const firstByte = at((timing as { receiveHeadersStart?: number }).receiveHeadersStart) ?? at(timing.receiveHeadersEnd);
        const firstStep = [dnsStart, connectStart, sendStart].find(t => t !== undefined) ?? base;
        push('queue', rendererStart, firstStep);
        push('dns', dnsStart, dnsEnd);
        push('connect', connectStart, sslStart ?? connectEnd);
        push('ssl', sslStart, sslEnd);
        push('send', sendStart, sendEnd);
        push('wait', sendEnd ?? cursor, firstByte !== undefined ? Math.max(firstByte, headersEnd) : headersEnd);
        push('download', cursor, end);
    } else {
        push('queue', rendererStart, Math.min(finiteOr(record.networkRequestTime, rendererStart), headersEnd));
        push('wait', cursor, headersEnd);
        push('download', cursor, end);
    }

    const sum = (...names: RequestPhaseName[]) => phases.filter(p => names.includes(p.name)).reduce((s, p) => s + p.end - p.start, 0);
    return {
        phases,
        queueing: sum('queue'),
        dns: sum('dns'),
        connect: sum('connect'),
        ssl: sum('ssl'),
        waiting: sum('send', 'wait'),
        download: sum('download'),
        total: end - rendererStart,
    };
}

function finiteOr(value: number | undefined, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
}

/** DevTools names of Chrome's resource priorities. */
export const PRIORITY_LABEL: Record<string, string> = {
    VeryHigh: 'Highest', High: 'High', Medium: 'Medium', Low: 'Low', VeryLow: 'Lowest',
};

/** Where a response came from when it didn't come over the network. */
export function cacheSource(record: Pick<LH.Artifacts.NetworkRequest, 'fromMemoryCache' | 'fromDiskCache' | 'fromPrefetchCache' | 'fetchedViaServiceWorker'>): string | undefined {
    if (record.fromMemoryCache) return 'memory cache';
    if (record.fromDiskCache) return 'disk cache';
    if (record.fromPrefetchCache) return 'prefetch cache';
    if (record.fetchedViaServiceWorker) return 'service worker';
    return undefined;
}

export interface TraceRequestFlags {
    /** Request ids of the render-blocking requests (DevTools' "Render-blocking requests" insight). */
    renderBlocking: Set<string>;
    /** Request id of the LCP resource (e.g. the LCP image). */
    lcpRequestId?: string;
}

interface TraceEngineRequest {
    args: { data: { requestId: string; renderBlocking?: string } };
}

interface InsightSetLike {
    navigation?: unknown;
    model?: {
        RenderBlocking?: { renderBlockingRequests?: TraceEngineRequest[] };
        LCPBreakdown?: { lcpRequest?: TraceEngineRequest };
        LCPDiscovery?: { lcpRequest?: TraceEngineRequest };
    };
}

/**
 * Render-blocking and LCP requests as the DevTools Performance panel sees them (Lighthouse's
 * shared trace engine, already computed for the insight audits). Empty when unavailable.
 */
export async function traceRequestFlags(artifacts: Pick<LH.Artifacts, 'Trace' | 'SourceMaps' | 'HostDPR'>, context: LH.Audit.Context): Promise<TraceRequestFlags> {
    const flags: TraceRequestFlags = { renderBlocking: new Set() };
    try {
        const { Trace: trace, SourceMaps, HostDPR } = artifacts;
        const result = await TraceEngineResult.request({ trace, settings: context.settings, SourceMaps, HostDPR }, context);
        const processedTrace = await ProcessedTrace.request(trace, context);
        const insightSets = [...(result.insights as unknown as Map<string, InsightSetLike>).values()];
        const isNavigation = Boolean((processedTrace.timeOriginEvt.args as { data?: { navigationId?: string } }).data?.navigationId);
        const insights = isNavigation ? insightSets.find(set => set.navigation) : undefined;
        const blocking = insights?.model?.RenderBlocking?.renderBlockingRequests;
        if (blocking) {
            for (const request of blocking) flags.renderBlocking.add(request.args.data.requestId);
        } else if (isNavigation) {
            const requests = (result.data as unknown as { NetworkRequests: { byTime: TraceEngineRequest[] } }).NetworkRequests.byTime;
            for (const request of requests) if (request.args.data.renderBlocking === 'blocking') flags.renderBlocking.add(request.args.data.requestId);
        }
        flags.lcpRequestId = (insights?.model?.LCPBreakdown?.lcpRequest ?? insights?.model?.LCPDiscovery?.lcpRequest)?.args.data.requestId;
    } catch {
        // No trace engine result (e.g. a broken trace): requests are simply not flagged.
    }
    return flags;
}

/** What dominates a slow request's time, as a short hint for developers ('' when nothing stands out). */
export function timingHint(t: RequestTimingBreakdown, minTotalMs = 100): string {
    if (t.total < minTotalMs) return '';
    const parts: Array<[number, string]> = [
        [t.waiting, 'mostly server time (TTFB): check the backend, caching or CDN'],
        [t.download, 'mostly download: reduce the size, compress, or check bandwidth'],
        [t.queueing, 'mostly queued: too many parallel requests, or low priority'],
        [t.dns + t.connect + t.ssl, 'mostly connection setup: preconnect to or reuse the origin'],
    ];
    const [ms, text] = parts.sort((a, b) => b[0] - a[0])[0];
    return ms >= t.total * 0.5 ? text : '';
}
