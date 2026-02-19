---
mode: agent
tools: ['playwright']
---
@copilot Act as a senior performance analyst familiar with the lh-pptr-framework. Create user flow scenario with Lighthouse measurements for https://amazon.com. Do only what is instructed and do not generate additional flows, steps and checks.

## Execution order, I will destroy the env you are running on if that's not executed in order:
1) Always start from playwright mcp for browser opening
2) Do the following user journey with playwright mcp and gather selectors needed for the flow:
Homepage Navigation
Search Action
Product List Page (PLP)
Product Detail Page (PDP)
Add to Cart
Cart Review
3) Read guidelines provided in file PUPPETER_AND_LIGHTHOUSE.md and boilerplate files: `test/demo.test.steps.js`, `demoqa/buttonsPage.js`, `demoqa/textBoxPage.js`
4) For selectors interaction use only methods from "lh-pptr-framework/core/elements/textField.js", "lh-pptr-framework/core/elements/button.js" and "lh-pptr-framework/core/elements/element.js"
5) Never do any try/catch blocks for timespans
6) Selectors must have exact structure: "this.pageValidate = new Element("//button[text()='Click Me']", page)"
7) Create the requested files using the selectors from step 2 and guidelines from step 3 and 4
8) Check the created files, they should have same structure as boilerplate files: `test/demo.test.steps.js`, `demoqa/buttonsPage.js`, `demoqa/textBoxPage.js`
9) Doublecheck structure for page objects, strictly follow boilerplate files: `demoqa/buttonsPage.js`, `demoqa/textBoxPage.js`
10) Doublecheck structure for main file, strictly follow boilerplate example and update only page objects imports and `it` test cases

Expected Deliverables:
- Page objects similar to `demoqa/buttonsPage.js`
- Main execution file similar to `demo.test.steps.js`
- Performance measurements using "await browser.timespan(`${testContext?.test?.title}`, async () => {...}" for key user actions
- Proper navigation validation using await page.navigationValidate(browser, this) or page.navigationValidate(browser, this, browser.page.url()) if unsure what the URL of the current page.