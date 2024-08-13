export class ConnectionPool {
    /**
     * @param {Lantern.NetworkRequest[]} records
     * @param {Required<Lantern.Simulation.Options>} options
     */
    constructor(records: Lantern.NetworkRequest[], options: Required<Lantern.Simulation.Options>);
    _options: Required<import("../types/lantern.js").Simulation.Options>;
    _records: Lantern.NetworkRequest<any>[];
    /** @type {Map<string, TcpConnection[]>} */
    _connectionsByOrigin: Map<string, TcpConnection[]>;
    /** @type {Map<Lantern.NetworkRequest, TcpConnection>} */
    _connectionsByRequest: Map<Lantern.NetworkRequest, TcpConnection>;
    _connectionsInUse: Set<any>;
    _connectionReusedByRequestId: Map<string, boolean>;
    /**
     * @return {TcpConnection[]}
     */
    connectionsInUse(): TcpConnection[];
    _initializeConnections(): void;
    /**
     * @param {Array<TcpConnection>} connections
     */
    _findAvailableConnectionWithLargestCongestionWindow(connections: Array<TcpConnection>): Lantern.Simulation.TcpConnection | null;
    /**
     * This method finds an available connection to the origin specified by the network request or null
     * if no connection was available. If returned, connection will not be available for other network
     * records until release is called.
     *
     * @param {Lantern.NetworkRequest} request
     * @return {?TcpConnection}
     */
    acquire(request: Lantern.NetworkRequest): TcpConnection | null;
    /**
     * Return the connection currently being used to fetch a request. If no connection
     * currently being used for this request, an error will be thrown.
     *
     * @param {Lantern.NetworkRequest} request
     * @return {TcpConnection}
     */
    acquireActiveConnectionFromRequest(request: Lantern.NetworkRequest): TcpConnection;
    /**
     * @param {Lantern.NetworkRequest} request
     */
    release(request: Lantern.NetworkRequest): void;
}
import * as Lantern from '../lantern.js';
import { TcpConnection } from './TcpConnection.js';
//# sourceMappingURL=ConnectionPool.d.ts.map