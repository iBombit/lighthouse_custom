export type Node = import('./BaseNode.js').Node;
export type NetworkNodeOutput = {
    nodes: Array<NetworkNode>;
    idToNodeMap: Map<string, NetworkNode>;
    urlToNodeMap: Map<string, Array<NetworkNode>>;
    frameIdToNodeMap: Map<string, NetworkNode | null>;
};
export class PageDependencyGraph {
    /**
     * @param {Lantern.NetworkRequest} request
     * @return {Array<string>}
     */
    static getNetworkInitiators(request: Lantern.NetworkRequest): Array<string>;
    /**
     * @param {Array<Lantern.NetworkRequest>} networkRequests
     * @return {NetworkNodeOutput}
     */
    static getNetworkNodeOutput(networkRequests: Array<Lantern.NetworkRequest>): NetworkNodeOutput;
    /**
     * @param {Lantern.TraceEvent} evt
     * @return {boolean}
     */
    static isScheduleableTask(evt: Lantern.TraceEvent): boolean;
    /**
     * There should *always* be at least one top level event, having 0 typically means something is
     * drastically wrong with the trace and we should just give up early and loudly.
     *
     * @param {Lantern.TraceEvent[]} events
     */
    static assertHasToplevelEvents(events: Lantern.TraceEvent[]): void;
    /**
     * @param {Lantern.TraceEvent[]} mainThreadEvents
     * @return {Array<CPUNode>}
     */
    static getCPUNodes(mainThreadEvents: Lantern.TraceEvent[]): Array<CPUNode>;
    /**
     * @param {NetworkNode} rootNode
     * @param {NetworkNodeOutput} networkNodeOutput
     */
    static linkNetworkNodes(rootNode: NetworkNode, networkNodeOutput: NetworkNodeOutput): void;
    /**
     * @param {Node} rootNode
     * @param {NetworkNodeOutput} networkNodeOutput
     * @param {Array<CPUNode>} cpuNodes
     */
    static linkCPUNodes(rootNode: Node, networkNodeOutput: NetworkNodeOutput, cpuNodes: Array<CPUNode>): void;
    /**
     * Removes the given node from the graph, but retains all paths between its dependencies and
     * dependents.
     * @param {Node} node
     */
    static _pruneNode(node: Node): void;
    /**
     * TODO(15841): remove when CDT backend is gone. until then, this is a useful debugging tool
     * to find delta between using CDP or the trace to create the network requests.
     *
     * When a test fails using the trace backend, I enabled this debug method and copied the network
     * requests when CDP was used, then when trace is used, and diff'd them. This method helped
     * remove non-logical differences from the comparison (order of properties, slight rounding
     * discrepancies, removing object cycles, etc).
     *
     * When using for a unit test, make sure to do `.only` so you are getting what you expect.
     * @param {Lantern.NetworkRequest[]} lanternRequests
     * @return {never}
     */
    static _debugNormalizeRequests(lanternRequests: Lantern.NetworkRequest[]): never;
    /**
     * @param {Lantern.TraceEvent[]} mainThreadEvents
     * @param {Lantern.NetworkRequest[]} networkRequests
     * @param {Lantern.Simulation.URL} URL
     * @return {Node}
     */
    static createGraph(mainThreadEvents: Lantern.TraceEvent[], networkRequests: Lantern.NetworkRequest[], URL: Lantern.Simulation.URL): Node;
    /**
     * @param {Node} rootNode
     */
    static printGraph(rootNode: Node, widthInCharacters?: number): void;
}
import { NetworkNode } from './NetworkNode.js';
import * as Lantern from './lantern.js';
import { CPUNode } from './CpuNode.js';
//# sourceMappingURL=PageDependencyGraph.d.ts.map