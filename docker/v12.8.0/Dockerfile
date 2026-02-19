# Run w/ Puppeteer w/ Lighthouse in a container
#
# Lighthouse is a tool that allows auditing, performance metrics, and best
# practices for Progressive Web Apps.
#
# Puppeteer-core doesn't have a browser
# so having executablePath in LH browser settings in mandatory

FROM node:alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --production

FROM alpine:latest
RUN apk add --no-cache nodejs npm chromium
COPY --from=build /app .
# Set environment variables for Chromium to avoid issues with Puppeteer
# See: https://github.com/puppeteer/puppeteer/issues/11023#issuecomment-1776247197
ENV XDG_CONFIG_HOME=/tmp/.chromium
ENV XDG_CACHE_HOME=/tmp/.chromium