## Command Line Parameters
- `--browsertype`: Specifies the browser type. Usage: `--browsertype=desktop`
- `--headless`: Runs tests in headless mode. Usage: `--headless=false`
- `--browserLocation`: Sets a custom browser location. Usage: `--browserLocation="C:/Browser/start.exe"`
- `--login`: Sets the login. Usage: `--login=example@email.com`
- `--password`: Sets the password. Usage: `--password=PASSWORD`
- `--url`: Sets the host link. Usage: `--url=https://google.com`
- `--ddhost`: Specifies the Datadog host link (exclude 'http://'). Usage: `--ddhost=api.datadoghq.eu`
- `--ddkey`: Provides the Datadog API key. Usage: `--ddkey=<Your_Datadog_API_Key>`
- `--githubrunurl`: Sets the GitHub run URL. Usage: `--githubrunurl=https://github.com/$GITHUB_REPOSITORY/actions/runs/$GITHUB_RUN_ID`
- `--webhook`: Sets the webhook URL. Usage: `--webhook="YOUR_WEBHOOK_URL"`
- `--influxurl`: Sets the InfluxDB URL. Usage: `--influxurl=http://YOUR_IP:8086/`
- `--influxToken`: Sets the InfluxDB token. Usage: `--influxToken=YOUR_INFLUX_TOKEN`
- `--influxorg`: Sets the InfluxDB organization. Usage: `--influxorg=YOUR_ORG`
- `--influxbucket`: Sets the InfluxDB bucket. Usage: `--influxbucket=YOUR_BUCKET`

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
docker run --rm -v "$PWD:$PWD" -w "$PWD" ibombit/lighthouse-puppeteer-chrome:12.1.0-alpine npx mocha --timeout 10000 .\test\huge.test.steps.js --browsertype=desktop --headless=false --url="https://demoqa.com/"
```
