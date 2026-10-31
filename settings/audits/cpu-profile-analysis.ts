/**
 * Function-level ("Bottom-Up") attribution of main-thread JavaScript from the V8 CPU profile
 * recorded in the trace (`disabled-by-default-v8.cpu_profiler`, enabled with `--jsProfiling=true`).
 */

export interface ProfileCallFrame {
    functionName: string;
    url?: string;
    /** Zero-based. */
    lineNumber?: number;
    /** Zero-based. */
    columnNumber?: number;
}

export interface ProfileNodeData {
    id: number;
    parent?: number;
    callFrame: ProfileCallFrame;
}

/** CPU profile merged from `Profile` / `ProfileChunk` trace events (times in µs, trace clock). */
export interface CpuProfileData {
    startTime: number;
    nodes: ProfileNodeData[];
    samples: number[];
    timeDeltas: number[];
}

export interface FunctionHotspot {
    functionName: string;
    url: string;
    /** Zero-based. */
    lineNumber: number;
    /** Zero-based. */
    columnNumber: number;
    /** Time the function itself was on top of the stack inside long tasks (ms). */
    selfInLongTasks: number;
    /** Time the function was anywhere on the stack inside long tasks (ms), recursion counted once. */
    totalInLongTasks: number;
    /** Self time over the whole profile (ms). */
    selfTime: number;
}

/** Frames that aren't JavaScript functions. */
const IGNORED_FRAMES = new Set(['(root)', '(idle)', '(program)']);
/** Upper bound for the time attributed to one sample (guards against profiler gaps). */
const MAX_SAMPLE_MS = 10;

const frameKey = (f: ProfileCallFrame) => `${f.functionName}\u0000${f.url ?? ''}\u0000${f.lineNumber ?? -1}\u0000${f.columnNumber ?? -1}`;

/**
 * Self / total time per JavaScript function, inside long tasks and overall.
 * @param profiles CPU profiles of the main thread.
 * @param timeOriginUs Trace time origin (µs); task ranges are relative to it.
 * @param longTaskRanges `[start, end]` of long tasks in ms from the time origin, sorted by start.
 */
export function functionHotspots(profiles: CpuProfileData[], timeOriginUs: number, longTaskRanges: Array<[number, number]>): FunctionHotspot[] {
    const byKey = new Map<string, FunctionHotspot>();
    const entryFor = (frame: ProfileCallFrame): FunctionHotspot => {
        const key = frameKey(frame);
        let entry = byKey.get(key);
        if (!entry) {
            entry = {
                functionName: frame.functionName || '(anonymous)',
                url: frame.url ?? '',
                lineNumber: frame.lineNumber ?? -1,
                columnNumber: frame.columnNumber ?? -1,
                selfInLongTasks: 0, totalInLongTasks: 0, selfTime: 0,
            };
            byKey.set(key, entry);
        }
        return entry;
    };

    for (const profile of profiles) {
        const nodes = new Map(profile.nodes.map(n => [n.id, n]));
        const timestamps: number[] = [];
        let t = profile.startTime;
        for (let i = 0; i < profile.samples.length; i++) {
            t += profile.timeDeltas[i] ?? 0;
            timestamps.push(t);
        }
        let range = 0;
        for (let i = 0; i < profile.samples.length; i++) {
            const leaf = nodes.get(profile.samples[i]);
            if (!leaf || IGNORED_FRAMES.has(leaf.callFrame.functionName)) continue;
            const next = timestamps[i + 1] ?? timestamps[i];
            const durationMs = Math.min(Math.max(next - timestamps[i], 0) / 1000, MAX_SAMPLE_MS);
            if (durationMs <= 0) continue;
            const atMs = (timestamps[i] - timeOriginUs) / 1000;
            while (range < longTaskRanges.length && longTaskRanges[range][1] < atMs) range++;
            const inLongTask = range < longTaskRanges.length && longTaskRanges[range][0] <= atMs;

            const self = entryFor(leaf.callFrame);
            self.selfTime += durationMs;
            if (!inLongTask) continue;
            self.selfInLongTasks += durationMs;
            const seen = new Set<string>();
            for (let node: ProfileNodeData | undefined = leaf; node; node = node.parent !== undefined ? nodes.get(node.parent) : undefined) {
                if (IGNORED_FRAMES.has(node.callFrame.functionName)) continue;
                const key = frameKey(node.callFrame);
                if (seen.has(key)) continue;
                seen.add(key);
                entryFor(node.callFrame).totalInLongTasks += durationMs;
            }
        }
    }

    return [...byKey.values()].sort((a, b) => b.selfInLongTasks - a.selfInLongTasks || b.selfTime - a.selfTime);
}
