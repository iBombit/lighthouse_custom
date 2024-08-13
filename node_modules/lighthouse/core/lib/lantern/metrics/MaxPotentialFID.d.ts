export type Node = import('../BaseNode.js').Node;
/** @typedef {import('../BaseNode.js').Node} Node */
export class MaxPotentialFID extends Lantern.Metric {
    /**
     * @param {Node} dependencyGraph
     * @return {Node}
     */
    static getOptimisticGraph(dependencyGraph: Node): Node;
    /**
     * @param {Node} dependencyGraph
     * @return {Node}
     */
    static getPessimisticGraph(dependencyGraph: Node): Node;
    /**
     * @param {Lantern.Simulation.Result['nodeTimings']} nodeTimings
     * @param {number} fcpTimeInMs
     * @return {Array<{duration: number}>}
     */
    static getTimingsAfterFCP(nodeTimings: Lantern.Simulation.Result['nodeTimings'], fcpTimeInMs: number): Array<{
        duration: number;
    }>;
}
import * as Lantern from '../lantern.js';
//# sourceMappingURL=MaxPotentialFID.d.ts.map