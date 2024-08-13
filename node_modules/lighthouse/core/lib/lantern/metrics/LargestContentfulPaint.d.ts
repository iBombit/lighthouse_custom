export type Node = import('../BaseNode.js').Node;
/** @typedef {import('../BaseNode.js').Node} Node */
export class LargestContentfulPaint extends Lantern.Metric {
    /**
     * Low priority image nodes are usually offscreen and very unlikely to be the
     * resource that is required for LCP. Our LCP graphs include everything except for these images.
     *
     * @param {Node} node
     * @return {boolean}
     */
    static isNotLowPriorityImageNode(node: Node): boolean;
    /**
     * @param {Lantern.Simulation.Result} simulationResult
     * @return {Lantern.Simulation.Result}
     */
    static getEstimateFromSimulation(simulationResult: Lantern.Simulation.Result): Lantern.Simulation.Result;
}
import * as Lantern from '../lantern.js';
//# sourceMappingURL=LargestContentfulPaint.d.ts.map