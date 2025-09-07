/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {Gatherer} from 'lighthouse';

/**
 * Gatherer to capture network request bodies from XHR and Fetch requests
 * This data will be used by network audits to display request payloads
 */
class NetworkRequestBodiesGatherer extends Gatherer {
  meta = {
    supportedModes: ['navigation', 'timespan'],
  };

  constructor() {
    super();
    this.requestBodies = new Map();
  }

  async startInstrumentation(context) {
    const session = context.driver.defaultSession;
    
    // Enable Network domain to capture request data
    await session.sendCommand('Network.enable');
    
    // Listen for network request events to capture request bodies
    session.on('Network.requestWillBeSent', (params) => {
      this.onRequestWillBeSent(params);
    });

    // Listen for response received to get response bodies if needed
    session.on('Network.responseReceived', (params) => {
      this.onResponseReceived(params);
    });
  }

  async stopInstrumentation(context) {
    const session = context.driver.defaultSession;
    
    // Remove event listeners
    session.off('Network.requestWillBeSent', this.onRequestWillBeSent);
    session.off('Network.responseReceived', this.onResponseReceived);
  }

  onRequestWillBeSent(params) {
    const request = params.request;
    const requestId = params.requestId;
    
    // Only capture XHR and Fetch requests that might have bodies
    if (this.isXHROrFetchRequest(request)) {
      const requestData = {
        requestId: requestId,
        url: request.url,
        method: request.method,
        headers: request.headers,
        postData: request.postData || null,
        hasPostData: request.hasPostData || false,
        timestamp: params.timestamp,
        wallTime: params.wallTime,
      };

      this.requestBodies.set(requestId, requestData);
    }
  }

  onResponseReceived(params) {
    const response = params.response;
    const requestId = params.requestId;
    
    // Update existing request data with response information
    if (this.requestBodies.has(requestId)) {
      const requestData = this.requestBodies.get(requestId);
      requestData.responseStatus = response.status;
      requestData.responseHeaders = response.headers;
      requestData.responseMimeType = response.mimeType;
      this.requestBodies.set(requestId, requestData);
    }
  }

  isXHROrFetchRequest(request) {
    const url = request.url.toLowerCase();
    const method = request.method;
    
    // Skip obvious static resources
    const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.map', '.webp'];
    const isStaticResource = staticExtensions.some(ext => url.includes(ext));
    
    if (isStaticResource) {
      return false;
    }

    // Skip advertising and tracking requests
    const adPatterns = [
      'doubleclick.net', 'googlesyndication.com', 'googleadservices.com',
      'facebook.com/tr', 'google-analytics.com', '/ads?', '/ad?',
      'adsystem.com', 'adnxs.com', 'amazon-adsystem.com'
    ];
    
    if (adPatterns.some(pattern => url.includes(pattern))) {
      return false;
    }

    // Look for XHR/API-like patterns
    const apiPatterns = ['/api/', '/ajax/', '/xhr/', '/rest/', '/graphql', '/json', '/data/'];
    const hasApiPattern = apiPatterns.some(pattern => url.includes(pattern));
    
    // Include requests that:
    // 1. Have API-like patterns in URL
    // 2. Use non-GET methods (likely to have request bodies)
    // 3. Have post data
    // 4. Have XHR-related headers
    const hasXHRHeaders = request.headers && (
      request.headers['X-Requested-With'] === 'XMLHttpRequest' ||
      request.headers['Content-Type']?.includes('application/json') ||
      request.headers['Content-Type']?.includes('application/x-www-form-urlencoded')
    );

    return hasApiPattern || method !== 'GET' || request.hasPostData || hasXHRHeaders;
  }

  formatRequestBody(postData) {
    if (!postData) return null;
    
    try {
      // Try to parse as JSON for better formatting
      const parsed = JSON.parse(postData);
      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      // If not JSON, return as-is but truncate if too long
      return postData.length > 500 ? postData.substring(0, 500) + '...' : postData;
    }
  }

  async getArtifact(context) {
    // Convert Map to object for serialization
    const requestBodiesData = {};
    
    for (const [requestId, requestData] of this.requestBodies) {
      requestBodiesData[requestId] = {
        ...requestData,
        formattedPostData: this.formatRequestBody(requestData.postData),
      };
    }

    return {
      requestBodies: requestBodiesData,
      totalRequests: this.requestBodies.size,
    };
  }
}

export default NetworkRequestBodiesGatherer;
