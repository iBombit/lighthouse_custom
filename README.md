# lighthouse_custom
Custom Lighthouse Tests Creation

Docker Hub
https://hub.docker.com/r/ibombit/lighthouse-puppeteer-chrome

**Setting up target browser for execution (settings/browser.js)**
* MS EDGE: executablePath: 'C:\\\Program Files (x86)\\\Microsoft\\\Edge\\\Application\\\msedge.exe'
* Chrome:  executablePath: 'C:\\\Program Files\\\Google\\\Chrome\\\Application\\\chrome.exe'
* Docker:  executablePath: '/usr/lib/chromium/chrome'

**Preparing local environment for testing UI scripts**

- **Without docker**
1. Clone repo
2. Install node.js
3. In repo dir execute run these commands:
```
npm install
npm test huge.test.js --runInBand
```

- **With docker**
1. Clone repo
2. Verify that headless mode is set to **true**: https://github.com/iBombit/lighthouse_custom/blob/38d8b67527c53a8ee67b87553bc3b099340c2288/test/huge.test.js#L13
3. In repo dir run this command:
```
docker run --rm -v "$PWD:$PWD" -w "$PWD" ibombit/lighthouse-puppeteer-chrome:2.0-alpine npm test huge.test.js --runInBand
```
