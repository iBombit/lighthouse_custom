/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('lighthouse/lighthouse-core/audits/audit.js');
const i18n = require('lighthouse/lighthouse-core/lib/i18n/i18n.js');
const URL = require('lighthouse/lighthouse-core/lib/url-shim.js');
const NetworkRecords = require('lighthouse/lighthouse-core/computed/network-records.js');


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

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

class CustomNetworkRequests extends Audit {
    /**
     * @return {LH.Audit.Meta}
     */
    static get meta() {
        return {
            id: 'network-requests',
            // scoreDisplayMode: Audit.SCORING_MODES.INFORMATIVE,
            scoreDisplayMode: Audit.SCORING_MODES.NUMERIC,
            title: 'Network Requests',
            failureTitle: 'Network Requests',
            description: 'Lists the network requests that were made during page load.',
            requiredArtifacts: ['devtoolsLogs'],
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
    static audit(artifacts, context) {
        const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
        return NetworkRecords.request(devtoolsLog, context).then(records => {
            const earliestStartTime = records.reduce(
                (min, record) => Math.min(min, record.startTime),
                Infinity
            );


            /** @param {number} time */
            const timeToMs = time => time < earliestStartTime || !Number.isFinite(time) ?
                undefined : (time - earliestStartTime) * 1000;

            let latestEndTime = 0;
            let maxExecutionTime = 0;
            //const maxExecutionTime = 3300;
            //records.reduce(
            //  (max, record) => Math.max(max, timeToMs(record.endTime)-timeToMs(record.startTime)),
            //0);

            const results = records.map(record => {
                const endTimeDeltaMs = record.lrStatistics?.endTimeDeltaMs;
                const TCPMs = record.lrStatistics?.TCPMs;
                const requestMs = record.lrStatistics?.requestMs;
                const responseMs = record.lrStatistics?.responseMs;
                const duration = timeToMs(record.endTime) - timeToMs(record.startTime);

                if (maxExecutionTime < timeToMs(record.endTime)) {
                    maxExecutionTime = timeToMs(record.endTime);
                }
                latestEndTime = Math.max(latestEndTime, record.endTime);

                return {
                    url: URL.elideDataURI(record.url),
                    protocol: record.protocol,
                    startTime: timeToMs(record.startTime),
                    endTime: timeToMs(record.endTime),
                    finished: record.finished,
                    transferSize: record.transferSize,
                    resourceSize: record.resourceSize,
                    statusCode: record.statusCode,
                    mimeType: record.mimeType,
                    resourceType: record.resourceType,
                    lrEndTimeDeltaMs: endTimeDeltaMs, // Only exists on Lightrider runs
                    lrTCPMs: TCPMs, // Only exists on Lightrider runs
                    lrRequestMs: requestMs, // Only exists on Lightrider runs
                    lrResponseMs: responseMs, // Only exists on Lightrider runs,
                    duration: duration, //timeToMs(record.endTime),
                };
            });

            // NOTE(i18n): this audit is only for debug info in the LHR and does not appear in the report.
            /** @type {LH.Audit.Details.Table['headings']} */
            const headings = [{
                    key: 'url',
                    itemType: 'url',
                    text: 'URL'
                },
                // {
                //     key: 'protocol',
                //     itemType: 'text',
                //     text: 'Protocol'
                // },
                {
                    key: 'startTime',
                    itemType: 'ms',
                    granularity: 1,
                    text: 'Start'
                },
                {
                    key: 'endTime',
                    itemType: 'ms',
                    granularity: 1,
                    text: 'End'
                },
                {
                    key: 'duration',
                    itemType: 'ms',
                    granularity: 1,
                    text: 'Duration'
                },
                {
                    key: 'transferSize',
                    itemType: 'bytes',
                    displayUnit: 'kb',
                    granularity: 1,
                    text: 'Transfer Size',
                },
                {
                    key: 'resourceSize',
                    itemType: 'bytes',
                    displayUnit: 'kb',
                    granularity: 1,
                    text: 'Resource Size',
                },
                {
                    key: 'statusCode',
                    itemType: 'text',
                    text: 'Code'
                },
                {
                    key: 'mimeType',
                    itemType: 'text',
                    text: 'MIME Type'
                },
                // {
                //     key: 'resourceType',
                //     itemType: 'text',
                //     text: 'Resource Type'
                // },
            ];

            const tableDetails = Audit.makeTableDetails(headings, results);

            const score = Audit.computeLogNormalScore({
                    p10: context.options.p10,
                    median: context.options.median
                },
                maxExecutionTime
            );

            //maxExecutionTime = TimeToMS(latestEndTime);
            //const score = Math.max(1 - ( maxExecutionTime / 1500), 0);

            return {
                //score: 1,
                score,
                numericValue: maxExecutionTime,
                numericUnit: 'millisecond',
                displayValue: str_(i18n.UIStrings.seconds, {
                    timeInMs: maxExecutionTime
                }),
                //displayValue: str_('{timeInMs, number, seconds}\xa0s', {timeInMs: maxExecutionTime}),
                details: tableDetails,
            };
        });
    }
}

module.exports = CustomNetworkRequests;
