# lighthouse_custom
Custom Lighthouse Tests Creation

Docker Hub
https://hub.docker.com/r/ibombit/lighthouse-puppeteer-chrome

**Preparing local environment for testing UI scripts**

- **Install docker**
1. Create debug UI script (Node.js+Puppeteer+Lighthouse)
2. In the same directory execute this command:
3. `docker run --rm -v "$PWD:$PWD" -w "$PWD" ibombit/lighthouse-puppeteer-chrome:latest node <YOUR_UI_SCRIPT>.js`

- **Without docker**
1. Install node.js
2. Run these commands:
```
npm init -y
npm install puppeteer lighthouse@9.2.0 # chrome browser is bundled with the puppeteer package on npm by default
node <YOUR_UI_SCRIPT>.js
```

**Possible launch commands for demo script**
```
node onliner.js user pass desktop headful
node onliner.js user pass desktop headless
node onliner.js user pass mobile headful
node onliner.js user pass mobile headless
```
