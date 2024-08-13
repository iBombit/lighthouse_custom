export { PageDependencyGraphComputed as PageDependencyGraph };
export type Node = import('../lib/lantern/BaseNode.js').Node<LH.Artifacts.NetworkRequest>;
declare const PageDependencyGraphComputed: typeof PageDependencyGraph & {
    request: (dependencies: {
        trace: LH.Trace;
        devtoolsLog: import("../index.js").DevtoolsLog;
        URL: LH.Artifacts['URL'];
        fromTrace?: boolean | undefined;
    }, context: import("../../types/utility-types.js").default.ImmutableObject<{
        computedCache: Map<string, import("../lib/arbitrary-equality-map.js").ArbitraryEqualityMap>;
    }>) => Promise<Node>;
};
import { NetworkRequest } from '../lib/network-request.js';
/** @typedef {import('../lib/lantern/BaseNode.js').Node<LH.Artifacts.NetworkRequest>} Node */
declare class PageDependencyGraph {
    /**
     * @param {{trace: LH.Trace, devtoolsLog: LH.DevtoolsLog, URL: LH.Artifacts['URL'], fromTrace?: boolean}} data
     * @param {LH.Artifacts.ComputedContext} context
     * @return {Promise<Node>}
     */
    static compute_(data: {
        trace: LH.Trace;
        devtoolsLog: import("../index.js").DevtoolsLog;
        URL: LH.Artifacts['URL'];
        fromTrace?: boolean | undefined;
    }, context: LH.Artifacts.ComputedContext): Promise<Node>;
}
//# sourceMappingURL=page-dependency-graph.d.ts.map