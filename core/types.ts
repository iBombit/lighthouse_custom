import type { Frame, Page as PuppeteerPage } from 'puppeteer-core';

/**
 * Adds the framework's step-success flag to a Puppeteer object.
 *
 * Elements flip `isSuccess` to `false` when an action fails, and the Mocha
 * `beforeEach` hook skips the following steps while it stays `false`.
 */
export type SuccessTracked<T> = T & { isSuccess?: boolean };

/** Puppeteer page carrying the framework's step-success flag. */
export type TrackedPage = SuccessTracked<PuppeteerPage>;

/** Puppeteer frame (e.g. an iframe's content) carrying the step-success flag. */
export type TrackedFrame = SuccessTracked<Frame>;

/** Anything page objects and elements can be bound to: a top-level page or a frame. */
export type PageContext = TrackedPage | TrackedFrame;

/**
 * The subset of the Mocha test context (`this` inside `it()`) used for naming
 * Lighthouse steps after the running test.
 */
export interface TestContextLike {
  test?: { title?: string };
}

/** A page object that can be (re)bound to a fresh Puppeteer page, e.g. after a browser restart. */
export interface ReinitializablePage {
  init(page: TrackedPage): unknown;
}

/** Callback executed inside a Lighthouse navigation or timespan step. */
export type StepActions = () => unknown;
