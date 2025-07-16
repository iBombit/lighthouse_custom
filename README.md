## Command Line Parameters

| Parameter            | Description                                                                 | Example Usage                                                                 |
|----------------------|-----------------------------------------------------------------------------|------------------------------------------------------------------------------|
| `--browsertype`      | Specifies the browser type.                                                | `--browsertype=desktop`                                                     |
| `--headless`         | Runs tests in headless mode.                                               | `--headless=false`                                                          |
| `--browserLocation`  | Sets a custom browser location.                                            | `--browserLocation="C:/Browser/start.exe"`                                  |
| `--login`            | Sets the login.                                                           | `--login=example@email.com`                                                 |
| `--password`         | Sets the password.                                                        | `--password=PASSWORD`                                                       |
| `--url`              | Sets the host link.                                                       | `--url=https://google.com`                                                  |
| `--ddhost`           | Specifies the Datadog host link (exclude 'http://').                      | `--ddhost=api.datadoghq.eu`                                                 |
| `--ddkey`            | Provides the Datadog API key.                                             | `--ddkey=<Your_Datadog_API_Key>`                                            |
| `--ciurl`            | Sets the CI run URL.                                                      | `--ciurl=https://github.com/$GITHUB_REPOSITORY/actions/runs/$GITHUB_RUN_ID` |
| `--teamswebhook`     | Sets the Teams webhook URL.                                               | `--teamswebhook="YOUR_WEBHOOK_URL"`                                         |
| `--slackwebhook`     | Sets the Slack webhook URL.                                               | `--slackwebhook="YOUR_WEBHOOK_URL"`                                         |
| `--influxurl`        | Required for both InfluxV1 and InfluxV2. Sets the InfluxDB URL.            | `--influxurl=http://YOUR_IP:8086/`                                          |
| `--influxToken`      | InfluxV2 specific. Sets the InfluxDB token.                               | `--influxToken=YOUR_INFLUX_TOKEN`                                           |
| `--influxorg`        | InfluxV2 specific. Sets the InfluxDB organization.                        | `--influxorg=YOUR_ORG`                                                      |
| `--influxbucket`     | InfluxV2 specific. Sets the InfluxDB bucket.                              | `--influxbucket=YOUR_BUCKET`                                                |
| `--influxusername`   | InfluxV1 specific. Sets the InfluxDB username.                            | `--influxusername=YOUR_USERNAME`                                            |
| `--influxpassword`   | InfluxV1 specific. Sets the InfluxDB password.                            | `--influxpassword=YOUR_PASSWORD`                                            |
| `--influxdatabase`   | InfluxV1 specific. Sets the InfluxDB database.                            | `--influxdatabase=YOUR_DATABASE`                                            |
| `--configFile`       | Specifies a custom Lighthouse configuration file.                        | `--configFile=path/to/config.json`                                          |
| `--includetimestamp` | Adds timestamp to report file names (default is false).                   | `--includetimestamp=true`                                                   |

---

## Custom Configuration File

### `--configFile`

This parameter allows you to pass a custom JSON file to override the default Lighthouse configuration. The settings in the custom JSON file are merged with the existing configuration to provide a highly customizable and flexible testing setup.

#### Custom JSON Example (`customConfig.json`):
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

## Running Locally

### Steps:

1. Clone the repository:
   ```bash
   git clone https://github.com/iBombit/lighthouse_custom
   ```
2. Install Node.js.
3. In the repository directory, execute the following commands:
   ```bash
   npm install
   npx mocha --timeout 10000 .\test\huge.test.steps.js --browsertype=desktop --headless=false --url="https://demoqa.com/"
   ```

---

## Running with Docker

### From Root User:

1. Clone the repository:
   ```bash
   git clone https://github.com/iBombit/lighthouse_custom
   ```
2. Verify that headless mode is enabled via the `--headless=true` flag.
3. In the repository directory, run the following command:
   ```bash
   docker run --rm -v "$PWD:$PWD" -w "$PWD" ibombit/lighthouse-puppeteer-chrome:12.8.0-alpine npx mocha --timeout 10000 .\test\huge.test.steps.js --browsertype=desktop --headless=true --url="https://demoqa.com/"
   ```

### From Current User:

1. Clone the repository:
   ```bash
   git clone https://github.com/iBombit/lighthouse_custom
   ```
2. Verify that headless mode is enabled via the `--headless=true` flag.
3. In the repository directory, run the following command:
   ```bash
   docker run --rm -v "$PWD:$PWD" -w "$PWD" --user "$(id -u):$(id -g)" ibombit/lighthouse-puppeteer-chrome:12.8.0-alpine npx mocha --timeout 10000 .\test\huge.test.steps.js --browsertype=desktop --headless=true --url="https://demoqa.com/"
   ```
