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
    this.requestCounter = 0;
    
    // Bind methods to maintain context for event listeners
    this.onRequestWillBeSent = this.onRequestWillBeSent.bind(this);
    this.onResponseReceived = this.onResponseReceived.bind(this);
  }

  async startInstrumentation(context) {
    const session = context.driver.defaultSession;
    this.session = session; // Store session reference for async operations
    
    // Enable Network domain to capture request data
    await session.sendCommand('Network.enable');
    
    // Listen for network request events to capture request bodies
    session.on('Network.requestWillBeSent', this.onRequestWillBeSent);

    // Listen for response received to get response bodies if needed
    session.on('Network.responseReceived', this.onResponseReceived);
  }

  async stopInstrumentation(context) {
    const session = context.driver.defaultSession;
    
    // Remove event listeners
    session.off('Network.requestWillBeSent', this.onRequestWillBeSent);
    session.off('Network.responseReceived', this.onResponseReceived);
  }

  async onRequestWillBeSent(params) {
    const request = params.request;
    const requestId = params.requestId;
    
    // Only capture XHR and Fetch requests that might have bodies
    if (this.isXHROrFetchRequest(request)) {
      // Always increment counter first to ensure unique keys
      this.requestCounter++;
      const uniqueKey = `${requestId}_${this.requestCounter}`;
      
      let postData = request.postData || null;
      
      // Store initial request data immediately
      const requestData = {
        requestId: requestId,
        uniqueKey: uniqueKey,
        url: request.url,
        method: request.method,
        headers: request.headers,
        postData: postData,
        hasPostData: request.hasPostData || false,
        timestamp: params.timestamp,
        wallTime: params.wallTime,
      };

      this.requestBodies.set(uniqueKey, requestData);
      
      // Try to get request body asynchronously if not immediately available
      if (request.hasPostData && !postData && this.session) {
        try {
          // Use a slight delay to ensure the request is fully processed
          setTimeout(async () => {
            try {
              const postDataResponse = await this.session.sendCommand('Network.getRequestPostData', {
                requestId: requestId
              });
              
              // Update the stored request data with the retrieved post data
              const storedData = this.requestBodies.get(uniqueKey);
              if (storedData) {
                storedData.postData = postDataResponse.postData;
                this.requestBodies.set(uniqueKey, storedData);
              }
            } catch (error) {
              // Some requests might not have retrievable post data
              console.warn(`Could not retrieve post data for request ${requestId}:`, error.message);
            }
          }, 10); // Small delay to ensure request is processed
        } catch (error) {
          console.warn(`Error setting up post data retrieval for request ${requestId}:`, error.message);
        }
      }
    }
  }
  
  extractOperationName(postData) {
    if (!postData) return null;
    try {
      const parsed = JSON.parse(postData);
      return parsed.operationName || null;
    } catch (e) {
      return null;
    }
  }

  onResponseReceived(params) {
    const response = params.response;
    const requestId = params.requestId;
    
    // Find the corresponding request data by requestId (there might be multiple with same requestId)
    for (const [uniqueKey, requestData] of this.requestBodies) {
      if (requestData.requestId === requestId && !requestData.responseStatus) {
        // Update the first matching request that doesn't have response data yet
        requestData.responseStatus = response.status;
        requestData.responseHeaders = response.headers;
        requestData.responseMimeType = response.mimeType;
        this.requestBodies.set(uniqueKey, requestData);
        break; // Only update the first matching request
      }
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
      // Try to parse as JSON to extract operation name
      const parsed = JSON.parse(postData);
      
      return {
        content: postData, // Raw content for the audit
        operationName: parsed.operationName || null,
        type: 'json'
      };
    } catch (e) {
      // If not JSON, return raw content
      return {
        content: postData,
        type: 'text'
      };
    }
  }

  async getArtifact(context) {
    // Convert Map to object structure expected by audits
    const requestBodiesData = {};
    
    for (const [uniqueKey, requestData] of this.requestBodies) {
      const formattedBody = this.formatRequestBody(requestData.postData);
      
      // Create entry in the format expected by audits
      requestBodiesData[uniqueKey] = {
        requestId: requestData.requestId,
        uniqueKey: uniqueKey,
        url: requestData.url,
        method: requestData.method,
        headers: requestData.headers,
        postData: requestData.postData,
        hasPostData: requestData.hasPostData,
        timestamp: requestData.timestamp,
        wallTime: requestData.wallTime,
        responseStatus: requestData.responseStatus || null,
        responseHeaders: requestData.responseHeaders || null,
        responseMimeType: requestData.responseMimeType || null,
        // This is what the audit is looking for:
        formattedPostData: formattedBody?.content || requestData.postData || null,
        operationName: formattedBody?.operationName || null,
        summary: this.createRequestSummary(requestData, formattedBody),
      };
    }

    return {
      requestBodies: requestBodiesData,
      totalRequests: this.requestBodies.size,
    };
  }

  createRequestSummary(requestData, formattedBody) {
    const url = new URL(requestData.url);
    let summary = `${requestData.method} ${url.pathname}`;
    
    // Add operation name for GraphQL requests
    if (formattedBody && formattedBody.operationName) {
      summary += ` (${formattedBody.operationName})`;
    }
    
    // Add timestamp for uniqueness
    const date = new Date(requestData.wallTime * 1000);
    summary += ` at ${date.toISOString()}`;
    
    return summary;
  }
}

export default NetworkRequestBodiesGatherer;
