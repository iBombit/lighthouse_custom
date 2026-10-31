# 🧩 core

Puppeteer + Lighthouse browser automation layer. Manages browser lifecycle, page objects, and UI element interactions.

Import paths: `lh-pptr-framework/core/browser.js`, `lh-pptr-framework/core/page.js`, `lh-pptr-framework/core/elements/<name>.js`.

---

## core/browser.ts

Orchestrates the Puppeteer browser instance and Lighthouse user flows.

**LighthouseBrowser** (default export)

- **`DEFAULT_TIMEOUT`** — 30 000 ms
- **Constructor**: `new LighthouseBrowser(browserType = 'desktop', headless = false, browserLocation = os.type())`
- **Properties**: `browser` · `page` · `flow` · `browserType` · `headless` · `browserLocation`

| Method | Purpose |
|--------|---------|
| `init()` | Launches Puppeteer with the correct device profile (desktop / mobile variants) |
| `start()` | Opens a new page and starts (or updates) the Lighthouse flow |
| `restartBrowser(pages)` | Kills & relaunches the browser — used for long tests (>20 steps) to avoid OOM |
| `startNewLighthouseFlow()` | Creates a new `startFlow()` with the device-specific Lighthouse config |
| `updateLighthouseFlow()` | Points the existing flow at the new page after restart |
| `getNewPageWhenLoaded()` | Resolves when a newly opened tab finishes loading |
| `navigation(name, link, pages)` | Warm navigation — keeps storage, measures with Lighthouse |
| `customNavigation(stepName, actions, pages)` | Wraps arbitrary actions between `startNavigation` / `endNavigation` |
| `timespan(stepName, actions)` | Wraps actions in a Lighthouse timespan measurement |
| `snapshot(flags)` | Lighthouse snapshot of the current page state |
| `goToPage(link, timeout)` | Simple Puppeteer navigation + `waitTillRendered` |
| `waitTillRendered(timeout)` | Polls HTML size until stable (3 consecutive identical readings) |
| `closeBrowser()` | Graceful shutdown |

Exported types: `BrowserType` (`'desktop' | 'mobile' | 'mobile3G' | 'mobile4G' | 'mobile4GSlow'`).

---

## core/page.ts

Base page-object class. Extend it per page in your test suite.

**Page** (default export)

- **`baseUrl`** — static, set from `--url` CLI param
- **Properties**: `path` · `p` (Puppeteer page or frame, set by `init`) · `pageValidate` (optional `Element`)

| Method | Purpose |
|--------|---------|
| `init(page)` | Binds the Puppeteer page (or frame) instance |
| `navigation(browser, testContext, link, pages)` | Warm navigation with Lighthouse measurement |
| `navigationValidate(browser, testContext, link, pages)` | Custom navigation that waits for a `pageValidate` element, stores selector timing, and takes a success/failure snapshot |
| `openURL(browser, link, timeout)` | Simple go-to without Lighthouse measurement |
| `setPath(path)` / `getURL()` | Path helpers — builds full URL from `baseUrl + path` |

---

## core/elements/

Reusable UI element wrappers around Puppeteer handles. Supports CSS and XPath locators
(locators starting with `/`, `./` or `(` are XPath).

### Element (base class)

- **`DEFAULT_TIMEOUT`** — 60 000 ms
- **Constructor**: `new Element(locator, page)` — `page` is a Puppeteer page or frame
- **Properties**: `locator` · `originalLocator` · `element` · `locatorType` · `page`

| Method | Purpose |
|--------|---------|
| `find(timeout)` | Waits for the element to appear |
| `findHidden(timeout)` | Waits for a hidden element |
| `findFromList(timeout, index)` | Picks an element from a list by index (CSS only) |
| `hover()` | Hovers over the element |
| `count()` | Returns the number of matches |
| `replace(data)` | Replaces every `%` in the original locator with `data` (chainable) |

### Button `extends Element`

| Method | Purpose |
|--------|---------|
| `click()` | Standard Puppeteer click |
| `jsClick()` | Click via `evaluate()` |
| `jsClickHidden()` | Click a hidden element via JS |
| `doubleClick()` | Double-click |
| `rightClick()` | Context-menu click |
| `clickIfAvailable()` | Clicks if the element exists, silently continues otherwise |
| `clickAndHold(timeout, holdTime)` | Mouse-down for `holdTime` ms (default 2000) |

### TextField `extends Button`

Inherits all Button + Element methods, plus:

| Method | Purpose |
|--------|---------|
| `type(text)` | Types into the field |
| `clear()` | Clears the field |

### Dropdown `extends Element`

| Method | Purpose |
|--------|---------|
| `selectRandom()` | Picks a random option |
| `selectNthOption(index)` | Picks option by index |
| `selectOptionByValue(value)` | Picks option by value |

### Iframe `extends Element`

| Method | Purpose |
|--------|---------|
| `createIframe()` | Returns the iframe's content frame from the selector |

### UploadField `extends Element`

| Method | Purpose |
|--------|---------|
| `upload(filePath)` | Uploads a file |
| `uploadHidden(filePath)` | Uploads via a hidden input |

All element actions (except `clickIfAvailable`) mark the page as failed (`page.isSuccess = false`) and rethrow
on error; the Mocha `beforeEach` hook then skips the following tests.

---

## core/types.ts

Shared types: `TrackedPage` / `TrackedFrame` / `PageContext` (Puppeteer page or frame with the `isSuccess` flag),
`TestContextLike`, `ReinitializablePage`, `StepActions`.
