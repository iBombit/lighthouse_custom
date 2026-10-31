import MainThreadWorkBreakdown from 'lighthouse/core/audits/mainthread-work-breakdown.js';
import type * as LH from 'lighthouse/types/lh.js';

/**
 * @deprecated Kept only so custom configs written for 1.x still load. Despite its name this was a
 * copy of Lighthouse's `mainthread-work-breakdown` audit (main-thread time by activity); it is now
 * exactly that audit under the old id. It isn't registered by default: use `mainthread-work-breakdown`
 * (already in the "Custom Metrics" category) or the `main-thread-timeline` / `tbt-breakdown` audits.
 */
class CustomNetworkAudit extends MainThreadWorkBreakdown {
    static override get meta(): LH.Audit.Meta {
        return { ...super.meta, id: 'network-audit' };
    }
}

export default CustomNetworkAudit;
