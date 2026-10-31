import type { TaskGroupIds } from 'lighthouse/core/lib/tracehouse/task-groups.js';
import { esc, f, fmtMs } from './format.js';
import type { TaskBar } from './longTasksChart.js';
import {
    BLOCKING_PATTERN, TASK_GROUP_ORDER, TASK_GROUP_STYLE, assignMarkerTiers, chartHeader, markerLines, svgOpen, timeAxis,
    type ChartMarker,
} from './svg.js';

export interface ActivityChartInput {
    title: string;
    subtitle: string;
    endMs: number;
    /** Width of each histogram bin (ms). */
    binMs: number;
    /** Busy time (ms) per activity in each bin; bin `i` covers `[i * binMs, (i + 1) * binMs)`. */
    bins: Array<Partial<Record<TaskGroupIds, number>>>;
    /** Top-level tasks for the task lane. */
    tasks: TaskBar[];
    markers: ChartMarker[];
    window?: { start: number; end: number; label: string };
    /** Total main-thread time per activity (the "Summary"). */
    totals: Array<{ group: TaskGroupIds; ms: number }>;
}

const W = 1240;
const PAD = 20;
const X0 = PAD + 70;
const TL_W = W - X0 - PAD;
const CPU_H = 110;
const LANE_H = 22;
const TIER_H = 14;
const LONG_TASK_MS = 50;

/** DevTools-like main-thread chart: CPU activity by category over time, the task lane and a Summary bar. */
export function buildActivityChart(input: ActivityChartInput): string {
    const endMs = Number.isFinite(input.endMs) && input.endMs > 0 ? input.endMs : 1;
    const px = TL_W / endMs;
    const markers = input.markers.map(m => ({ ...m }));
    const maxTier = assignMarkerTiers(markers, px);

    const markerTop = 70;
    const cpuTop = markerTop + (maxTier + 1) * TIER_H + 12;
    const cpuBottom = cpuTop + CPU_H;
    const laneTop = cpuBottom + 8;
    const laneBottom = laneTop + LANE_H;
    const axisY = laneBottom + 16;
    const summaryTitleY = axisY + 32;
    const summaryBarY = summaryTitleY + 10;
    const summaryLegendY = summaryBarY + 34;
    const totals = input.totals.filter(t => t.ms > 0);
    const legendRows = Math.max(Math.ceil(totals.length / 4), 1);
    const H = summaryLegendY + legendRows * 18 + 14;

    const out: string[] = [svgOpen(W, H, BLOCKING_PATTERN), chartHeader(PAD, input.title, input.subtitle)];

    if (input.window && input.window.end > input.window.start) {
        const ws = Math.max(0, input.window.start), we = Math.min(endMs, input.window.end);
        if (we > ws) {
            out.push(`<rect x="${f(X0 + ws * px)}" y="${cpuTop}" width="${f((we - ws) * px)}" height="${laneBottom - cpuTop}" fill="#fff4cc" opacity="0.7"/>`);
            out.push(`<text x="${f(X0 + ws * px + 4)}" y="${cpuTop + 11}" class="muted">${esc(input.window.label)}</text>`);
        }
    }

    // CPU area: 0 / 50 / 100 % guides.
    out.push(`<text x="${PAD}" y="${cpuTop + CPU_H / 2 + 4}" class="section">CPU</text>`);
    for (const pct of [0, 50, 100]) {
        const y = cpuBottom - (pct / 100) * CPU_H;
        out.push(`<line x1="${X0}" y1="${f(y)}" x2="${X0 + TL_W}" y2="${f(y)}" class="grid"/>`);
        out.push(`<text x="${X0 - 4}" y="${f(y + 3)}" text-anchor="end" class="ax">${pct}%</text>`);
    }
    out.push(timeAxis(X0, TL_W, endMs, cpuTop, laneBottom, axisY));

    // Stacked columns, one per bin.
    const binW = input.binMs * px;
    input.bins.forEach((bin, i) => {
        const x = X0 + i * binW;
        if (x > X0 + TL_W) return;
        let y = cpuBottom;
        for (const group of TASK_GROUP_ORDER) {
            const ms = bin[group] ?? 0;
            if (ms <= 0) continue;
            const h = Math.min(ms / input.binMs, 1) * CPU_H;
            y -= h;
            out.push(`<rect x="${f(x)}" y="${f(y)}" width="${f(Math.max(binW - 0.2, 0.6))}" height="${f(h)}" fill="${TASK_GROUP_STYLE[group].color}"/>`);
        }
    });

    // Task lane.
    out.push(`<text x="${PAD}" y="${laneTop + LANE_H / 2 + 4}" class="section">Tasks</text>`);
    out.push(`<rect x="${X0}" y="${laneTop}" width="${TL_W}" height="${LANE_H}" fill="#f1f3f4" rx="2"/>`);
    for (const task of input.tasks) {
        if (task.start > endMs) continue;
        const x = X0 + task.start * px;
        const w = Math.max(Math.min(task.duration, endMs - task.start) * px, 1);
        const long = task.duration > LONG_TASK_MS;
        out.push(`<g class="task"><title>${esc(`${long ? 'Long task' : 'Task'} ${fmtMs(task.duration)} at ${fmtMs(task.start)} · ${TASK_GROUP_STYLE[task.group].label}${task.label ? ` · ${task.label}` : ''}`)}</title>`);
        out.push(`<rect x="${f(x)}" y="${laneTop + 3}" width="${f(w)}" height="${LANE_H - 6}" fill="${long ? 'url(#blocking)' : '#9aa0a6'}"/></g>`);
    }

    out.push(markerLines(markers, X0, px, endMs, markerTop, TIER_H, laneBottom));

    // Summary: 100% stacked bar + legend with totals.
    const totalMs = totals.reduce((s, t) => s + t.ms, 0);
    out.push(`<text x="${PAD}" y="${summaryTitleY}" class="section">Main-thread time by activity — ${fmtMs(totalMs)} busy</text>`);
    let sx = PAD;
    const barW = W - 2 * PAD;
    for (const t of totals) {
        const w = totalMs ? (t.ms / totalMs) * barW : 0;
        out.push(`<rect x="${f(sx)}" y="${summaryBarY}" width="${f(w)}" height="16" fill="${TASK_GROUP_STYLE[t.group].color}"><title>${esc(`${TASK_GROUP_STYLE[t.group].label}: ${fmtMs(t.ms)}`)}</title></rect>`);
        sx += w;
    }
    totals.forEach((t, i) => {
        const x = PAD + (i % 4) * 300;
        const y = summaryLegendY + Math.floor(i / 4) * 18;
        const pct = totalMs ? Math.round((t.ms / totalMs) * 100) : 0;
        out.push(`<rect x="${x}" y="${y - 9}" width="12" height="10" rx="2" fill="${TASK_GROUP_STYLE[t.group].color}"/>`);
        out.push(`<text x="${x + 17}" y="${y}" class="lbl">${esc(TASK_GROUP_STYLE[t.group].label)}: <tspan class="val">${fmtMs(t.ms)}</tspan> (${pct}%)</text>`);
    });

    out.push(`</svg>`);
    return out.join('\n');
}
