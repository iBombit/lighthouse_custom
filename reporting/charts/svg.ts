import type { TaskGroupIds } from 'lighthouse/core/lib/tracehouse/task-groups.js';
import { esc, f, fmtMs, niceTickInterval } from './format.js';

/** Main-thread activity categories (Lighthouse task groups) with DevTools-like colors. */
export const TASK_GROUP_STYLE: Record<TaskGroupIds, { label: string; color: string }> = {
    scriptEvaluation:     { label: 'Script evaluation',      color: '#f4b400' },
    scriptParseCompile:   { label: 'Script parse & compile', color: '#c99700' },
    garbageCollection:    { label: 'Garbage collection',     color: '#a1887f' },
    styleLayout:          { label: 'Style & layout',         color: '#9575cd' },
    paintCompositeRender: { label: 'Paint & composite',      color: '#5cb85c' },
    parseHTML:            { label: 'Parse HTML & CSS',       color: '#4f8ff7' },
    other:                { label: 'Other',                  color: '#b0bec5' },
};

/** Display order of the activity categories (stacking order in charts). */
export const TASK_GROUP_ORDER: TaskGroupIds[] = [
    'scriptEvaluation', 'scriptParseCompile', 'garbageCollection', 'styleLayout', 'paintCompositeRender', 'parseHTML', 'other',
];

/** Colors for first-party / third-party / unattributed work. */
export const PARTY_COLOR = { first: '#1a73e8', third: '#e8710a', other: '#9e9e9e' } as const;
export type Party = keyof typeof PARTY_COLOR;

/** Lighthouse rating colors. */
export const STATUS_COLOR = { good: '#0cce6b', average: '#ffa400', poor: '#ff4e42' } as const;

/** Color of the blocking (> 50 ms) part of long tasks. */
export const BLOCKING_COLOR = '#d93025';

/** A vertical timing marker (FCP, LCP, TTI, ...). `tier` is assigned by {@link assignMarkerTiers}. */
export interface ChartMarker {
    t: number;
    label: string;
    color: string;
    tier?: number;
}

/** Standard metric marker colors. */
export const MARKER_COLOR: Record<string, string> = {
    FCP: '#1a73e8', LCP: '#0cce6b', DCL: '#4a90d9', Load: '#e86c8d', TTI: '#f5a623',
};

export const CHART_FONT = `font-family="'Segoe UI',system-ui,Roboto,Helvetica,Arial,sans-serif" font-size="11"`;

/** Shared CSS for the charts. */
export const CHART_STYLES = [
    '.bg{fill:#fff} .title{font-size:15px;font-weight:700;fill:#202124} .subtitle{font-size:11px;fill:#5f6368}',
    '.section{font-size:12px;font-weight:600;fill:#202124} .ax{font-size:10px;fill:#80868b} .lbl{font-size:10.5px;fill:#3c4043}',
    '.muted{font-size:10px;fill:#80868b} .val{font-size:10px;fill:#202124;font-weight:600} .grid{stroke:#e8eaed;stroke-width:1}',
    '.tm-line{stroke-width:1.5;stroke-dasharray:5,3} .tm-lbl{font-size:10px;font-weight:600}',
    '.bar:hover,.task:hover{opacity:.75;stroke:#202124;stroke-width:1}',
].join('\n');

/** `<pattern id="blocking">`: DevTools-style red hatching for blocking time. */
export const BLOCKING_PATTERN =
    `<pattern id="blocking" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">` +
    `<rect width="6" height="6" fill="${BLOCKING_COLOR}"/><rect width="2.5" height="6" fill="#ff8a80"/></pattern>`;

/** Opening `<svg>` element with background, shared styles and optional extra `<defs>` content. */
export function svgOpen(width: number, height: number, defs = ''): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" ${CHART_FONT}>` +
        `<defs><style>${CHART_STYLES}</style>${defs}</defs>` +
        `<rect width="${width}" height="${height}" class="bg" rx="8"/>`;
}

/** Title + subtitle header at the top-left of a chart. */
export function chartHeader(x: number, title: string, subtitle: string): string {
    return `<text x="${x}" y="24" class="title">${esc(title)}</text>` +
        `<text x="${x}" y="42" class="subtitle">${esc(subtitle)}</text>`;
}

/**
 * Assigns a stagger tier to each marker (after sorting by time) so labels that would overlap
 * are drawn on separate rows. Returns the highest tier used.
 */
export function assignMarkerTiers(markers: ChartMarker[], pxPerMs: number, minGapPx = 46): number {
    markers.sort((a, b) => a.t - b.t);
    let maxTier = 0;
    markers.forEach((mk, i) => {
        let tier = 0;
        for (let j = 0; j < i; j++) {
            const prev = markers[j];
            if (prev.tier === tier && Math.abs(mk.t - prev.t) * pxPerMs < minGapPx) {
                tier++;
                j = -1; // re-check all previous markers at the new tier
            }
        }
        mk.tier = tier;
        maxTier = Math.max(maxTier, tier);
    });
    return maxTier;
}

/** Vertical gridlines with tick labels for a time axis from 0 to `endMs`. */
export function timeAxis(x0: number, widthPx: number, endMs: number, gridTop: number, gridBottom: number, labelY: number): string {
    if (!Number.isFinite(endMs) || endMs <= 0) return '';
    const step = niceTickInterval(endMs);
    const out: string[] = [];
    for (let t = 0; t <= endMs + step * 0.01; t += step) {
        const x = x0 + (t / endMs) * widthPx;
        out.push(`<line x1="${f(x)}" y1="${gridTop}" x2="${f(x)}" y2="${gridBottom}" class="grid"/>`);
        out.push(`<text x="${f(x)}" y="${labelY}" text-anchor="middle" class="ax">${fmtMs(t)}</text>`);
    }
    return out.join('');
}

/** Marker lines spanning `top`..`bottom` with staggered labels above `top`. Markers must have tiers assigned. */
export function markerLines(markers: ChartMarker[], x0: number, pxPerMs: number, endMs: number, labelTop: number, tierHeight: number, bottom: number): string {
    const out: string[] = [];
    for (const mk of markers) {
        if (mk.t < 0 || mk.t > endMs) continue;
        const x = x0 + mk.t * pxPerMs;
        const y = labelTop + (mk.tier ?? 0) * tierHeight;
        out.push(`<line x1="${f(x)}" y1="${y + 3}" x2="${f(x)}" y2="${bottom}" class="tm-line" stroke="${mk.color}"/>`);
        out.push(`<text x="${f(x)}" y="${y}" text-anchor="middle" class="tm-lbl" fill="${mk.color}">${esc(mk.label)} ${fmtMs(mk.t)}</text>`);
    }
    return out.join('');
}

/** Legend entries laid out left to right; returns the SVG and the x after the last entry. */
export function legend(x: number, y: number, entries: Array<{ label: string; fill: string; dashed?: boolean }>): string {
    const out: string[] = [];
    let lx = x;
    for (const e of entries) {
        if (e.dashed) {
            out.push(`<line x1="${lx}" y1="${y + 5}" x2="${lx + 14}" y2="${y + 5}" stroke="${e.fill}" stroke-width="1.5" stroke-dasharray="3,2"/>`);
        } else {
            out.push(`<rect x="${lx}" y="${y}" width="12" height="10" rx="2" fill="${e.fill}"/>`);
        }
        out.push(`<text x="${lx + 17}" y="${y + 9}" class="muted">${esc(e.label)}</text>`);
        lx += 17 + e.label.length * 5.6 + 16;
    }
    return out.join('');
}

/** Encodes an SVG document as a `data:` URI usable as a Lighthouse `thumbnail` value. */
export function svgToDataUri(svg: string): string {
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}
