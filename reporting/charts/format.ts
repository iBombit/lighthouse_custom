/** Formatting helpers shared by the SVG charts (waterfall, main-thread and Web Vitals charts). */

/** Milliseconds as `123ms`, `1.23s`, `12.3s` or `123s`. */
export function fmtMs(ms: number): string {
    if (ms >= 60000) return `${(ms / 1000).toFixed(0)}s`;
    if (ms >= 10000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms >= 1000)  return `${(ms / 1000).toFixed(2)}s`;
    return `${Math.round(ms)}ms`;
}

/** Bytes as `12 B`, `34 KB` or `5.6 MB`. */
export function fmtBytes(b: number): string {
    if (b >= 1048576) return `${(b / 1048576).toFixed(1)} MB`;
    if (b >= 1024)    return `${(b / 1024).toFixed(0)} KB`;
    return `${b} B`;
}

/** Shortens a URL to `…/path?query(host)`, keeping the end of the path. */
export function truncUrl(url: string, max: number): string {
    try {
        const u = new URL(url);
        let d = u.pathname + u.search;
        if (d.length > max) d = '…' + d.slice(-(max - 1));
        return `${d}(${u.hostname})`;
    } catch {
        return url.length > max ? '…' + url.slice(-(max - 1)) : url;
    }
}

/** Truncates text to `max` characters with an ellipsis. */
export function trunc(s: string, max: number): string {
    return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

/** Escapes text for use in SVG/HTML content and attributes. */
export function esc(s: unknown): string {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** One decimal place, for SVG coordinates. */
export function f(n: number): string { return n.toFixed(1); }

/** A "nice" axis tick interval giving at most ~12 ticks for `max` ms (≥ 10 ms, so short steps get ticks too). */
export function niceTickInterval(max: number): number {
    for (const iv of [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 30000, 60000]) {
        if (max / iv <= 12) return iv;
    }
    return Math.ceil(max / 10 / 1000) * 1000;
}
