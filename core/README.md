# 🧩 core

Puppeteer + Lighthouse browser automation layer. Manages browser lifecycle, page objects, and UI element interactions.

---

## core/browser.js

Orchestrates the Puppeteer browser instance and Lighthouse user flows.

**LighthouseBrowser**

- **`DEFAULT_TIMEOUT`** — 30 000 ms
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
| `goToPage(link, timeout)` | Simple Puppeteer navigation + `waitTillRendered` |
| `waitTillRendered(timeout)` | Polls HTML size until stable (3 consecutive identical readings) |
| `closeBrowser()` | Graceful shutdown |

---

## core/page.js

Base page-object class. Extend it per page in your test suite.

**Page**

- **`baseUrl`** — static, set from `--url` CLI param
- **Properties**: `path` · `p` (Puppeteer page handle)

| Method | Purpose |
|--------|---------|
| `init(page)` | Binds the Puppeteer page instance |
| `navigation(browser, testContext, link, pages)` | Warm navigation with Lighthouse measurement |
| `navigationValidate(browser, testContext, link, pages)` | Custom navigation that waits for a `pageValidate` element, stores selector timing, and takes a success/failure snapshot |
| `openURL(browser, link, timeout)` | Simple go-to without Lighthouse measurement |
| `setPath(path)` / `getURL()` | Path helpers — builds full URL from `baseUrl + path` |

---

## core/elements/

Reusable UI element wrappers around Puppeteer handles. Supports CSS and XPath locators.

### Element (base class)

- **`DEFAULT_TIMEOUT`** — 60 000 ms
- **Properties**: `locator` · `element` · `locatorType`

| Method | Purpose |
|--------|---------|
| `find(timeout)` | Waits for the element to appear |
| `findHidden(timeout)` | Waits for a hidden element |
| `findFromList(index)` | Picks an element from a list by index |
| `hover()` | Hovers over the element |
| `count()` | Returns the number of matches |
| `replace(data)` | Replaces `{placeholders}` in the locator with actual values |

### Button `extends Element`

| Method | Purpose |
|--------|---------|
| `click()` | Standard Puppeteer click |
| `jsClick()` | Click via `evaluate()` |
| `jsClickHidden()` | Click a hidden element via JS |
| `doubleClick()` | Double-click |
| `rightClick()` | Context-menu click |
| `clickIfAvailable()` | Clicks if the element exists, silently continues otherwise |
| `clickAndHold(duration)` | Mouse-down for a specified duration |

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

### Iframe `extends Element`

| Method | Purpose |
|--------|---------|
| `createIframe()` | Returns the iframe's content frame from the selector |

### UploadField `extends Element`

| Method | Purpose |
|--------|---------|
| `upload(filePath)` | Uploads a file |
| `uploadHidden(filePath)` | Uploads via a hidden input |
