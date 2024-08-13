export { LanternLargestContentfulPaintComputed as LanternLargestContentfulPaint };
export type Extras = import('../../lib/lantern/Metric.js').Extras;
declare const LanternLargestContentfulPaintComputed: typeof LanternLargestContentfulPaint & {
    request: (dependencies: import("../../index.js").Artifacts.MetricComputationDataInput, context: import("../../../types/utility-types.js").default.ImmutableObject<{
        computedCache: Map<string, import("../../lib/arbitrary-equality-map.js").ArbitraryEqualityMap>;
    }>) => Promise<import("../../index.js").Artifacts.LanternMetric>;
};
/** @typedef {import('../../lib/lantern/Metric.js').Extras} Extras */
declare class LanternLargestContentfulPaint extends Lantern.Metrics.LargestContentfulPaint {
    /**
     * @param {LH.Artifacts.MetricComputationDataInput} data
     * @param {LH.Artifacts.ComputedContext} context
     * @param {Omit<Extras, 'optimistic'>=} extras
     * @return {Promise<LH.Artifacts.LanternMetric>}
     */
    static computeMetricWithGraphs(data: LH.Artifacts.MetricComputationDataInput, context: LH.Artifacts.ComputedContext, extras?: Omit<Extras, 'optimistic'> | undefined): Promise<LH.Artifacts.LanternMetric>;
    /**
     * @param {LH.Artifacts.MetricComputationDataInput} data
     * @param {LH.Artifacts.ComputedContext} context
     * @return {Promise<LH.Artifacts.LanternMetric>}
     */
    static compute_(data: LH.Artifacts.MetricComputationDataInput, context: LH.Artifacts.ComputedContext): Promise<LH.Artifacts.LanternMetric>;
}
import * as Lantern from '../../lib/lantern/lantern.js';
//# sourceMappingURL=lantern-largest-contentful-paint.d.ts.map