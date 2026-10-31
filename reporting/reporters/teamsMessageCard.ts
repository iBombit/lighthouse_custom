import type * as LH from 'lighthouse/types/lh.js';
import * as params from '../../settings/testParams.js';

const performanceAuditsTeams = [
  'first-contentful-paint',
  'speed-index',
  'interactive',
  'interaction-to-next-paint',
  'total-blocking-time',
  'largest-contentful-paint',
  'cumulative-layout-shift',
  'mainthread-work-breakdown',
  'network-requests'
];

const auditNames: Record<string, string> = {
  'first-contentful-paint': 'FCP',
  'speed-index': 'SI',
  'interactive': 'TTI',
  'interaction-to-next-paint': 'INP',
  'total-blocking-time': 'TBT',
  'largest-contentful-paint': 'LCP',
  'cumulative-layout-shift': 'CLS',
  'mainthread-work-breakdown': 'JS time',
  'network-requests': 'API time',
};

/** Legacy Office 365 connector card with a markdown table of per-step metrics. */
export interface TeamsMessageCard {
  '@type': 'MessageCard';
  '@context': 'http://schema.org/extensions';
  summary: string;
  text: string;
}

/**
 * Builds the MessageCard posted by both Teams reporters (incoming webhook and Workflow):
 * environment/region/CI header plus one table row per step with a non-zero performance score.
 */
export function buildTeamsMessageCard(flowResult: LH.FlowResult): TeamsMessageCard {
  const text = "**UI Performance test notification**" + "\n\n"
             + `Environment: ${params.url}` + "\n\n"
             + `Region: ${params.regions}` + "\n\n"
             + `CI link: ${params.ciUrl}`;

  const tableHeader = "| Step | Score | " + performanceAuditsTeams.map(audit => auditNames[audit]).join(" | ") + " |";
  const tableDivider = "| --- | --- | " + performanceAuditsTeams.map(() => "---").join(" | ") + " |";

  const rows = flowResult.steps.map(step => {
    const performanceScore = Math.round(step.lhr.categories.performance.score! * 100);

    const row = `| ${step.name} | ${performanceScore} | ` + performanceAuditsTeams.map(audit => {
      const numericValue = step.lhr.audits[audit]?.numericValue;
      if (numericValue != null) {
        return audit === 'cumulative-layout-shift' ? numericValue.toFixed(2) : Math.round(numericValue);
      }
      return '-';
    }).join(" | ") + " |";
    if (performanceScore != 0)
      return row;
    return undefined;
  }).filter(row => row !== undefined);

  return {
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    "summary": "Performance Metrics",
    "text": text + "\n\n" + tableHeader + "\n" + tableDivider + "\n" + rows.join('\n')
  };
}
