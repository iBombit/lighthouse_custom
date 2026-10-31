import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chdirToTemp } from './helpers.ts';

chdirToTemp();
const { default: Element } = await import('lh-pptr-framework/core/elements/element.js');
const { default: Button } = await import('lh-pptr-framework/core/elements/button.js');
const { default: TextField } = await import('lh-pptr-framework/core/elements/textField.js');
const { default: Dropdown } = await import('lh-pptr-framework/core/elements/dropdown.js');
const { default: Iframe } = await import('lh-pptr-framework/core/elements/iframe.js');
const { default: UploadField } = await import('lh-pptr-framework/core/elements/uploadField.js');
type PageContext = ConstructorParameters<typeof Element>[1];

type Call = unknown[];

/** Records the Puppeteer calls made by elements. `fail` makes every selector wait time out. */
function fakePage({ fail = false, frame = false } = {}) {
  const calls: Call[] = [];
  const handle = (selector: string) => ({
    click: async (options?: unknown) => { calls.push(['click', selector, options ?? null]); },
    hover: async () => { calls.push(['hover', selector]); },
    type: async (text: string, options?: unknown) => { calls.push(['type', selector, text, options ?? null]); },
    uploadFile: async (file: string) => { calls.push(['uploadFile', selector, file]); },
    boundingBox: async () => ({ x: 10, y: 20, width: 30, height: 40 }),
    contentFrame: async () => ({ isFrame: true }),
  });
  const input = {
    mouse: { move: async (x: number, y: number) => { calls.push(['mouse.move', x, y]); }, down: async () => { calls.push(['mouse.down']); }, up: async () => { calls.push(['mouse.up']); } },
    keyboard: { press: async (key: string) => { calls.push(['keyboard.press', key]); } },
  };
  const page: Record<string, unknown> = {
    waitForSelector: async (selector: string, options: { hidden?: boolean }) => {
      calls.push(['waitForSelector', selector, options]);
      if (fail) throw new Error(`Waiting for selector \`${selector}\` failed`);
      // Like Puppeteer: a hidden-wait resolves to null when the element isn't in the DOM at all.
      return options.hidden && selector.includes('missing') ? null : handle(selector);
    },
    $$: async (selector: string) => [handle(selector + '[0]'), handle(selector + '[1]')],
    $eval: async (selector: string, fn: (...a: unknown[]) => unknown, ...args: unknown[]) => {
      calls.push(['$eval', selector, ...args]);
      const options = [{ value: 'a' }, { value: 'b' }, { value: 'c' }];
      return fn({ click: () => calls.push(['dom.click']), options }, ...args);
    },
    evaluate: async (fn: (el: unknown) => unknown, el: unknown) => { calls.push(['evaluate']); return fn(el); },
    select: async (selector: string, value: string) => { calls.push(['select', selector, value]); },
    url: () => 'https://example.com/',
  };
  // A frame has no mouse/keyboard of its own: they belong to its page.
  if (frame) page.page = () => input; else Object.assign(page, input);
  return { page: page as unknown as PageContext & { isSuccess?: boolean }, calls };
}

test('locators starting with "/", "./" or "(" are XPath; everything else is CSS', () => {
  const { page } = fakePage();
  assert.deepEqual(['//div', './/a', '(//b)[2]', '#id', 'div > a', 'a[href="/x"]'].map(l => new Element(l, page).locatorType), ['XPATH', 'XPATH', 'XPATH', 'CSS', 'CSS', 'CSS']);
});

test('replace() substitutes every "%" in the original locator and is chainable', () => {
  const { page } = fakePage();
  const el = new Element("//li[@data-id='%']/span[text()='%']", page);
  assert.equal(el.replace('a').locator, "//li[@data-id='a']/span[text()='a']");
  assert.equal(el.replace(7).locator, "//li[@data-id='7']/span[text()='7']");
  assert.equal(el.originalLocator, "//li[@data-id='%']/span[text()='%']");
});

test('find() waits for visibility; XPath locators get the "xpath/" prefix', async () => {
  const { page, calls } = fakePage();
  await new Element('//h5', page).find(5);
  await new Element('#x', page).findHidden(6);
  assert.deepEqual(calls, [['waitForSelector', 'xpath///h5', { visible: true, timeout: 5 }], ['waitForSelector', '#x', { hidden: true, timeout: 6 }]]);
  assert.equal(Element.DEFAULT_TIMEOUT, 60000);
});

test('click variants pass the right Puppeteer click options', async () => {
  const { page, calls } = fakePage();
  const button = new Button('#b', page);
  await button.click(1);
  await button.doubleClick(1);
  await button.rightClick(1);
  assert.deepEqual(calls.filter(c => c[0] === 'click'), [['click', '#b', null], ['click', '#b', { count: 2 }], ['click', '#b', { button: 'right' }]]);
});

test('a failing action marks the page as failed and rethrows', async () => {
  const { page } = fakePage({ fail: true });
  page.isSuccess = true;
  await assert.rejects(new Button('#b', page).click(1), (e: Error) => e.message === 'Error: Waiting for selector `#b` failed');
  assert.equal(page.isSuccess, false);
});

test('clickIfAvailable() swallows failures and leaves the page status alone', async () => {
  const { page } = fakePage({ fail: true });
  page.isSuccess = true;
  await new Button('#b', page).clickIfAvailable(1);
  assert.equal(page.isSuccess, true);
});

test('TextField: type() with delay, clear() selects all (triple click) then erases', async () => {
  const { page, calls } = fakePage();
  const field = new TextField('#t', page);
  await field.type('hello', 1);
  await field.clear(1);
  assert.deepEqual(calls.filter(c => c[0] !== 'waitForSelector'), [
    ['type', '#t', 'hello', { delay: 100 }],
    ['click', '#t', { count: 3 }], ['type', '#t', ' ', null], ['keyboard.press', 'Backspace'],
  ]);
});

test('mouse/keyboard actions inside an iframe use the frame\'s page', async () => {
  const { page, calls } = fakePage({ frame: true });
  await new Button('#b', page).clickAndHold(1, 1);
  await new TextField('#t', page).clear(1);
  assert.deepEqual(calls.filter(c => String(c[0]).startsWith('mouse') || String(c[0]).startsWith('keyboard')), [
    ['mouse.move', 25, 40], ['mouse.down'], ['mouse.up'], ['keyboard.press', 'Backspace'],
  ]);
});

test('Dropdown selects by index or value and fails on unknown values', async () => {
  const { page, calls } = fakePage();
  const dropdown = new Dropdown('#s', page);
  await dropdown.selectNthOption(2, 1);
  await dropdown.selectOptionByValue('b', 1);
  assert.deepEqual(calls.filter(c => c[0] === 'select'), [['select', '#s', 'c'], ['select', '#s', 'b']]);
  await assert.rejects(dropdown.selectOptionByValue('zzz', 1), /Option with value "zzz" not found/);
  assert.equal(page.isSuccess, false);
});

test('Iframe.createIframe() returns the content frame marked as successful, or undefined', async () => {
  const frame = await new Iframe('#f', fakePage().page).createIframe(1);
  assert.deepEqual(frame, { isFrame: true, isSuccess: true });
  assert.equal(await new Iframe('#f', fakePage({ fail: true }).page).createIframe(1), undefined);
});

test('UploadField uploads into visible or hidden inputs', async () => {
  const { page, calls } = fakePage();
  await new UploadField('#u', page).upload('/tmp/a.txt', 1);
  await new UploadField('#hidden', page).uploadHidden('/tmp/b.txt', 1);
  assert.deepEqual(calls.filter(c => c[0] === 'uploadFile'), [['uploadFile', '#u', '/tmp/a.txt'], ['uploadFile', '#hidden', '/tmp/b.txt']]);
  await assert.rejects(new UploadField('#missing', page).uploadHidden('/tmp/c.txt', 1)); // no element to upload into
  assert.equal(page.isSuccess, false);
});
