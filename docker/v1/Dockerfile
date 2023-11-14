# Run Lighthouse CI w/ Puppeteer w/ Chrome Headless in a container
#
# Lighthouse is a tool that allows auditing, performance metrics, and best
# practices for Progressive Web Apps.
#
# Puppeteer is a Node library which provides a high-level API to control Chrome or Chromium over the DevTools Protocol.
# Puppeteer runs headless by default, but can be configured to run full (non-headless) Chrome/Chromium/Edge.

FROM node:16-buster-slim

LABEL name="lighthouse-puppeteer-chrome" \
  maintainer="Sergei Pashkevich <pashkevich96@hotmail.com>" \
  version="1.0" \
  description="Lighthouse analyzes web apps and web pages, collecting modern performance metrics and insights on developer best practices. Puppeteer is used to control the browser over DevTools Protocol."

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# Install deps + add Chrome Stable + purge all the things
RUN apt-get update && apt-get install -y \
  apt-transport-https \
  ca-certificates \
  curl \
  gnupg \
  --no-install-recommends \
  && curl -sSL https://deb.nodesource.com/setup_16.x | bash - \
  && curl -sSL https://dl.google.com/linux/linux_signing_key.pub | apt-key add - \
  && echo "deb https://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list \
  && apt-get update && apt-get install -y \
  google-chrome-stable \
  fontconfig \
  fonts-ipafont-gothic \
  fonts-wqy-zenhei \
  fonts-thai-tlwg \
  fonts-kacst \
  fonts-symbola \
  fonts-noto \
  fonts-freefont-ttf \
  nodejs \
  --no-install-recommends \
  && apt-get purge --auto-remove -y curl gnupg \
  && rm -rf /var/lib/apt/lists/*

#RUN npm --global install npm

ARG CACHEBUST=1

# Install Puppeteer under /node_modules so it's available system-wide
COPY package.json package.json
COPY package-lock.json package-lock.json
RUN npm ci && npm cache clean --force
RUN apt-get update && apt-get -y install procps
RUN apt-get update && apt-get -y install grep
RUN apt-get update && apt-get -y install gawk
RUN apt-get update && apt-get -y install findutils && rm -rf /var/lib/apt/lists/*
RUN apt-get clean
