CMD params
- **`--browsertype`**  
  Specifies a browsertype. Usage: `--browsertype=desktop`

- **`--headless`**  
  Runs tests in headless mode. Usage: `--headless=false`

- **`--browserLocation`**  
  Sets a custom browser location. Usage: `--browserLocation="C:/Browser/start.exe"`

- **`--login`**  
  Sets the login. Usage: `--login=example@email.com`

- **`--password`**  
  Sets the password. Usage: `--password=PASSWORD`

- **`--host`**  
  Sets the host link. Usage: `--host=https://google.com`

- **`--ddhost`**  
  Specifies the Datadog host link (exclude 'http://'). Usage: `--ddhost=api.datadoghq.eu`

- **`--ddkey`**  
  Provides the Datadog API key. Usage: `--ddkey=<Your_Datadog_API_Key>`

**Local runs**
1. git clone https://github.com/iBombit/lighthouse_custom
2. Install node.js
3. In repo dir execute run these commands:
```
npm install
npx mocha --timeout 10000 .\test\huge.test.steps.js --browsertype=desktop --headless=false --url="https://demoqa.com/"
```

**With docker**
1. git clone https://github.com/iBombit/lighthouse_custom
2. Verify that headless mode is enabled via "--headless=false" flag
3. In repo dir run this command:
```
docker run --rm -v "$PWD:$PWD" -w "$PWD" ibombit/lighthouse-puppeteer-chrome:11.7.1-alpine npx mocha --timeout 10000 .\test\huge.test.steps.js --browsertype=desktop --headless=false --url="https://demoqa.com/"
```
