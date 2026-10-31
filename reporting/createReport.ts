import fs from 'fs/promises';
import path from 'path';
import { generateReport } from 'lighthouse/core/index.js';
import type { UserFlow } from 'lighthouse/core/user-flow.js';
import type * as LH from 'lighthouse/types/lh.js';
import logger from "../logger/logger.js";
import * as params from '../settings/testParams.js';
import { sendMetricsToDD } from './reporters/datadog.js';
import { sendMetricsToTeams } from './reporters/teamsWebhook.js';
import { sendMetricsToTeamsWorkflow } from './reporters/teamsWorkflow.js';
import { sendMetricsToSlack } from './reporters/slackWebhook.js';
import { sendMetricsToInfluxV1 } from './reporters/influx_v1.js';
import { sendMetricsToInfluxV2 } from './reporters/influx_v2.js';
import { sendMetricsToCSV } from './reporters/csv.js';
import { collectFrontendIssues, issuesJiraCsv, issuesJson, issuesMarkdown, type FrontendIssue } from './frontendIssues.js';
import { enrichFlowResult, injectReportEnhancements, type IssueFiles } from './deepDive.js';

/** A metrics destination that is used when its CLI parameters are provided. */
export interface Reporter {
  condition: () => boolean;
  action: (flowResult: LH.FlowResult) => Promise<void>;
  errorMessage: string;
}

const reportsDirectory = './reports';
const errorReportsDirectory = './reports/errors';

// Generate timestamp if includeTimestamp parameter is true
const generateTimestamp = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
};

const getReportFileName = (baseName: string, extension: string): string => {
  if (params.includeTimestamp) {
    const timestamp = generateTimestamp();
    return `${baseName}_${timestamp}.${extension}`;
  }
  return `${baseName}.${extension}`;
};

const reportPath = path.join(reportsDirectory, getReportFileName('user-flow.report', 'html'));
const reportPathJson = path.join(reportsDirectory, getReportFileName('user-flow.report', 'json'));

/** Dumps the page's current HTML to `./reports/errors/<step>_<timestamp>.html` and returns the file path. */
export async function saveHTMLSource(page: { content(): Promise<string> }, stepName: string): Promise<string> {
  await fs.mkdir(reportsDirectory, { recursive: true });
  await fs.mkdir(errorReportsDirectory, { recursive: true });
  const htmlContent = await page.content();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const htmlFileName = `${stepName.replace(/\s+/g, '_')}_${timestamp}.html`;
  const htmlFilePath = path.join(errorReportsDirectory, htmlFileName);

  await fs.mkdir(errorReportsDirectory, { recursive: true });
  await fs.writeFile(htmlFilePath, htmlContent);
  return htmlFilePath;
}

export default class CreateReport {
  reporters: Reporter[];

  constructor() {
    this.reporters = [
      {
        condition: () => Boolean(params.ddHost && params.ddKey),
        action: (flowResult) => sendMetricsToDD(params.ddHost!, params.ddKey!, flowResult),
        errorMessage: "[REPORT] Datadog API host or API key not provided. Skipping sending metrics"
      },
      {
        condition: () => Boolean(params.teamsWebhook),
        action: (flowResult) => sendMetricsToTeams(params.teamsWebhook!, flowResult),
        errorMessage: "[REPORT] Teams Webhook URL not provided. Skipping sending metrics"
      },
      {
        condition: () => Boolean(params.slackWebhook),
        action: (flowResult) => sendMetricsToSlack(params.slackWebhook!, flowResult),
        errorMessage: "[REPORT] Slack Webhook URL not provided. Skipping sending metrics"
      },
      {
        condition: () => Boolean(params.teamsWorkflow),
        action: (flowResult) => sendMetricsToTeamsWorkflow(params.teamsWorkflow!, flowResult),
        errorMessage: "[REPORT] Teams Workflow URL not provided. Skipping sending metrics"
      },
      {
        condition: () => Boolean(params.influxUrl && params.influxUsername && params.influxPassword && params.influxDatabase),
        action: (flowResult) => sendMetricsToInfluxV1(params.influxUrl!, params.influxUsername!, params.influxPassword!, params.influxDatabase!, flowResult),
        errorMessage: "[REPORT] InfluxDB_V1 configuration not provided. Skipping sending metrics"
      },
      {
        condition: () => Boolean(params.influxUrl && params.influxToken && params.influxOrg && params.influxBucket),
        action: (flowResult) => sendMetricsToInfluxV2(params.influxUrl!, params.influxToken!, params.influxOrg!, params.influxBucket!, flowResult),
        errorMessage: "[REPORT] InfluxDB_V2 configuration not provided. Skipping sending metrics"
      },
      {
        condition: () => params.generateCSV,
        action: (flowResult) => sendMetricsToCSV(flowResult),
        errorMessage: "[REPORT] CSV generation disabled. Use --generatecsv=true to enable CSV report generation"
      }
    ];
  }

  /**
   * Audits the flow once, adds the deep-dive audits ("Issues for frontend developers", "Web Vitals at a
   * glance") to the Custom Metrics category, writes the HTML + JSON reports and the issue files to
   * `./reports/` (plus DevTools traces with `--saveTraces=true`), then sends metrics to every configured reporter.
   */
  async createReports(flow: UserFlow): Promise<void> {
    await fs.mkdir(reportsDirectory, { recursive: true });
    logger.debug(`[REPORT] Reports directory ensured at ${reportsDirectory}`);

    const flowResult = await flow.createFlowResult();

    // Deep-dive additions are best effort: a failure here must never cost the standard reports.
    let issues: FrontendIssue[] = [];
    let issueFiles: IssueFiles | undefined = {
      markdown: getReportFileName('frontend-issues', 'md'),
      json: getReportFileName('frontend-issues', 'json'),
      jiraCsv: getReportFileName('frontend-issues', 'jira.csv'),
    };
    try {
      issues = collectFrontendIssues(flowResult);
      enrichFlowResult(flowResult, issues, issueFiles);
      await writeIssueFiles(issues, flowResult, issueFiles);
    } catch (error) {
      logger.error(`[REPORT] Could not build the issues for developers: ${(error as Error).stack ?? error}`);
      issueFiles = undefined;
    }

    let traces: string[] = [];
    if (params.saveTraces) {
      try {
        traces = await saveTraces(flow);
      } catch (error) {
        logger.error(`[REPORT] Could not save the DevTools traces: ${(error as Error).message}`);
      }
    }

    let reportHTML = generateReport(flowResult, 'html');
    const reportJSON = JSON.stringify(flowResult, null, 2);

    // Clickable full-width charts (waterfall + deep-dive) and the links panel
    reportHTML = injectReportEnhancements(reportHTML, {
      issueCounts: { P1: count(issues, 'P1'), P2: count(issues, 'P2'), P3: count(issues, 'P3') },
      files: issueFiles,
      traces,
    });

    await fs.writeFile(reportPath, reportHTML);
    await fs.writeFile(reportPathJson, reportJSON);

    logger.debug(`[REPORT] HTML path: ${reportPath}`);
    logger.debug(`[REPORT] JSON path: ${reportPathJson}`);
    if (issueFiles) logger.debug(`[REPORT] Issues for developers (${issues.length}): ${path.join(reportsDirectory, issueFiles.markdown)}`);

    await this.sendReports(flowResult);
  }

  async sendReports(flowResult: LH.FlowResult): Promise<void> {
    for (const reporter of this.reporters) {
      if (reporter.condition()) {
        await reporter.action(flowResult);
      } else {
        logger.debug(reporter.errorMessage);
      }
    }
  }
}

const count = (issues: FrontendIssue[], priority: FrontendIssue['priority']) => issues.filter(i => i.priority === priority).length;

/** Writes the issues as Markdown, JSON and Jira CSV next to the HTML report. */
async function writeIssueFiles(issues: FrontendIssue[], flowResult: LH.FlowResult, files: IssueFiles): Promise<void> {
  const now = new Date();
  await fs.writeFile(path.join(reportsDirectory, files.markdown), issuesMarkdown(issues, flowResult, now));
  await fs.writeFile(path.join(reportsDirectory, files.json), issuesJson(issues, flowResult, now));
  await fs.writeFile(path.join(reportsDirectory, files.jiraCsv), issuesJiraCsv(issues));
}

/**
 * Saves the trace of every navigation/timespan step to `./reports/traces/` so it can be opened in the
 * DevTools Performance panel ("Load profile"). Returns paths relative to the reports directory.
 */
async function saveTraces(flow: UserFlow): Promise<string[]> {
  const dirName = params.includeTimestamp ? `traces_${generateTimestamp()}` : 'traces';
  const dir = path.join(reportsDirectory, dirName);
  await fs.mkdir(dir, { recursive: true });
  const saved: string[] = [];
  const { gatherSteps } = flow.createArtifactsJson();
  for (const [index, step] of gatherSteps.entries()) {
    const trace = step.artifacts.Trace as LH.Trace | undefined;
    if (!trace?.traceEvents?.length) continue;
    const name = `${String(index + 1).padStart(2, '0')}-${(step.flags?.name ?? 'step').replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 80)}.json`;
    await fs.writeFile(path.join(dir, name), JSON.stringify(trace));
    saved.push(`${dirName}/${name}`);
  }
  logger.debug(`[REPORT] ${saved.length} DevTools trace(s) saved to ${dir}`);
  return saved;
}
