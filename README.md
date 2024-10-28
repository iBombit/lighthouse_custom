# settings

## settings/browser.js

The `settings/browser.js` file provides configuration settings for different browser types.

**Browser**

- **Properties**:
  - `os`: Operating system.
  - `browserLocation`: Location of the browser executable.

**Methods**

- `constructor`: Initializes the browser with the operating system.
- `headlessDesktop`: Returns configuration for a headless desktop browser.
- `headfulDesktop`: Returns configuration for a headful desktop browser.
- `headlessMobile`: Returns configuration for a headless mobile browser.
- `headfulMobile`: Returns configuration for a headful mobile browser.

## settings/constants.js

The `settings/constants.js` file contains constants for desktop and mobile configurations.

**Classes**

- **Desktop**: Configuration for desktop environments.
- **Mobile**: Configuration for mobile environments.
- **Mobile3G**: Configuration for mobile environments with 3G connectivity.
- **Mobile4G**: Configuration for mobile environments with 4G connectivity.
- **Mobile4G_Slow**: Configuration for mobile environments with slow 4G connectivity.
- **BrowserLocations**: Determines the browser executable location based on the operating system.

**Constants**

- **myRelevantAudits**: Array of relevant audit paths.

## settings/lighthouse.js

The `settings/lighthouse.js` file provides Lighthouse configuration settings for different device types.

**Configurations**

- **configDesktop**: Lighthouse configuration for desktop.
- **configMobile**: Lighthouse configuration for mobile.
- **configMobile3G**: Lighthouse configuration for mobile with 3G connectivity.
- **configMobile4G**: Lighthouse configuration for mobile with 4G connectivity.
- **configMobile4GSlow**: Lighthouse configuration for mobile with slow 4G connectivity.

**Functions**

- **createBaseConfig**: Creates a base Lighthouse configuration for a given device.

## settings/mochaHooks.js

The `settings/mochaHooks.js` file provides hooks for Mocha tests.

**Hooks**

- **beforeHook**: Sets up the browser before tests.
- **beforeEachHook**: Checks if the previous flow finished successfully before each test.
- **afterEachHook**: Logs the end of each test.
- **afterHook**: Generates reports and closes the browser after all tests.
- **getCurrentDate**: Returns the current date in a specific format.

## settings/testParams.js

The `settings/testParams.js` file processes command-line arguments and sets up the browser instance.

**Variables**

- **browserInstance**: Singleton instance of the browser.
- **uploadDir**: Directory for file uploads.
- **testTime**: Test timeout (default is 2 minutes).
- **headless**: Boolean indicating if the browser should run in headless mode.
- **browserType**: Type of browser (desktop/mobile/mobile3G/mobile4G/mobile4GSlow).
- **login**: Login credentials.
- **password**: Password credentials.
- **url**: URL to be tested.
- **browserLocation**: Location of the browser executable.
- **ddHost**: Datadog host.
- **ddKey**: Datadog API key.
- **teamsWebhook**: Teams webhook URL.
- **slackWebhook**: Slack webhook URL.
- **githubRunUrl**: GitHub run URL.
- **testName**: Name of the test.

**Functions**

- **setupBrowser**: Initializes and starts the browser instance.
- **getBrowserInstance**: Returns the browser instance if it has been initialized.
- **processArgs**: Processes command-line arguments to set the configuration variables.