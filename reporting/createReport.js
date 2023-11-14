import logger from "../logger/logger.js";
import fs from 'fs/promises';

// need to write to the parent directory for Carrier
const reportPath = './user-flow.report.html';
const reportPathJson = './user-flow.report.json';

export default class CreateReport {
    async createReports(flow, configString) {
      //use configString to add mobile/desktop to report name (will fail in Carrier)
      const reportHTML = await flow.generateReport();
      // const reportJSON = JSON.stringify(flow.getFlowResult()).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029'); // For LH @9.2.0
      const reportJSON = JSON.stringify(await flow.createFlowResult(), null, 2); // For LH newer than @9.2.0
      await fs.writeFile(reportPath, reportHTML);
      await fs.writeFile(reportPathJson, reportJSON);
      logger.debug("[REPORT] HTML path: " + reportPath);
      logger.debug("[REPORT] JSON path: " + reportPathJson);
    }
}