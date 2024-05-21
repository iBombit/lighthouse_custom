# Run w/ Puppeteer w/ Lighthouse in a container
#
# Lighthouse is a tool that allows auditing, performance metrics, and best
# practices for Progressive Web Apps.
#
# Puppeteer-core doesn't have a browser
# so having executablePath in LH browser settings in mandatory

FROM alpine

RUN apk add --update chromium nodejs npm

COPY package.json package.json
COPY package-lock.json package-lock.json
RUN npm ci && npm cache clean --force
