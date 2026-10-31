import fs from 'fs/promises';
import path from 'path';
import type * as LH from 'lighthouse/types/lh.js';
import logger from '../logger/logger.js';
import { esc, f, fmtBytes, fmtMs, trunc } from './charts/format.js';
import {
    BLOCKING_PATTERN, PARTY_COLOR, assignMarkerTiers, chartHeader, legend, markerLines, svgOpen, timeAxis,
} from './charts/svg.js';

/** Request phases drawn in a waterfall bar (DevTools "Timing" tab order). */
export type WaterfallPhaseName = 'queue' | 'dns' | 'connect' | 'ssl' | 'send' | 'wait' | 'download';

/** One phase of a request, in ms on the chart's time axis. */
export interface WaterfallPhase {
    name: WaterfallPhaseName;
    start: number;
    end: number;
}

/** One network request drawn as a bar (times in ms on the chart's time axis). */
export interface WaterfallRequest {
    url: string;
    start: number;
    duration: number;
    transferSize: number;
    resourceSize: number;
    statusCode?: number | string;
    mimeType: string;
    entity: string;
    /** Timing phases; without them the bar is drawn as a single download-colored block. */
    phases?: WaterfallPhase[];
    /** Lighthouse resource type (Document, Script, Stylesheet, Image, Font, XHR, Fetch, ...). */
    resourceType?: string;
    /** Chrome priority (VeryHigh … VeryLow). */
    priority?: string;
    /** Blocked the first render (DevTools' "Render-blocking requests" insight). */
    renderBlocking?: boolean;
    /** The Largest Contentful Paint resource. */
    lcp?: boolean;
    /** First or third party (falls back to "same entity as the first group"). */
    party?: 'first' | 'third';
    /** Served from memory / disk / prefetch cache or a service worker. */
    cache?: string;
    protocol?: string;
    /** Initiator type: parser, script, preload, other... */
    initiator?: string;
    failed?: boolean;
    /** Chrome's error for a failed request, e.g. `net::ERR_ABORTED` (shown as "canceled", like DevTools). */
    failReason?: string;
}

/** Requests of one entity (company / site), used for the "by entity" summary. */
export interface WaterfallEntityGroup {
    name: string;
    startIndex: number;
    count: number;
    totalDuration: number;
    totalTransfer: number;
}

/** Vertical timing marker (FCP, LCP, DCL, Load, ...). `_tier` is assigned while laying out labels. */
export interface TimingMarker {
    t: number;
    label: string;
    color: string;
    _tier?: number;
}

export interface WaterfallOptions {
    /** Main-thread tasks (ms on the chart's time axis) drawn in a CPU lane under the requests. */
    tasks?: Array<{ start: number; duration: number }>;
    /** Replaces the default subtitle. */
    subtitle?: string;
    /** At most this many requests are drawn (default 250); the rest are summarized. */
    maxRows?: number;
}

/** Fields read from the grouped `network-requests` audit table (group rows carry `subItems`). */
interface NetworkRequestsTableItem {
    url: string;
    entity?: string;
    networkRequestTime?: number;
    duration?: number;
    transferSize?: number;
    resourceSize?: number;
    statusCode?: number | string;
    mimeType?: string;
    subItems?: { items: NetworkRequestsTableItem[] };
}

/** Values read from the `metrics` audit's debug data. */
type MetricsAuditItem = Partial<Record<
    'observedFirstContentfulPaint' | 'observedLargestContentfulPaint' | 'observedDomContentLoaded' | 'observedLoad' |
    'firstContentfulPaint' | 'largestContentfulPaint' | 'interactive',
    number
>>;

const SVG_DATA_URI = 'data:image/svg+xml;base64,';

/**
 * Writes a standalone network-waterfall SVG for every flow step with network requests to
 * `reportsDir`: the `network-waterfall` audit's chart when the step has one, otherwise a chart
 * built from the `network-requests` table.
 *
 * @param flowResult  – Lighthouse `createFlowResult()` output.
 * @param reportsDir  – Destination folder (default ./reports).
 */
export async function generateWaterfalls(flowResult: LH.FlowResult, reportsDir = './reports'): Promise<void> {
    await fs.mkdir(reportsDir, { recursive: true });

    for (let i = 0; i < flowResult.steps.length; i++) {
        const step = flowResult.steps[i];
        const lhr  = step.lhr;
        const stepName = step.name || `Step ${i + 1}`;
        const svg = waterfallFromAudit(lhr) ?? waterfallFromRequestsTable(lhr, stepName);
        if (!svg) continue;

        const safeName = stepName.replace(/[^a-zA-Z0-9_-]/g, '_');
        const filePath = path.join(reportsDir, `waterfall_${safeName}.svg`);
        await fs.writeFile(filePath, svg, 'utf-8');
        logger.debug(`[WATERFALL] ${filePath}`);
    }
}

/** The chart of the `network-waterfall` audit (first thumbnail in its details), if any. */
function waterfallFromAudit(lhr: LH.Result): string | undefined {
    const details = lhr.audits?.['network-waterfall']?.details;
    if (!details) return undefined;
    const match = JSON.stringify(details).match(/"(data:image\/svg\+xml;base64,[A-Za-z0-9+/=]+)"/);
    return match ? Buffer.from(match[1].slice(SVG_DATA_URI.length), 'base64').toString('utf8') : undefined;
}

/** A simpler chart (no timing phases) from the grouped `network-requests` table. */
function waterfallFromRequestsTable(lhr: LH.Result, stepName: string): string | undefined {
    const networkItems = (lhr.audits?.['network-requests']?.details as { items?: NetworkRequestsTableItem[] } | undefined)?.items;
    if (!networkItems?.length) return undefined;

    const requests: WaterfallRequest[]         = [];
    const entityGroups: WaterfallEntityGroup[] = [];
    for (const group of networkItems) {
        const entityName = group.entity || group.url || 'Unknown';
        const subItems   = group.subItems?.items || [group];
        entityGroups.push({
            name: entityName,
            startIndex: requests.length,
            count: subItems.length,
            totalDuration: group.duration ?? 0,
            totalTransfer: group.transferSize ?? 0,
        });
        for (const item of subItems) {
            requests.push({
                url: item.url,
                start: item.networkRequestTime ?? 0,
                duration: item.duration ?? 0,
                transferSize: item.transferSize ?? 0,
                resourceSize: item.resourceSize ?? 0,
                statusCode: item.statusCode,
                mimeType: item.mimeType || '',
                entity: entityName,
            });
        }
    }
    if (requests.length === 0) return undefined;

    // Key timing metrics (observed = real, not throttled), simulated as a fallback.
    const metricsDetails = lhr.audits?.['metrics']?.details as { items?: MetricsAuditItem[] } | undefined;
    const m: MetricsAuditItem = metricsDetails?.items?.[0] || {};
    const timingMarkers: TimingMarker[] = [];
    if (m.observedFirstContentfulPaint)   timingMarkers.push({ t: m.observedFirstContentfulPaint,   label: 'FCP',  color: '#1a73e8' });
    if (m.observedLargestContentfulPaint) timingMarkers.push({ t: m.observedLargestContentfulPaint, label: 'LCP',  color: '#0cce6b' });
    if (m.observedDomContentLoaded)       timingMarkers.push({ t: m.observedDomContentLoaded,       label: 'DCL',  color: '#4a90d9' });
    if (m.observedLoad)                   timingMarkers.push({ t: m.observedLoad,                   label: 'Load', color: '#e86c8d' });
    if (!timingMarkers.length) {
        if (m.firstContentfulPaint)   timingMarkers.push({ t: m.firstContentfulPaint,   label: 'FCP', color: '#1a73e8' });
        if (m.largestContentfulPaint) timingMarkers.push({ t: m.largestContentfulPaint, label: 'LCP', color: '#0cce6b' });
        if (m.interactive)            timingMarkers.push({ t: m.interactive,            label: 'TTI', color: '#f5a623' });
    }
    return buildWaterfallSVG(requests, entityGroups, timingMarkers, stepName);
}

// ═══════════════════════════════════════════════════════════════════════
//  SVG builder  (exported for use by the network-waterfall audit)
// ═══════════════════════════════════════════════════════════════════════

/** Resource categories with a "download" color and a lighter "waiting (TTFB)" tint. */
const TYPE_STYLE = {
    html:   { label: 'HTML',      color: '#7b61ff', light: '#cdc3ff' },
    css:    { label: 'CSS',       color: '#4a90d9', light: '#b9d4f2' },
    js:     { label: 'JS',        color: '#f5a623', light: '#fbd99c' },
    image:  { label: 'Image',     color: '#2bb3a3', light: '#a9e2db' },
    font:   { label: 'Font',      color: '#e86c8d', light: '#f6c3d0' },
    api:    { label: 'XHR/Fetch', color: '#34a853', light: '#b4dfc0' },
    media:  { label: 'Media',     color: '#8d6e63', light: '#d7c6c0' },
    other:  { label: 'Other',     color: '#9aa0a6', light: '#dadce0' },
} as const;
type TypeKey = keyof typeof TYPE_STYLE;

/** Connection-setup phases (same color whatever the resource type, as in WebPageTest). */
const PHASE_COLOR = { dns: '#1b9aaa', connect: '#f28e2b', ssl: '#a35bd6' } as const;
const RENDER_BLOCKING_COLOR = '#d93025';
const LCP_COLOR = '#0b8043';

function typeOf(req: Pick<WaterfallRequest, 'resourceType' | 'mimeType'>): TypeKey {
    switch (req.resourceType) {
        case 'Document': return 'html';
        case 'Stylesheet': return 'css';
        case 'Script': return 'js';
        case 'Image': return 'image';
        case 'Font': return 'font';
        case 'XHR': case 'Fetch': case 'EventSource': case 'WebSocket': return 'api';
        case 'Media': return 'media';
        default: break;
    }
    const mime = req.mimeType || '';
    if (mime.includes('html'))       return 'html';
    if (mime.includes('css'))        return 'css';
    if (mime.includes('javascript')) return 'js';
    if (mime.includes('json'))       return 'api';
    if (mime.includes('image'))      return 'image';
    if (mime.includes('font'))       return 'font';
    if (mime.startsWith('video') || mime.startsWith('audio')) return 'media';
    return 'other';
}

/** `file.js` and `host` of a URL (the whole string for non-URLs). */
function splitUrl(url: string): { file: string; host: string } {
    try {
        const u = new URL(url);
        if (u.protocol === 'data:') return { file: trunc(url, 40), host: '' };
        const parts = u.pathname.split('/').filter(Boolean);
        let file = parts.length ? parts[parts.length - 1] : '/';
        try { file = decodeURIComponent(file); } catch { /* keep encoded */ }
        if (u.search) file += u.search.length > 18 ? '?…' : u.search;
        return { file, host: u.hostname };
    } catch {
        return { file: url, host: '' };
    }
}

const PRIORITY_LABEL: Record<string, string> = { VeryHigh: 'Highest', High: 'High', Medium: 'Medium', Low: 'Low', VeryLow: 'Lowest' };
const PHASE_LABEL: Record<WaterfallPhaseName, string> = {
    queue: 'Queueing / stalled', dns: 'DNS', connect: 'Connect', ssl: 'SSL', send: 'Request sent', wait: 'Waiting (TTFB)', download: 'Download',
};

const W        = 1260;
const PAD      = 20;
const LABEL_W  = 440;
const TL_X     = PAD + LABEL_W;
const TL_W     = W - TL_X - PAD;
const ROW_H    = 18;
const BAR_H    = 10;
const TIER_H   = 14;
const LANE_H   = 16;
const CHAR_W   = 5.7;   // approximate width of a 10px label character
const LONG_TASK_MS = 50;

/**
 * Renders the network waterfall as an SVG string: requests in start order with their timing
 * phases (queueing, DNS, connect, SSL, waiting for the server, download), render-blocking and LCP
 * requests flagged, metric markers, an optional main-thread lane and a per-entity summary.
 * Note: sorts `timingMarkers` in place and sets their `_tier`.
 */
export function buildWaterfallSVG(requests: WaterfallRequest[], entityGroups: WaterfallEntityGroup[], timingMarkers: TimingMarker[], stepName: string, options: WaterfallOptions = {}): string {
    const firstEntity = entityGroups[0]?.name ?? requests[0]?.entity;
    const partyOf = (r: WaterfallRequest): 'first' | 'third' => r.party ?? (r.entity === firstEntity ? 'first' : 'third');
    const ordered = requests.map((r, i) => ({ r, i })).sort((a, b) => a.r.start - b.r.start || a.i - b.i).map(x => x.r);
    const maxRows = Math.max(options.maxRows ?? 250, 1);
    const shown = ordered.slice(0, maxRows);
    const hidden = ordered.length - shown.length;

    // Time axis: the last request end, extended to markers that aren't absurdly far away.
    const lastEnd = Math.max(...requests.map(r => Math.max(r.start, 0) + Math.max(r.duration, 0)), 1);
    const markerEnd = Math.max(0, ...timingMarkers.filter(m => m.t <= lastEnd * 2).map(m => m.t));
    const endMs = Math.max(lastEnd, markerEnd) * 1.02;
    const px = TL_W / endMs;

    // Markers: sorted, staggered, beyond-the-axis ones dropped (old behavior kept for `_tier`).
    timingMarkers.sort((a, b) => a.t - b.t);
    const markers = timingMarkers.filter(m => m.t >= 0 && m.t <= endMs).map(m => ({ t: m.t, label: m.label, color: m.color, tier: 0 }));
    const maxTier = markers.length ? assignMarkerTiers(markers, px) : 0;
    for (const mk of timingMarkers) mk._tier = markers.find(m => m.t === mk.t && m.label === mk.label)?.tier ?? 0;

    // Summary numbers.
    const totalTransfer = requests.reduce((s, r) => s + (r.transferSize || 0), 0);
    const renderBlocking = requests.filter(r => r.renderBlocking);
    const lcpRequest = requests.find(r => r.lcp);
    const thirdPartyBytes = requests.filter(r => partyOf(r) === 'third').reduce((s, r) => s + (r.transferSize || 0), 0);
    const failed = requests.filter(r => r.failed || (typeof r.statusCode === 'number' && r.statusCode >= 400));
    const subtitle = options.subtitle ?? `${requests.length} requests · ${fmtBytes(totalTransfer)} transferred · last response at ${fmtMs(lastEnd)}`;
    const facts = [
        renderBlocking.length ? `${renderBlocking.length} render-blocking` : '',
        lcpRequest ? `LCP resource: ${splitUrl(lcpRequest.url).file}` : '',
        totalTransfer > 0 ? `3rd party: ${Math.round((thirdPartyBytes / totalTransfer) * 100)}% of bytes` : '',
        failed.length ? `${failed.length} failed or canceled` : '',
    ].filter(Boolean).join(' · ');

    // Vertical layout.
    const markerTop = 80;
    const axisLabelY = markerTop + (markers.length ? (maxTier + 1) * TIER_H : 0) + 6;
    const rowsTop = axisLabelY + 8;
    const rowsBottom = rowsTop + shown.length * ROW_H + (hidden ? ROW_H : 0);
    const tasks = (options.tasks ?? []).filter(t => t.duration > 0 && t.start <= endMs && t.start + t.duration >= 0);
    const hasLane = options.tasks !== undefined;
    const laneTop = rowsBottom + 8;
    const laneBottom = hasLane ? laneTop + LANE_H : rowsBottom;
    const bottomAxisY = laneBottom + 14;
    const entities = entitySummary(requests, partyOf);
    const entityTitleY = bottomAxisY + 30;
    const entityTop = entityTitleY + 8;
    const ENTITY_ROW_H = 16;
    const entityBottom = entities.length ? entityTop + entities.length * ENTITY_ROW_H : entityTitleY - 22;
    const legendY = entityBottom + 18;
    const H = legendY + 2 * 18 + 8;

    const styles = `<style>.file{font-size:10.5px;fill:#202124}.file-1p{font-size:10.5px;fill:#202124;font-weight:600}` +
        `.host{fill:#80868b;font-weight:400}.idx{font-size:9.5px;fill:#9aa0a6}.size{font-size:10px;fill:#5f6368}` +
        `.err{font-size:10px;fill:${RENDER_BLOCKING_COLOR};font-weight:600}.dur{font-size:9.5px;fill:#3c4043}` +
        `.tag-rb{font-size:9.5px;fill:${RENDER_BLOCKING_COLOR};font-weight:600}.tag-lcp{font-size:9.5px;fill:${LCP_COLOR};font-weight:600}` +
        `.tag{font-size:9.5px;fill:#80868b}.row:hover .hit{fill:#1a73e8;fill-opacity:.08}</style>`;
    const out: string[] = [svgOpen(W, H, BLOCKING_PATTERN + styles), chartHeader(PAD, stepName, subtitle)];
    if (facts) out.push(`<text x="${PAD}" y="60" class="lbl">${esc(facts)}</text>`);

    // Column headers above the tick labels (the "0" tick sits right next to the size column).
    out.push(`<text x="${PAD}" y="${axisLabelY - 14}" class="section">Requests (in start order)</text>`);
    out.push(`<text x="${TL_X - 8}" y="${axisLabelY - 14}" text-anchor="end" class="muted">transferred</text>`);

    // Row backgrounds first, so the time grid stays visible on top of them.
    shown.forEach((req, index) => {
        const y = rowsTop + index * ROW_H;
        const fill = req.renderBlocking ? '#fdecea' : req.lcp ? '#e6f4ea' : index % 2 ? '#f8f9fa' : '#fff';
        if (fill !== '#fff') out.push(`<rect x="${PAD}" y="${y}" width="${W - 2 * PAD}" height="${ROW_H}" fill="${fill}"/>`);
        if (req.renderBlocking || req.lcp) {
            out.push(`<rect x="${PAD}" y="${y}" width="3" height="${ROW_H}" fill="${req.renderBlocking ? RENDER_BLOCKING_COLOR : LCP_COLOR}"/>`);
        }
    });
    out.push(timeAxis(TL_X, TL_W, endMs, rowsTop, laneBottom, axisLabelY));

    // ── Rows ───────────────────────────────────────────────────────────
    shown.forEach((req, index) => {
        const y = rowsTop + index * ROW_H;
        const type = TYPE_STYLE[typeOf(req)];
        const party = partyOf(req);
        const { file, host } = splitUrl(req.url);
        const start = Math.max(req.start, 0);
        const end = Math.max(start, req.start + Math.max(req.duration, 0));
        const status = req.statusCode === undefined || req.statusCode === '' ? '' : String(req.statusCode);
        const isError = req.failed || (typeof req.statusCode === 'number' && req.statusCode >= 400);

        out.push(`<g class="row"><title>${esc(tooltip(req, index + 1, party))}</title>`);
        out.push(`<rect class="hit" x="${PAD}" y="${y}" width="${W - 2 * PAD}" height="${ROW_H}" fill="transparent"/>`);
        out.push(`<text x="${PAD + 30}" y="${y + 12.5}" text-anchor="end" class="idx">${index + 1}</text>`);
        out.push(`<rect x="${PAD + 36}" y="${y + 5}" width="8" height="8" rx="1.5" fill="${type.color}"/>`);
        const sizeText = isError ? failureLabel(req, status) : fmtBytes(req.transferSize || 0);
        const labelChars = Math.floor((LABEL_W - 52 - (sizeText.length + 2) * CHAR_W) / CHAR_W);
        const fileText = trunc(file, Math.max(labelChars - Math.min(host.length + 1, 26), 14));
        const hostText = host ? ` ${trunc(host, Math.max(labelChars - fileText.length - 1, 0))}` : '';
        out.push(`<text x="${PAD + 50}" y="${y + 12.5}" class="${party === 'first' ? 'file-1p' : 'file'}">${esc(fileText)}<tspan class="host">${esc(hostText)}</tspan></text>`);
        out.push(`<text x="${TL_X - 8}" y="${y + 12.5}" text-anchor="end" class="${isError ? 'err' : 'size'}">${esc(sizeText)}</text>`);

        // Bar: phases (connection setup in fixed colors, waiting = type tint, download = type color).
        const barY = y + (ROW_H - BAR_H) / 2;
        const phases = req.phases?.length ? req.phases : [{ name: 'download' as const, start, end }];
        for (const phase of phases) {
            const ps = Math.max(phase.start, 0), pe = Math.min(phase.end, endMs);
            if (pe <= ps && phases.length > 1) continue;
            const x = TL_X + ps * px;
            const w = Math.max((pe - ps) * px, phases.length === 1 ? 2 : 0.6);
            if (phase.name === 'queue') {
                out.push(`<rect x="${f(x)}" y="${f(barY + BAR_H / 2 - 1)}" width="${f(w)}" height="2" fill="#bdc1c6"/>`);
            } else {
                const fill = phase.name === 'dns' || phase.name === 'connect' || phase.name === 'ssl' ? PHASE_COLOR[phase.name]
                    : phase.name === 'download' ? type.color : type.light;
                out.push(`<rect x="${f(x)}" y="${f(barY)}" width="${f(w)}" height="${BAR_H}" fill="${fill}"/>`);
            }
        }
        if (isError) out.push(`<rect x="${f(TL_X + start * px)}" y="${f(barY)}" width="${f(Math.max((end - start) * px, 2))}" height="${BAR_H}" fill="none" stroke="${RENDER_BLOCKING_COLOR}" stroke-width="1"/>`);

        // Duration + flags after the bar (or before it, near the right edge).
        const tags: Array<[string, string]> = [[fmtMs(req.duration), 'dur']];
        if (req.renderBlocking) tags.push(['render-blocking', 'tag-rb']);
        if (req.lcp) tags.push(['LCP', 'tag-lcp']);
        if (req.cache) tags.push([req.cache, 'tag']);
        const tagText = tags.map(([t]) => t).join('  ');
        const textW = tagText.length * CHAR_W;
        const after = TL_X + end * px + 5;
        const before = TL_X + start * px - 5;
        const placeAfter = after + textW <= W - PAD || before - textW < TL_X;
        let tx = placeAfter ? after : before - textW;
        const spans: string[] = [];
        for (const [text, cls] of tags) {
            spans.push(`<tspan x="${f(tx)}" class="${cls}">${esc(text)}</tspan>`);
            tx += (text.length + 2) * CHAR_W;
        }
        out.push(`<text y="${y + 12.5}">${spans.join('')}</text></g>`);
    });
    if (hidden) {
        out.push(`<text x="${PAD + 50}" y="${rowsTop + shown.length * ROW_H + 12.5}" class="muted">… ${hidden} more request(s) not drawn — see the "Network Requests" table.</text>`);
    }

    // ── Main-thread lane ──────────────────────────────────────────────
    if (hasLane) {
        out.push(`<text x="${PAD}" y="${laneTop + 12}" class="section">Main thread</text>`);
        out.push(`<text x="${TL_X - 8}" y="${laneTop + 12}" text-anchor="end" class="muted">tasks · long tasks hatched</text>`);
        out.push(`<rect x="${TL_X}" y="${laneTop}" width="${TL_W}" height="${LANE_H}" fill="#f1f3f4" rx="2"/>`);
        // Merge tasks closer than a pixel so busy pages don't produce thousands of elements.
        const spans = tasks.map(t => [Math.max(t.start, 0), Math.min(t.start + t.duration, endMs)] as [number, number])
            .filter(([s, e]) => e > s).sort((a, b) => a[0] - b[0]);
        const merged: Array<[number, number]> = [];
        for (const [s, e] of spans) {
            const last = merged[merged.length - 1];
            if (last && s - last[1] < 1 / px) last[1] = Math.max(last[1], e);
            else merged.push([s, e]);
        }
        for (const [s, e] of merged) {
            out.push(`<rect x="${f(TL_X + s * px)}" y="${laneTop + 3}" width="${f(Math.max((e - s) * px, 0.8))}" height="${LANE_H - 6}" fill="#9aa0a6"/>`);
        }
        for (const t of tasks.filter(t => t.duration > LONG_TASK_MS)) {
            const s = Math.max(t.start, 0), e = Math.min(t.start + t.duration, endMs);
            out.push(`<g class="task"><title>${esc(`Long task ${fmtMs(t.duration)} at ${fmtMs(t.start)}`)}</title>` +
                `<rect x="${f(TL_X + s * px)}" y="${laneTop + 2}" width="${f(Math.max((e - s) * px, 1))}" height="${LANE_H - 4}" fill="url(#blocking)"/></g>`);
        }
    }
    out.push(timeAxis(TL_X, TL_W, endMs, laneBottom, laneBottom, bottomAxisY).replace(/<line[^>]*\/>/g, ''));
    out.push(markerLines(markers, TL_X, px, endMs, markerTop, TIER_H, laneBottom));

    // ── By entity ─────────────────────────────────────────────────────
    if (entities.length) {
        out.push(`<text x="${PAD}" y="${entityTitleY}" class="section">By entity — requests · transferred · total request time</text>`);
        const maxBytes = Math.max(...entities.map(e => e.bytes), 1);
        entities.forEach((e, i) => {
            const y = entityTop + i * ENTITY_ROW_H;
            out.push(`<circle cx="${PAD + 5}" cy="${y + 7}" r="4" fill="${PARTY_COLOR[e.party]}"/>`);
            out.push(`<text x="${PAD + 14}" y="${y + 11}" class="lbl">${esc(trunc(e.name, 46))}${e.party === 'first' ? ' (1st party)' : ''}</text>`);
            out.push(`<text x="${TL_X - 8}" y="${y + 11}" text-anchor="end" class="size">${e.count} req · ${fmtBytes(e.bytes)} · ${fmtMs(e.time)}</text>`);
            out.push(`<rect x="${TL_X}" y="${y + 3}" width="${f(Math.max((e.bytes / maxBytes) * TL_W * 0.6, 1.5))}" height="9" rx="2" fill="${PARTY_COLOR[e.party]}" opacity="0.8"/>`);
        });
        const more = entityCount(requests) - entities.length;
        if (more > 0) out.push(`<text x="${TL_X + TL_W * 0.6 + 12}" y="${entityTop + 11}" class="muted">+${more} smaller entities</text>`);
    }

    // ── Legend ────────────────────────────────────────────────────────
    const typesUsed = new Set(requests.map(r => typeOf(r)));
    out.push(legend(PAD, legendY, [
        { label: 'Queued / stalled', fill: '#bdc1c6' },
        { label: 'DNS', fill: PHASE_COLOR.dns },
        { label: 'Connect', fill: PHASE_COLOR.connect },
        { label: 'SSL', fill: PHASE_COLOR.ssl },
        { label: 'Waiting for server (light)', fill: TYPE_STYLE.js.light },
        { label: 'Download (dark)', fill: TYPE_STYLE.js.color },
        ...(hasLane ? [{ label: 'Long task', fill: 'url(#blocking)' }] : []),
    ]));
    out.push(legend(PAD, legendY + 18, [
        ...(Object.keys(TYPE_STYLE) as TypeKey[]).filter(k => typesUsed.has(k)).map(k => ({ label: TYPE_STYLE[k].label, fill: TYPE_STYLE[k].color })),
        ...(renderBlocking.length ? [{ label: 'Render-blocking request', fill: RENDER_BLOCKING_COLOR }] : []),
        ...(lcpRequest ? [{ label: 'LCP resource', fill: LCP_COLOR }] : []),
        ...timingMarkers.filter(m => markers.some(x => x.label === m.label)).map(m => ({ label: m.label, fill: m.color, dashed: true })),
    ]));

    out.push(`</svg>`);
    return out.join('\n');
}

function tooltip(req: WaterfallRequest, index: number, party: 'first' | 'third'): string {
    const lines = [`#${index} ${req.url}`];
    const type = [req.resourceType || req.mimeType || 'Other',
        req.priority ? `${PRIORITY_LABEL[req.priority] ?? req.priority} priority` : '',
        req.initiator ? `initiated by ${req.initiator}` : '',
        req.protocol, req.statusCode !== undefined && req.statusCode !== '' ? `status ${req.statusCode}` : '',
    ].filter(Boolean).join(' · ');
    lines.push(type);
    lines.push(`Start ${fmtMs(req.start)} · end ${fmtMs(req.start + req.duration)} · total ${fmtMs(req.duration)}${req.start < 0 ? ' (started before this step)' : ''}`);
    if (req.phases?.length) {
        const byName = new Map<WaterfallPhaseName, number>();
        for (const p of req.phases) byName.set(p.name, (byName.get(p.name) ?? 0) + (p.end - p.start));
        lines.push([...byName.entries()].map(([name, ms]) => `${PHASE_LABEL[name]} ${fmtMs(ms)}`).join(' · '));
    }
    lines.push(`${fmtBytes(req.transferSize || 0)} transferred · ${fmtBytes(req.resourceSize || 0)} resource`);
    const flags = [req.renderBlocking ? 'render-blocking' : '', req.lcp ? 'LCP resource' : '', req.cache ? `from ${req.cache}` : '',
        req.failed ? `${failureLabel(req, '')}${req.failReason ? ` (${req.failReason})` : ''}` : ''].filter(Boolean);
    if (flags.length) lines.push(flags.join(' · '));
    lines.push(`${req.entity} (${party === 'first' ? '1st' : '3rd'} party)`);
    return lines.join('\n');
}

/** `canceled` (net::ERR_ABORTED, as DevTools shows it), `failed` for other network errors, else the HTTP status. */
function failureLabel(req: WaterfallRequest, status: string): string {
    if (req.failed) return /ERR_ABORTED/i.test(req.failReason ?? '') ? 'canceled' : 'failed';
    return status || 'failed';
}

function entityCount(requests: WaterfallRequest[]): number {
    return new Set(requests.map(r => r.entity)).size;
}

/** Top entities by transferred bytes (max 8). */
function entitySummary(requests: WaterfallRequest[], partyOf: (r: WaterfallRequest) => 'first' | 'third') {
    const byEntity = new Map<string, { name: string; party: 'first' | 'third'; count: number; bytes: number; time: number }>();
    for (const r of requests) {
        const e = byEntity.get(r.entity) ?? { name: r.entity, party: partyOf(r), count: 0, bytes: 0, time: 0 };
        e.count++;
        e.bytes += r.transferSize || 0;
        e.time += Math.max(r.duration, 0);
        byEntity.set(r.entity, e);
    }
    return [...byEntity.values()].sort((a, b) => b.bytes - a.bytes || b.count - a.count).slice(0, 8);
}
