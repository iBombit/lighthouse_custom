declare namespace _default {
    export const simulationNamesToIgnore: string[];
    export { convertNodeTimingsToTrace };
}
export default _default;
export type Node = import('./lantern/BaseNode.js').Node<LH.Artifacts.NetworkRequest>;
export type CompleteNodeTiming = import('./lantern/simulation/Simulator.js').CompleteNodeTiming;
/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/** @typedef {import('./lantern/BaseNode.js').Node<LH.Artifacts.NetworkRequest>} Node */
/** @typedef {import('./lantern/simulation/Simulator.js').CompleteNodeTiming} CompleteNodeTiming */
/**
 * @param {Map<Node, CompleteNodeTiming>} nodeTimings
 * @return {LH.Trace}
 */
declare function convertNodeTimingsToTrace(nodeTimings: Map<Node, CompleteNodeTiming>): LH.Trace;
//# sourceMappingURL=lantern-trace-saver.d.ts.map