import { esc, f, trunc } from './format.js';
import { chartHeader, legend, svgOpen } from './svg.js';

export interface BarRow {
    label: string;
    /** Secondary text under the label (e.g. `file.js:120`). */
    sublabel?: string;
    tooltip: string;
    value: number;
    color: string;
    valueLabel: string;
}

export interface BarChartInput {
    title: string;
    subtitle: string;
    rows: BarRow[];
    legend?: Array<{ label: string; fill: string }>;
    emptyText?: string;
}

const W = 1240;
const PAD = 20;
const LABEL_W = 520;
const BAR_X = PAD + LABEL_W + 20;
const BAR_MAX_W = W - BAR_X - PAD - 140;
const ROW_H = 30;

/** Horizontal bar chart (largest value first), e.g. JavaScript functions by blocking self time. */
export function buildBarChart(input: BarChartInput): string {
    const rows = input.rows;
    const top = 62;
    const legendY = top + Math.max(rows.length, 1) * ROW_H + 14;
    const H = legendY + (input.legend?.length ? 26 : 4);
    const out: string[] = [svgOpen(W, H), chartHeader(PAD, input.title, input.subtitle)];
    if (!rows.length && input.emptyText) out.push(`<text x="${PAD}" y="${top + 16}" class="muted">${esc(input.emptyText)}</text>`);
    const max = Math.max(...rows.map(r => r.value), 1);
    rows.forEach((r, i) => {
        const y = top + i * ROW_H;
        const w = Math.max((r.value / max) * BAR_MAX_W, 2);
        out.push(`<g class="bar"><title>${esc(r.tooltip)}</title>`);
        out.push(`<text x="${PAD}" y="${y + 12}" class="lbl" font-weight="600">${esc(trunc(r.label, 80))}</text>`);
        if (r.sublabel) out.push(`<text x="${PAD}" y="${y + 25}" class="muted">${esc(trunc(r.sublabel, 92))}</text>`);
        out.push(`<rect x="${BAR_X}" y="${y + 6}" width="${f(w)}" height="${ROW_H - 12}" rx="2" fill="${r.color}"/>`);
        out.push(`<text x="${f(BAR_X + w + 6)}" y="${y + 19}" class="val">${esc(r.valueLabel)}</text></g>`);
    });
    if (input.legend?.length) out.push(legend(PAD, legendY, input.legend));
    out.push(`</svg>`);
    return out.join('\n');
}
