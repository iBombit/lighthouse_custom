const logger = require("../logger/logger");
const fs = require('fs');

// need to write to the parent directory for Carrier
const reportPath = './user-flow.report.html';
const reportPathJson = './user-flow.report.json';

class CreateReport {
    async createReports(flow, configString) {
      //use configString to add mobile/desktop to report name (will fail in Carrier)
      const reportHTML = await flow.generateReport();
      // const reportJSON = JSON.stringify(flow.getFlowResult()).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029'); // For LH @9.2.0
      const reportJSON = JSON.stringify(await flow.createFlowResult(), null, 2); // For LH newer than @9.2.0
      fs.writeFileSync(reportPath, reportHTML);
      fs.writeFileSync(reportPathJson, reportJSON);
      logger.debug("HTML report path: " + reportPath);
      logger.debug("JSON report path: " + reportPathJson);
    }
}

module.exports = CreateReport;
