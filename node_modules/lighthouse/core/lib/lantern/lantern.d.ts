export { BaseNode } from "./BaseNode.js";
export { CPUNode } from "./CpuNode.js";
export { LanternError as Error } from "./LanternError.js";
export { Metric } from "./Metric.js";
export { NetworkNode } from "./NetworkNode.js";
export { PageDependencyGraph } from "./PageDependencyGraph.js";
export * as Metrics from "./metrics/metrics.js";
export * as Simulation from "./simulation/simulation.js";
export * as TBTUtils from "./TBTUtils.js";
export * as TraceEngineComputationData from "./TraceEngineComputationData.js";
export type NetworkRequest<T = any> = Lantern.NetworkRequest<T>;
export type ResourcePriority = Lantern.ResourcePriority;
export type ResourceTiming = Lantern.ResourceTiming;
export type ResourceType = Lantern.ResourceType;
export type Trace = Lantern.Trace;
export type TraceEvent = Lantern.TraceEvent;
/** @type {Lantern.Util.SelfMap<Lantern.ResourceType>} */
export const NetworkRequestTypes: Lantern.Util.SelfMap<Lantern.ResourceType>;
import * as Lantern from './types/lantern.js';
//# sourceMappingURL=lantern.d.ts.map