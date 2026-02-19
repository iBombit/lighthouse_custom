# Puppeteer + Lighthouse Framework Development Guidelines

Welcome to the Puppeteer + Lighthouse framework guidelines! Follow these principles to keep your test code clean, efficient, and maintainable.

## Naming and Structure Conventions

### 1. Page Object Naming 🎯

```js
// Correct
LoginPage;
CustomerDetailsPage;

// Incorrect
login_page;
customerDetails;
```

- Use PascalCase for page classes
- The name should reflect the page's purpose
- Be consistent across all Page Objects

### 2. Business Groups and Test Cases 📊

```js
// Correct
describe('Login Flow', ...)
it('[T]_Execute_Login_Step', ...)

// Incorrect
describe('Login')
it('login', ...)
```

- Group tests by business logic, not technical details
- Use tags ([T], [N]) for reporting
- Describe steps from the user's perspective

## Configuration Management

### 3. Environment Parameters 🌍

All environment parameters should be passed via CLI.

#### Supported CLI Parameters

| Parameter         | Description                                          | Example Usage                          |
|-------------------|------------------------------------------------------|----------------------------------------|
| `browsertype`     | Specifies the browser type.                          | `--browsertype=desktop`               |
| `headless`        | Runs tests in headless mode.                         | `--headless=false`                    |
| `browserLocation` | Sets a custom browser location.                      | `--browserLocation="C:/Browser/start.exe"` |
| `login`           | Sets the login.                                      | `--login=example@email.com`           |
| `password`        | Sets the password.                                   | `--password=PASSWORD`                 |
| `url`             | Sets the host link.                                  | `--url=https://google.com`            |
| `ddhost`          | Specifies the Datadog host link (exclude 'http://'). | `--ddhost=api.datadoghq.eu`           |
| `ddkey`           | Provides the Datadog API key.                        | `--ddkey=<Your_Datadog_API_Key>`      |
| `ciurl`           | Sets the CI run URL.                                 | `--ciurl="YOUR_CI_URL"`               |
| `teamswebhook`    | Sets the Teams webhook URL.                          | `--teamswebhook="YOUR_WEBHOOK_URL"`   |
| `slackwebhook`    | Sets the Slack webhook URL.                          | `--slackwebhook="YOUR_WEBHOOK_URL"`   |
| `influxurl`       | Sets the InfluxDB URL (required for V1 and V2).       | `--influxurl=http://YOUR_IP:8086/`    |
| `influxToken`     | InfluxV2 specific. Sets the InfluxDB token.          | `--influxToken=YOUR_INFLUX_TOKEN`     |
| `influxorg`       | InfluxV2 specific. Sets the InfluxDB organization.   | `--influxorg=YOUR_ORG`                |
| `influxbucket`    | InfluxV2 specific. Sets the InfluxDB bucket.         | `--influxbucket=YOUR_BUCKET`          |
| `influxusername`  | InfluxV1 specific. Sets the InfluxDB username.       | `--influxusername=YOUR_USERNAME`      |
| `influxpassword`  | InfluxV1 specific. Sets the InfluxDB password.       | `--influxpassword=YOUR_PASSWORD`      |
| `influxdatabase`  | InfluxV1 specific. Sets the InfluxDB database.       | `--influxdatabase=YOUR_DATABASE`      |
| `configFile`      | Specifies a custom Lighthouse configuration file.    | `--configFile=path/to/config.json`    |
| `includetimestamp`| Adds timestamp to report file names (default false). | `--includetimestamp=true`             |
| `generatecsv`     | Generates CSV performance analysis report (default false). | `--generatecsv=true`              |

**Example of running a test:**

```powershell
npx mocha test/your.test.js --browsertype=desktop --headless=false --url="https://site" --login="user" --password="pass"
```

- Pass all environment parameters via CLI
- Do not hardcode values in code
- Document parameters in README.md

### 4. Lighthouse Configuration ⚙️

```json
{
  "settings": {
    "throttling": { "rttMs": 100, "throughputKbps": 15000 },
    "formFactor": "mobile",
    "screenEmulation": { "mobile": true, "width": 375, "height": 667 }
  }
}
```

- For customization, use the `--configFile=path/to/config.json` parameter
- All settings should be described and versioned

## Code Organization

### 5. Page Object Pattern 🏗️

```js
export default class LoginPage extends Page {
  init(page) {
    this.usernameField = new TextField("SELECTOR", page);
    this.passwordField = new TextField("SELECTOR", page);
    this.loginBtn = new Button("SELECTOR", page);
  }
  async loginToDealerApp(browser, username, password) { ... }
}
```

- One class per page
- CSS or XPath selectors are supported
- Methods should reflect business functions

### 6. Separation of Business Logic and Low-Level Actions 🧩

Keep business logic and low-level actions separate in your Page Objects. This improves readability, maintainability, and reusability of your code.

- **Business logic**: High-level methods that describe user actions or business processes (e.g., login, checkout, add to cart).
- **Low-level actions**: Direct interactions with page elements (e.g., `find()`, `click()`, `type()`).

**Bad example (mixing low-level actions and business logic):**

```js
async loginToDealerApp(browser, username, password) {
  await browser.page.type('#username', username);
  await browser.page.type('#password', password);
  await browser.page.click('#loginBtn');
  await browser.page.waitForSelector('#homePage');
}
```

**Good example (separating low-level actions from business logic):**

```js
async loginToDealerApp(browser, username, password) {
  await this.enterUsername(username);
  await this.enterPassword(password);
  await this.clickLogin();
  await this.waitForPageToBeRendered();
}

async enterUsername(username) {
  await this.usernameField.type(username);
}

async enterPassword(password) {
  await this.passwordField.type(password);
}

async clickLogin() {
  await this.loginBtn.click();
}

async waitForPageToBeRendered() {
  await browser.waitTillRendered();
}
```

In the good example, business logic is described in high-level methods, while low-level actions are encapsulated in separate helper methods. This makes the code easier to maintain and reuse.

### 7. Reusable Action Methods: Why and How to Use Them ♻️

Reusable action methods are small functions inside your Page Object or base class that help you avoid repeating the same code. They make your tests shorter, clearer, and easier to support.

- Use reusable methods for actions you do often (like opening a menu, filling a form, or waiting for a page to load).
- Combine these methods to build more complex user scenarios.
- If you have similar steps in different places, move them to a reusable method.

**Example:**

```js
// Reusable method for navigation
async navigateToCustomer(browser) {
  await this.openMenu();
  await this.selectCustomerSection();
  await browser.waitTillRendered();
}

// Reusable method for opening details
async openCustomerDetails(browser) {
  await this.selectCustomer();
  await browser.waitTillRendered();
}
```

**How to use in a test:**

```js
await page.navigateToCustomer(browser);
await page.openCustomerDetails(browser);
```

This way, your test code is easy to read and you only need to update logic in one place if something changes.

## Error Handling and Validation

### 8. Status and Error Checks ✅

```js
await this.loginVerify.find();
await browser.waitTillRendered();
```

- Always check for key elements within actions with `find()` method, do not create separate "validate" methods
- Always wait for page to be loaded

### 9. Assertions and Step Snapshots: Making Results Clear in Reports 📸

To make your test reports clear and useful, always use `navigationValidate` method and add pageValidate selector for each page object like this: 
```js
this.pageValidate = new Element("//button[text()='Click Me']", page)
 ```
- `navigationValidate` is an embedded framework function that runs your step, checks for an element, and takes a snapshot with a clear label.
- If the element is not found, the snapshot will be marked as failed.

**How it looks in the report:**

- Each step will have a screenshot labeled with either `StepName_Success` or `StepName_Failed`.
- This makes it easy to spot where a test failed and see the page state at that moment.

> Good assertions and clear snapshots make your reports much more valuable for debugging and analysis!

### 10. Critical Steps ⚠️

```js
it("[N]_Open_Login_Page", async function () {
  await Login.navigationValidate(browser, this)
}).timeout(params.testTime);

it("[N]_Reload_Current_Page", async function () {
  await Login.navigationValidate(browser, this, browser.page.url())
}).timeout(params.testTime);

it("[T]_Execute_Login_step", async function () {
  await Login.loginToDealerApp(browser, this, params.login, params.password);
}).timeout(params.testTime);
```

- Explicitly highlight critical steps (e.g., opening the page and login)
- Use `this` keyword as a testContext to use it for lighthouse report step naming in implementation, like this: "await browser.timespan(`${testContext?.test?.title}`, async () => {...})"
- Use `browser.page.url()` as a 3rd parameter for `navigationValidate` if unsure what is the current URL, it will instruct framework to use current page URL.
- Skip 4th parameter `pages` for `navigationValidate` if not instructed otherwise, it will result in browser reload and all cookie/cache will be lost.
- Timespan actions should never contain page.goTo 
- Use `.timeout` to control test execution time
- To collect more metrics and cover different navigation scenarios, use `navigationValidate` method in your tests.

## Data Management

### 11. Config Structure 📁

- All parameters and secrets should be passed via environment variables or CLI only
- Do not store sensitive data in code
- Use separate JSON configs for Lighthouse

### 12. System Parameter Integration 🔧

```powershell
npx mocha ... --login=... --password=...
```

- All parameters must be documented
- Example run should be in README.md

## Best Practices

### 13. Pause Strategy ⏱️

- Use browser.waitTillRendered() for waits
- Avoid hardcoded pauses unless necessary

### 14. Resource Organization 📂

- Pages in `pages/`
- Tests in `test/`
- Lighthouse reports in `reports/`

### 15. Documentation 📚

- Document all parameters and scenarios in README.md
- Provide examples for running and customization

### 16. Base Classes 🔨

- Common methods and utilities go in base classes
- Follow DRY principle

### 17. Logging 📝

- Use winston/logger for logs
- Log key steps and errors

### 18. Report Generation 📊

- Use Lighthouse for report generation
- Save reports in `reports/`
- Use tags for report navigation

### 19. Load Profile Configuration 📈

- For Lighthouse, profile via throttling in config
- Document all parameters

### 20. Data Separation 💾

- Test data in separate files (if needed)
- Do not mix data and code

### 21. Maintenance and Updates 🛠️

- Regularly update dependencies
- Check Puppeteer and Lighthouse compatibility
- Document changes

### 22. Parameters & Execution 🏁

- All run parameters are described in README.md
- Example run:

```powershell
npx mocha --timeout 10000 .\test\example.test.js --browsertype=desktop --headless=false --url="https://..." --login="email..." --password="pass..."
```

- For Docker:

```powershell
docker run --rm -v "$PWD:$PWD" -w "$PWD" ibombit/lighthouse-puppeteer-chrome:12.8.2-alpine npx mocha --timeout 10000 .\test\example.test.js --browsertype=desktop --headless=true --url="https://..." --login="email..." --password="pass..."
```

- For custom Lighthouse config:

```powershell
npx mocha ... --configFile=path/to/config.json
```

Remember: a well-structured framework saves time and reduces maintenance costs. Follow these guidelines for consistency and clarity in your performance and quality testing codebase!
