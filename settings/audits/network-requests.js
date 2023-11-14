/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import { Audit } from 'lighthouse/core/audits/audit.js';
import UrlUtils from 'lighthouse/core/lib/url-utils.js';
import { NetworkRecords } from 'lighthouse/core/computed/network-records.js';
import { MainResource } from 'lighthouse/core/computed/main-resource.js';
import { EntityClassification } from 'lighthouse/core/computed/entity-classification.js';
import * as i18n from 'lighthouse/core/lib/i18n/i18n.js';

const UIStrings = {
    /** Title of a diagnostic audit that provides detail on the main thread work the browser did to load the page. This descriptive title is shown to users when the amount is acceptable and no user action is required. */
    title: 'Network Requests',
    /** Title of a diagnostic audit that provides detail on the main thread work the browser did to load the page. This imperative title is shown to users when there is a significant amount of execution time that could be reduced. */
    failureTitle: 'Network Requests',
    /** Description of a Lighthouse audit that tells the user *why* they should reduce JS execution times. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
    description: 'Consider reducing the time spent parsing, compiling and executing JS. ' +
        'You may find delivering smaller JS payloads helps with this. ' +
        '[Learn more](https://web.dev/mainthread-work-breakdown/)',
    /** Label for the Main Thread Category column in data tables, rows will have a main thread Category and main thread Task Name. */
    columnCategory: 'Category',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class NetworkRequests extends Audit {
    /**
     * @return {LH.Audit.Meta}
     */
    static get meta() {
        return {
            id: 'network-requests',
            //scoreDisplayMode: Audit.SCORING_MODES.INFORMATIVE,
            scoreDisplayMode: Audit.SCORING_MODES.NUMERIC,
            title: 'Network Requests',
            description: 'Lists the network requests that were made during page load.',
            requiredArtifacts: ['devtoolsLogs', 'URL', 'GatherContext'],
        };
    }

    /**
       * @return {LH.Audit.ScoreOptions}
       */
    static get defaultOptions() {
        return {
            // see https://www.desmos.com/calculator/vhglu1x8zv
            p10: 2017,
            median: 4000,
        };
    }


    /**
     * @param {LH.Artifacts} artifacts
     * @param {LH.Audit.Context} context
     * @return {Promise<LH.Audit.Product>}
     */
    static async audit(artifacts, context) {
        const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
        const records = await NetworkRecords.request(devtoolsLog, context);
        const classifiedEntities = await EntityClassification.request(
            { URL: artifacts.URL, devtoolsLog }, context);
        const earliestRendererStartTime = records.reduce(
            (min, record) => Math.min(min, record.rendererStartTime),
            Infinity
        );

        let latestEndTime = 0;
        let maxExecutionTime = 0;

        // Optional mainFrameId check because the main resource is only available for
        // navigations. TODO: https://github.com/GoogleChrome/lighthouse/issues/14157
        // for the general solution to this.
        /** @type {string|undefined} */
        let mainFrameId;
        if (artifacts.GatherContext.gatherMode === 'navigation') {
            const mainResource = await MainResource.request({ devtoolsLog, URL: artifacts.URL }, context);
            mainFrameId = mainResource.frameId;
        }

        /** @param {number} time */
        const normalizeTime = time => time < earliestRendererStartTime || !Number.isFinite(time) ?
            undefined : (time - earliestRendererStartTime);

        const results = records.map(record => {
            const endTimeDeltaMs = record.lrStatistics?.endTimeDeltaMs;
            const TCPMs = record.lrStatistics?.TCPMs;
            const requestMs = record.lrStatistics?.requestMs;
            const responseMs = record.lrStatistics?.responseMs;
            const duration = normalizeTime(record.networkEndTime) - normalizeTime(record.networkRequestTime);
            if (maxExecutionTime < normalizeTime(record.networkEndTime)) {
                maxExecutionTime = normalizeTime(record.networkEndTime);
            }
            latestEndTime = Math.max(latestEndTime, record.networkEndTime);
            // Default these to undefined so omitted from JSON in the negative case.
            const isLinkPreload = record.isLinkPreload || undefined;
            const experimentalFromMainFrame = mainFrameId ?
                ((record.frameId === mainFrameId) || undefined) :
                undefined;

            const entity = classifiedEntities.entityByUrl.get(record.url);

            return {
                url: UrlUtils.elideDataURI(record.url),
                sessionTargetType: record.sessionTargetType,
                protocol: record.protocol,
                rendererStartTime: normalizeTime(record.rendererStartTime),
                networkRequestTime: normalizeTime(record.networkRequestTime),
                networkEndTime: normalizeTime(record.networkEndTime),
                finished: record.finished,
                transferSize: record.transferSize,
                resourceSize: record.resourceSize,
                statusCode: record.statusCode,
                mimeType: record.mimeType,
                resourceType: record.resourceType,
                priority: record.priority,
                isLinkPreload,
                experimentalFromMainFrame,
                entity: entity?.name,
                lrEndTimeDeltaMs: endTimeDeltaMs, // Only exists on Lightrider runs
                lrTCPMs: TCPMs, // Only exists on Lightrider runs
                lrRequestMs: requestMs, // Only exists on Lightrider runs
                lrResponseMs: responseMs, // Only exists on Lightrider runs
                duration: duration, //timeToMs(record.endTime)
            };
        });

        // NOTE(i18n): this audit is only for debug info in the LHR and does not appear in the report.
        /** @type {LH.Audit.Details.Table['headings']} */
        const headings = [
            { key: 'url', valueType: 'url', label: 'URL' },
            //{ key: 'protocol', valueType: 'text', label: 'Protocol' },
            { key: 'networkRequestTime', valueType: 'ms', granularity: 1, label: 'Network Request Time' },
            { key: 'networkEndTime', valueType: 'ms', granularity: 1, label: 'Network End Time' },
            { key: 'duration', valueType: 'ms', granularity: 1, label: 'Duration' },
            {
                key: 'transferSize',
                valueType: 'bytes',
                displayUnit: 'kb',
                granularity: 1,
                label: 'Transfer Size',
            },
            {
                key: 'resourceSize',
                valueType: 'bytes',
                displayUnit: 'kb',
                granularity: 1,
                label: 'Resource Size',
            },
            { key: 'statusCode', valueType: 'text', label: 'Status Code' },
            { key: 'mimeType', valueType: 'text', label: 'MIME Type' },
            //{key: 'resourceType', valueType: 'text', label: 'Resource Type'},
        ];

        const tableDetails = Audit.makeTableDetails(headings, results);

        const score = Audit.computeLogNormalScore({
            p10: context.options.p10,
            median: context.options.median
        },
            maxExecutionTime
        );

        // Include starting timestamp to allow syncing requests with navStart/metric timestamps.
        const networkStartTimeTs = Number.isFinite(earliestRendererStartTime) ?
            earliestRendererStartTime * 1000 : undefined;
        tableDetails.debugData = {
            type: 'debugdata',
            networkStartTimeTs,
        };

        return {
            score,
            numericValue: maxExecutionTime,
            numericUnit: 'millisecond',
            displayValue: str_(i18n.UIStrings.seconds, {
                timeInMs: maxExecutionTime
            }),
            details: tableDetails,
        };
    }
}

export default NetworkRequests;