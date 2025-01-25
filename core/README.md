# core

## core/browser.js

The `core/browser.js` file is a core component of the UI framework, responsible for managing the browser instance and orchestrating Lighthouse flows.

**LighthouseBrowser**

- **Static Property**: `DEFAULT_TIMEOUT` - Default timeout for operations (30 seconds).
- **Properties**:
  - `browser`: Puppeteer browser instance.
  - `page`: Puppeteer page instance.
  - `flow`: Lighthouse flow instance.
  - `browserType`: Type of browser (desktop, mobile, etc.).
  - `headless`: Boolean indicating if the browser should run in headless mode.
  - `browserLocation`: Location of the browser executable.

**Methods**

- `constructor`: Initializes the browser type, headless mode, and browser location.
- `init`: Launches the browser based on the specified type and mode.
- `start`: Opens a new page and starts or updates the Lighthouse flow.
- `restartBrowser`: Closes and reopens the browser, used rarely for long tests >20 steps when we hit OOM error.
- `startNewLighthouseFlow`: Starts a new Lighthouse flow with the appropriate configuration.
- `updateLighthouseFlow`: Updates the existing Lighthouse flow with the new page.
- `getNewPageWhenLoaded`: Returns a promise that resolves when a new page is fully loaded.
- `coldNavigation`: Navigates to a URL and waits for the page to be fully rendered.
- `warmNavigation`: Navigates to a URL without resetting storage and waits for the page to be fully rendered.
- `timespan`: Measures the time taken for a series of actions.
- `goToPage`: Navigates to a URL and waits for the page to be fully rendered.
- `waitTillRendered`: Waits until the page is fully rendered by checking the HTML size.
- `closeBrowser`: Closes the browser instance.

## core/page.js

The `core/page.js` file is another essential component of the UI framework, responsible for managing page interactions and navigation.

**Page**

- **Static Property**: `baseUrl` - Base URL for the application.
- **Properties**:
  - `path`: Path for the specific page.
  - `p`: Puppeteer page instance.

**Methods**

- `constructor`: Initializes the page path.
- `init`: Initializes the Puppeteer page instance.
- `btn`: Registers a button element.
- `input`: Registers a text field element.
- `upload`: Registers an upload field element.
- `coldNavigation`: Performs a cold navigation to a specified URL.
- `warmNavigation`: Performs a warm navigation to a specified URL.
- `openURL`: Opens a specified URL.
- `setPath`: Sets the path for the page.
- `getURL`: Constructs the full URL for the page.
- `close`: Closes the Puppeteer page instance.

## core/elements/element.js

The `core/elements/element.js` file is a fundamental part of the UI framework, responsible for managing individual elements on a web page.

**Element**

- **Static Property**: `DEFAULT_TIMEOUT` - Default timeout for operations (60 seconds).
- **Properties**:
  - `locator`: Locator for the element.
  - `element`: Puppeteer element handle.
  - `locatorType`: Type of locator (CSS or XPath).

**Methods**

- `constructor`: Initializes the element with a locator and page instance.
- `find`: Finds the element on the page with a timeout.
- `hover`: Hovers over the element.
- `findFromList`: Finds an element from a list based on the index.
- `findHidden`: Finds a hidden element on the page with a timeout.
- `count`: Counts the number of elements matching the locator.
- `replace`: Replaces placeholders in the locator with actual data.

## core/elements/button.js

The `core/elements/button.js` file extends the `Element` class to provide specific actions for button elements.

**Button**

- **Properties**:
  - `page`: Puppeteer page instance.

**Methods**

- `constructor`: Initializes the button with a locator and page instance.
- `jsClick`: Clicks on the button using JavaScript.
- `jsClickHidden`: Clicks on a hidden button using JavaScript.
- `click`: Clicks on the button using Puppeteer.
- `doubleClick`: Double-clicks on the button using Puppeteer.
- `rightClick`: Right-clicks on the button using Puppeteer.
- `clickIfAvailable`: Clicks on the button if it is available, proceeds the execution if element is not available.
- `clickAndHold`: Clicks and holds the button for a specified duration.

## core/elements/textField.js

The `core/elements/textField.js` file extends the `Button` class to provide specific actions for text field elements. As the result, text fields can be also treated as `Element` or `Button`.

**TextField**

- **Properties**:
  - `page`: Puppeteer page instance.

**Methods**

- `constructor`: Initializes the text field with a locator and page instance.
- `type`: Types text into the text field.
- `clear`: Clears the text field.

## core/elements/dropdown.js

The `core/elements/dropdown.js` file extends the `Element` class to provide specific actions for dropdown elements.

**Dropdown**

- **Properties**:
  - `page`: Puppeteer page instance.

**Methods**

- `constructor`: Initializes the dropdown with a locator and page instance.
- `selectRandom`: Selects a random option from the dropdown.
- `selectNthOption`: Selects a specific option from the dropdown by index.

## core/elements/iframe.js

The `core/elements/iframe.js` file extends the `Element` class to provide specific actions for iframe elements.

**Iframe**

- **Properties**:
  - `page`: Puppeteer page instance.

**Methods**

- `constructor`: Initializes the iframe with a locator and page instance.
- `createIframe`: Creates an iframe from selector.

## core/elements/uploadField.js

The `core/elements/uploadField.js` file extends the `Element` class to provide specific actions for file upload elements.

**UploadField**

- **Properties**:
  - `page`: Puppeteer page instance.

**Methods**

- `constructor`: Initializes the upload field with a locator and page instance.
- `upload`: Uploads a file to the specified path.
- `uploadHidden`: Uploads a file to a hidden element.
