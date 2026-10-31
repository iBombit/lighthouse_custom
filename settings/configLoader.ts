import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type * as LH from 'lighthouse/types/lh.js';
import logger from '../logger/logger.js';
import { configFilePath, jsProfiling } from './testParams.js';
import { Desktop, Mobile, Mobile3G, Mobile4G, Mobile4G_Slow, type DeviceProfile } from './constants.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Puppeteer launch arguments that can be provided in the custom config file. */
export interface BrowserArgsConfig {
  headless?: string[];
  headful?: string[];
}

/** Framework-only keys accepted inside `settings` of the custom config file (stripped before reaching Lighthouse). */
export interface FrameworkSettings {
  browserArgs?: BrowserArgsConfig;
  onlyCategories?: string[] | null;
}

/** Shape of the JSON file passed with `--configFile`: a Lighthouse config plus framework-only settings. */
export interface CustomConfigFile extends Omit<LH.Config, 'settings'> {
  settings?: LH.SharedFlagsSettings & FrameworkSettings;
}

/** Lighthouse config built by the framework. `name` is informational only (Lighthouse ignores it). */
export type FrameworkLighthouseConfig = LH.Config & { name?: string };

/** Id of the framework's category of custom audits (called `server-side` before 2.0.0). */
export const CUSTOM_CATEGORY_ID = 'custom-metrics';
/** Former id, still accepted in `settings.onlyCategories`. */
export const LEGACY_CUSTOM_CATEGORY_ID = 'server-side';

/** Trace category with V8 JavaScript samples (off by default in Lighthouse; enabled by `--jsProfiling=true`). */
export const JS_PROFILING_TRACE_CATEGORY = 'disabled-by-default-v8.cpu_profiler';

let browserConfig: CustomConfigFile | null = null;
let customOnlyCategories: string[] | null = null;
let configCategories: Record<string, LH.Config.CategoryJson> | null = null;

/**
 * Load custom config file from testParams or default location
 * @returns Config object, an empty object if the file can't be parsed, or null when no file is configured
 */
export function loadCustomConfig(): CustomConfigFile | null {
  try {
    if (configFilePath && fs.existsSync(configFilePath)) {
      const configContent = fs.readFileSync(path.resolve(configFilePath), 'utf-8');
      browserConfig = JSON.parse(configContent) as CustomConfigFile;
      return browserConfig;
    }
  } catch (error) {
    logger.warn(`Could not load custom config: ${(error as Error).message}`);
    browserConfig = {};
  }

  return browserConfig;
}

/**
 * Get browser args from config based on headless mode
 * @param isHeadless - Whether browser runs in headless mode
 * @returns Array of browser arguments (empty when the config doesn't define them)
 */
export function getBrowserArgsFromCustomConfig(isHeadless = true): string[] {
  const config = loadCustomConfig();
  const browserArgs = config?.settings?.browserArgs;

  if (!browserArgs) {
    return [];
  }

  const argType = isHeadless ? 'headless' : 'headful';
  const args = browserArgs[argType];
  return Array.isArray(args) ? args : [];
}

/**
 * Absolute path of a custom audit/gatherer module shipped with this package.
 * Lighthouse `import()`s these paths, so they always point at the very same
 * build of the framework that created the config.
 */
function frameworkModulePath(...segments: string[]): string {
  return path.join(__dirname, ...segments);
}

/**
 * Create base lighthouse config for a device
 * @param device - Device configuration object
 * @returns Base lighthouse configuration
 */
function createBaseLighthouseConfig(device: DeviceProfile): FrameworkLighthouseConfig {
  return {
    extends: 'lighthouse:default',
    name: device.lighthouseReportName,
    settings: {
      throttling: {
        rttMs: device.rttMs,
        throughputKbps: device.throughputKbps,
        cpuSlowdownMultiplier: device.cpuSlowdownMultiplier,
        requestLatencyMs: device.requestLatencyMs,
        downloadThroughputKbps: device.downloadThroughputKbps,
        uploadThroughputKbps: device.uploadThroughputKbps,
      },
      throttlingMethod: device.throttlingMethod,
      screenEmulation: {
        mobile: device.screenEmulationMobile,
        width: device.screenWidth,
        height: device.screenHeight,
        deviceScaleFactor: device.deviceScaleFactor,
        disabled: device.screenEmulationDisabled,
      },
      formFactor: device.formFactor,
      // JavaScript samples for the "JavaScript hot spots" audit. Off by default: sampling adds overhead.
      ...(jsProfiling ? { additionalTraceCategories: JS_PROFILING_TRACE_CATEGORY } : {}),
    },
    artifacts: [
      { id: 'MemoryProfile', gatherer: frameworkModulePath('gatherers', 'memory-gatherer.js') },
      { id: 'SelectorTiming', gatherer: frameworkModulePath('gatherers', 'selector-timing-gatherer.js') },
      { id: 'NetworkRequestBodies', gatherer: frameworkModulePath('gatherers', 'network-request-bodies-gatherer.js') },
    ],
    audits: [
      frameworkModulePath('audits', 'network-longest-first-party.js'),
      frameworkModulePath('audits', 'network-slowest-request.js'),
      frameworkModulePath('audits', 'memory-audit.js'),
      frameworkModulePath('audits', 'network-requests.js'),
      frameworkModulePath('audits', 'network-waterfall.js'),
      frameworkModulePath('audits', 'network-server-latency.js'),
      frameworkModulePath('audits', 'main-thread-tasks.js'),
      frameworkModulePath('audits', 'final-screenshot.js'),
      frameworkModulePath('audits', 'selector-timing-audit.js'),
      frameworkModulePath('audits', 'enhanced-screenshot-thumbnails.js'),
      frameworkModulePath('audits', 'network-xhr-audit.js'),
      frameworkModulePath('audits', 'xhr-count-audit.js'),
      frameworkModulePath('audits', 'tbt-breakdown.js'),
      frameworkModulePath('audits', 'main-thread-timeline.js'),
      frameworkModulePath('audits', 'js-hotspots.js'),
    ],
    groups: {
      'custom-main-thread': {
        title: 'Main thread & Total Blocking Time',
        description: 'Where Total Blocking Time comes from (long tasks, scripts, functions) and what the main thread was busy with.',
      },
      'custom-network': {
        title: 'Network & server',
        description: 'Requests, API / XHR timing, the request waterfall and server latency.',
      },
      'custom-page': {
        title: 'Rendering, screenshots & memory',
        description: 'Visual progress, page-validation timing and JavaScript memory.',
      },
    },
    categories: {
      [CUSTOM_CATEGORY_ID]: {
        title: 'Custom Metrics',
        description: "The framework's own audits: issues for frontend developers, Web Vitals at a glance, a Total Blocking Time " +
          'drill-down with main-thread activity (DevTools-style charts), API / network timing, screenshots, memory and page-validation ' +
          'timing. The score averages the network, screenshot and page-validation audits; the main-thread, memory and overview ' +
          "audits are for analysis and don't change it.",
        supportedModes: ['navigation', 'timespan'],
        auditRefs: [
          // "Issues for frontend developers" and "Web Vitals at a glance" are added on top when reports are created.
          { id: 'tbt-breakdown', weight: 0, group: 'custom-main-thread', acronym: 'TBT' },
          { id: 'main-thread-timeline', weight: 0, group: 'custom-main-thread' },
          { id: 'js-hotspots', weight: 0, group: 'custom-main-thread' },
          { id: 'main-thread-tasks', weight: 0, group: 'custom-main-thread' },
          { id: 'mainthread-work-breakdown', weight: 0, group: 'custom-main-thread' },
          { id: 'longest-first-party-request', weight: 1, group: 'custom-network', acronym: 'FPA' },
          { id: 'slowest-network-request', weight: 1, group: 'custom-network', acronym: 'FPA' },
          { id: 'network-requests', weight: 1, group: 'custom-network', acronym: 'NR' },
          { id: 'network-waterfall', weight: 0, group: 'custom-network' },
          { id: 'network-rtt', weight: 0, group: 'custom-network', acronym: 'RTT' },
          { id: 'network-server-latency', weight: 1, group: 'custom-network', acronym: 'SBL' },
          { id: 'network-xhr-audit', weight: 1, group: 'custom-network', acronym: 'XHR' },
          { id: 'xhr-count-audit', weight: 1, group: 'custom-network', acronym: 'XHC' },
          { id: 'final-screenshot', weight: 1, group: 'custom-page', acronym: 'FS' },
          { id: 'enhanced-screenshot-thumbnails', weight: 0, group: 'custom-page' },
          { id: 'selector-timing-audit', weight: 1, group: 'custom-page', acronym: 'STV' },
          { id: 'memory-audit', weight: 0, group: 'custom-page' },
        ],
      },
    },
  };
}

/**
 * Get lighthouse config by browser type, merging with custom config if available
 * @param browserType - Browser type (desktop, mobile, mobile3G, mobile4G, mobile4GSlow); unknown values fall back to desktop
 * @returns Merged lighthouse configuration
 */
export function getLighthouseConfigByBrowserType(browserType: string): FrameworkLighthouseConfig {
  const deviceMap: Partial<Record<string, DeviceProfile>> = {
    desktop: new Desktop(),
    mobile: new Mobile(),
    mobile3G: new Mobile3G(),
    mobile4G: new Mobile4G(),
    mobile4GSlow: new Mobile4G_Slow(),
  };

  const baseConfig = createBaseLighthouseConfig(deviceMap[browserType] || new Desktop());

  // Try to load and merge custom config file (if specified)
  if (configFilePath) {
    try {
      const customConfig = JSON.parse(fs.readFileSync(path.resolve(configFilePath), 'utf-8')) as CustomConfigFile;

      // Extract non-lighthouse settings and onlyCategories before merging
      const { browserArgs: _browserArgs, onlyCategories, ...lighthouseSettings } = customConfig.settings || {};

      // Store onlyCategories separately — applied per-step in browser.ts
      // to avoid conflicts with snapshot mode (which filters categories by gather mode
      // before checking onlyCategories, causing "unrecognized category" errors)
      customOnlyCategories = onlyCategories || null;

      const mergedConfig: FrameworkLighthouseConfig = {
        ...baseConfig,
        ...customConfig,
        settings: {
          ...baseConfig.settings,
          ...lighthouseSettings,
        },
        // Groups are additive: the framework's audit refs need their groups even when the file defines more.
        ...(customConfig.groups ? { groups: { ...baseConfig.groups, ...customConfig.groups } } : {}),
      };

      // `server-side` was renamed to `custom-metrics`, and Lighthouse rejects unknown ids in onlyCategories.
      if (customOnlyCategories?.includes(LEGACY_CUSTOM_CATEGORY_ID) && !mergedConfig.categories?.[LEGACY_CUSTOM_CATEGORY_ID] &&
          mergedConfig.categories?.[CUSTOM_CATEGORY_ID]) {
        logger.warn(`[CONFIG] onlyCategories: '${LEGACY_CUSTOM_CATEGORY_ID}' is now '${CUSTOM_CATEGORY_ID}' (Custom Metrics); using '${CUSTOM_CATEGORY_ID}'.`);
        customOnlyCategories = [...new Set(customOnlyCategories.map(id => (id === LEGACY_CUSTOM_CATEGORY_ID ? CUSTOM_CATEGORY_ID : id)))];
      }

      // Store category definitions for mode-aware filtering
      configCategories = mergedConfig.categories || baseConfig.categories || null;

      return mergedConfig;
    } catch (error) {
      logger.error(`Failed to load custom config file: ${(error as Error).message}`);
      return baseConfig; // Fallback to base config if error occurs
    }
  }

  return baseConfig; // Default config if no custom file is provided
}

/**
 * Get onlyCategories from custom config (if specified)
 * Used by browser.ts to apply per-step category filtering for navigation/timespan steps
 * @returns Array of category IDs or null
 */
export function getOnlyCategories(): string[] | null {
  return customOnlyCategories;
}

/**
 * Get onlyCategories filtered for a specific gather mode.
 * Removes categories whose supportedModes don't include the given mode.
 * @param mode - Gather mode ('navigation', 'timespan', 'snapshot')
 * @returns Filtered array of category IDs or null
 */
export function getOnlyCategoriesForMode(mode: LH.Gatherer.GatherMode): string[] | null {
  if (!customOnlyCategories) return null;
  if (!configCategories) return customOnlyCategories;

  const categories = configCategories;
  const filtered = customOnlyCategories.filter(categoryId => {
    const category = categories[categoryId];
    // If category is not in our config (e.g. a default LH category), keep it
    if (!category) return true;
    // If no supportedModes defined, category supports all modes
    if (!category.supportedModes) return true;
    return category.supportedModes.includes(mode);
  });

  return filtered.length ? filtered : null;
}
