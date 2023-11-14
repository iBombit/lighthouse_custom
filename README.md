CMD params
- --desktop
- --headless
- --browserLocation "path"
> if no parameters specified it will launch mobile headful browser based on OS
> if OS based launch failing on your system, then specify full path to executable, like **--browserLocation "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"**

**Local runs**
1. git clone https://github.com/iBombit/lighthouse_custom.git
2. Install node.js
3. In repo dir execute run these commands:
```
npm install
npx mocha .\test\huge.test.js --desktop
```

**With docker**
1. git clone --depth 1 --branch 11.1.0 https://github.com/iBombit/lighthouse_custom.git
2. Verify that headless mode is enabled via "--headless" flag
3. In repo dir run this command:
```
docker run --rm -v "$PWD:$PWD" -w "$PWD" ibombit/lighthouse-puppeteer-chrome:11.1.0-alpine npx mocha ./test/huge.test.js --desktop --headless
```
