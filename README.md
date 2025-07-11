## Command Line Parameters
- `--browsertype`: Specifies the browser type. Usage: `--browsertype=desktop`
- `--headless`: Runs tests in headless mode. Usage: `--headless=false`
- `--browserLocation`: Sets a custom browser location. Usage: `--browserLocation="C:/Browser/start.exe"`
- `--login`: Sets the login. Usage: `--login=example@email.com`
- `--password`: Sets the password. Usage: `--password=PASSWORD`
- `--url`: Sets the host link. Usage: `--url=https://google.com`
- `--ddhost`: Specifies the Datadog host link (exclude 'http://'). Usage: `--ddhost=api.datadoghq.eu`
- `--ddkey`: Provides the Datadog API key. Usage: `--ddkey=<Your_Datadog_API_Key>`
- `--ciurl`: Sets the CI run URL. Usage: `--ciurl=https://github.com/$GITHUB_REPOSITORY/actions/runs/$GITHUB_RUN_ID`
- `--teamswebhook`: Sets the Teams webhook URL. Usage: `--teamswebhook="YOUR_WEBHOOK_URL"`
- `--slackwebhook`: Sets the Slack webhook URL. Usage: `--slackwebhook="YOUR_WEBHOOK_URL"`
- `--influxurl`: Required for both InfluxV1 and InfluxV2. Sets the InfluxDB URL. Usage: `--influxurl=http://YOUR_IP:8086/`
- `--influxToken`: InfluxV2 specific. Sets the InfluxDB token. Usage: `--influxToken=YOUR_INFLUX_TOKEN`
- `--influxorg`: InfluxV2 specific. Sets the InfluxDB organization. Usage: `--influxorg=YOUR_ORG`
- `--influxbucket`: InfluxV2 specific. Sets the InfluxDB bucket. Usage: `--influxbucket=YOUR_BUCKET`
- `--influxusername`: InfluxV1 specific. Sets the InfluxDB username. Usage: `--influxusername=YOUR_USERNAME`
- `--influxpassword`: InfluxV1 specific. Sets the InfluxDB password. Usage: `--influxpassword=YOUR_PASSWORD`
- `--influxdatabase`: InfluxV1 specific. Sets the InfluxDB database. Usage: `--influxdatabase=YOUR_DATABASE`
- `--configFile`: Specifies a custom Lighthouse configuration file. Usage: `--configFile=path/to/config.json`

---

### Custom configuration file:

- **`--configFile`**:  
  This parameter allows you to pass a custom JSON file to override the default Lighthouse configuration. The settings in the custom JSON file are merged with the existing configuration to provide a highly customizable and flexible testing setup.

  **Custom JSON Example** (`customConfig.json`):
  ```json
  {
    "settings": {
      "throttling": {
        "rttMs": 100,
        "throughputKbps": 15000,
        "cpuSlowdownMultiplier": 2
      },
      "formFactor": "mobile",
      "screenEmulation": {
        "mobile": true,
        "width": 375,
        "height": 667,
        "deviceScaleFactor": 2,
        "disabled": false
      }
    }
  }
  ```

---

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
2. Verify that headless mode is enabled via "--headless=true" flag
3. In repo dir run this command:
```
docker run --rm -v "$PWD:$PWD" -w "$PWD" ibombit/lighthouse-puppeteer-chrome:12.7.1-alpine npx mocha --timeout 10000 .\test\huge.test.steps.js --browsertype=desktop --headless=true --url="https://demoqa.com/"
```
