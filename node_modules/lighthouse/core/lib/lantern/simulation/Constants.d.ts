export namespace Constants {
    export { throttling };
}
declare namespace throttling {
    export { DEVTOOLS_RTT_ADJUSTMENT_FACTOR };
    export { DEVTOOLS_THROUGHPUT_ADJUSTMENT_FACTOR };
    export namespace mobileSlow4G {
        const rttMs: number;
        const throughputKbps: number;
        const requestLatencyMs: number;
        const downloadThroughputKbps: number;
        const uploadThroughputKbps: number;
        const cpuSlowdownMultiplier: number;
    }
    export namespace mobileRegular3G {
        const rttMs_1: number;
        export { rttMs_1 as rttMs };
        const throughputKbps_1: number;
        export { throughputKbps_1 as throughputKbps };
        const requestLatencyMs_1: number;
        export { requestLatencyMs_1 as requestLatencyMs };
        const downloadThroughputKbps_1: number;
        export { downloadThroughputKbps_1 as downloadThroughputKbps };
        const uploadThroughputKbps_1: number;
        export { uploadThroughputKbps_1 as uploadThroughputKbps };
        const cpuSlowdownMultiplier_1: number;
        export { cpuSlowdownMultiplier_1 as cpuSlowdownMultiplier };
    }
    export namespace desktopDense4G {
        const rttMs_2: number;
        export { rttMs_2 as rttMs };
        const throughputKbps_2: number;
        export { throughputKbps_2 as throughputKbps };
        const cpuSlowdownMultiplier_2: number;
        export { cpuSlowdownMultiplier_2 as cpuSlowdownMultiplier };
        const requestLatencyMs_2: number;
        export { requestLatencyMs_2 as requestLatencyMs };
        const downloadThroughputKbps_2: number;
        export { downloadThroughputKbps_2 as downloadThroughputKbps };
        const uploadThroughputKbps_2: number;
        export { uploadThroughputKbps_2 as uploadThroughputKbps };
    }
}
/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
declare const DEVTOOLS_RTT_ADJUSTMENT_FACTOR: 3.75;
declare const DEVTOOLS_THROUGHPUT_ADJUSTMENT_FACTOR: 0.9;
export {};
//# sourceMappingURL=Constants.d.ts.map