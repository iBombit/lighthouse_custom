export { NavigationInsightsComputed as NavigationInsights };
declare const NavigationInsightsComputed: typeof NavigationInsights & {
    request: (dependencies: import("../index.js").Trace, context: import("../../types/utility-types.js").default.ImmutableObject<{
        computedCache: Map<string, import("../lib/arbitrary-equality-map.js").ArbitraryEqualityMap>;
    }>) => Promise<import("@paulirish/trace_engine/models/trace/insights/types.js").NavigationInsightData<typeof import("@paulirish/trace_engine/models/trace/handlers/ModelHandlers.js")>>;
};
/**
 * @fileoverview Gets insights from the shared trace engine for the navigation audited by Lighthouse.
 * Only usable in navigation mode.
 */
declare class NavigationInsights {
    /**
      * @param {LH.Trace} trace
      * @param {LH.Artifacts.ComputedContext} context
     */
    static compute_(trace: LH.Trace, context: LH.Artifacts.ComputedContext): Promise<import("@paulirish/trace_engine/models/trace/insights/types.js").NavigationInsightData<typeof import("@paulirish/trace_engine/models/trace/handlers/ModelHandlers.js")>>;
}
//# sourceMappingURL=navigation-insights.d.ts.map