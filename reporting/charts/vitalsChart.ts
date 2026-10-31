import { esc, f } from './format.js';
import { STATUS_COLOR, chartHeader, svgOpen } from './svg.js';

export type VitalStatus = keyof typeof STATUS_COLOR;

/** One metric row. `good`/`poor` are the values scoring 0.9 / 0.5 (Lighthouse's p10 / median). */
export interface VitalRow {
    label: string;
    value: number;
    display: string;
    good: number;
    poor: number;
    unit: 'ms' | 'unitless';
    status: VitalStatus;
}

const W = 1240;
const PAD = 20;
const BAR_X = PAD + 330;
const BAR_W = W - BAR_X - PAD - 20;
const ROW_H = 54;
const ZONE_COLOR: Record<VitalStatus, string> = { good: '#d7f5e3', average: '#fff0d1', poor: '#ffe1de' };
const STATUS_TEXT: Record<VitalStatus, string> = { good: 'Good', average: 'Needs improvement', poor: 'Poor' };

/** Formats a threshold the way the report shows metric values. */
export function formatVitalValue(value: number, unit: VitalRow['unit']): string {
    if (unit === 'unitless') return value.toFixed(value < 1 ? 2 : 1);
    return value >= 1000 ? `${(value / 1000).toFixed(1)} s` : `${Math.round(value)} ms`;
}

/** Bullet chart per metric: good / needs-improvement / poor zones with the measured value marked. */
export function buildVitalsChart(title: string, subtitle: string, rows: VitalRow[]): string {
    const top = 64;
    const H = top + Math.max(rows.length, 1) * ROW_H + 12;
    const out: string[] = [svgOpen(W, H), chartHeader(PAD, title, subtitle)];
    rows.forEach((r, i) => {
        const y = top + i * ROW_H;
        const max = Math.max(r.value, r.poor) * 1.3 || 1;
        const sx = (v: number) => BAR_X + Math.min(v / max, 1) * BAR_W;
        out.push(`<text x="${PAD}" y="${y + 18}" class="section">${esc(r.label)}</text>`);
        out.push(`<text x="${PAD}" y="${y + 38}" font-size="18" font-weight="700" fill="${STATUS_COLOR[r.status]}">${esc(r.display)}</text>`);
        out.push(`<text x="${PAD + 120}" y="${y + 37}" class="muted">${STATUS_TEXT[r.status]}</text>`);
        // Zones.
        const zones: Array<[number, number, VitalStatus]> = [[0, r.good, 'good'], [r.good, r.poor, 'average'], [r.poor, max, 'poor']];
        for (const [from, to, status] of zones) {
            out.push(`<rect x="${f(sx(from))}" y="${y + 14}" width="${f(Math.max(sx(to) - sx(from), 0))}" height="16" fill="${ZONE_COLOR[status]}"/>`);
        }
        out.push(`<text x="${f(sx(r.good))}" y="${y + 44}" text-anchor="middle" class="ax">${esc(formatVitalValue(r.good, r.unit))}</text>`);
        out.push(`<text x="${f(sx(r.poor))}" y="${y + 44}" text-anchor="middle" class="ax">${esc(formatVitalValue(r.poor, r.unit))}</text>`);
        // Measured value.
        const vx = sx(r.value);
        out.push(`<g><title>${esc(`${r.label}: ${r.display} (${STATUS_TEXT[r.status]}; good ≤ ${formatVitalValue(r.good, r.unit)}, poor > ${formatVitalValue(r.poor, r.unit)})`)}</title>`);
        out.push(`<rect x="${f(vx - 2)}" y="${y + 9}" width="4" height="26" rx="1" fill="${STATUS_COLOR[r.status]}"/>`);
        out.push(`<text x="${f(Math.min(vx + 6, W - PAD - 40))}" y="${y + 10}" class="val">${esc(r.display)}</text></g>`);
    });
    out.push(`</svg>`);
    return out.join('\n');
}
