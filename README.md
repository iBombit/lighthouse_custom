CMD params
- **`--desktop`**  
  Specifies a desktop view. If omitted, a mobile view is used by default.

- **`--headless`**  
  Runs tests in headless mode. If omitted, a browser window will open.

- **`--browserLocation`**  
  Sets a custom browser location. Usage: `--browserLocation "C:/Browser/start.exe"`

- **`--login`**  
  Sets the login. Usage: `--login example@email.com`

- **`--password`**  
  Sets the password. Usage: `--password PASSWORD`

- **`--host`**  
  Sets the host link. Usage: `--host https://google.com`

- **`--ddhost`**  
  Specifies the Datadog host link (exclude 'http://'). Usage: `--ddhost api.datadoghq.eu`

- **`--ddkey`**  
  Provides the Datadog API key. Usage: `--ddkey <Your_Datadog_API_Key>`

**Local runs**
1. git clone https://github.com/iBombit/lighthouse_custom.git
2. Install node.js
3. In repo dir execute run these commands:
```
npm install
npx mocha .\test\huge.test.js --desktop
```

**With docker**
1. git clone https://github.com/iBombit/lighthouse_custom.git
2. Verify that headless mode is enabled via "--headless" flag
3. In repo dir run this command:
```
docker run --rm -v "$PWD:$PWD" -w "$PWD" ibombit/lighthouse-puppeteer-chrome:11.1.0-alpine npx mocha ./test/huge.test.js --desktop --headless
```
