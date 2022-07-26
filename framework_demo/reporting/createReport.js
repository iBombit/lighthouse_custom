const fs = require('fs');

// need to write to the parent directory for Carrier
const reportPath = __dirname + '/../user-flow.report.html';
const reportPathJson = __dirname + '/../user-flow.report.json';

class CreateReport {
    async createReports(flow) {
      const reportHTML = flow.generateReport();
      const reportJSON = JSON.stringify(flow.getFlowResult()).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
      fs.writeFileSync(reportPath, reportHTML);
      fs.writeFileSync(reportPathJson, reportJSON);
      console.log("HTML report path: " + reportPath);
      console.log("JSON report path: " + reportPathJson);
    }
}

module.exports = CreateReport;
