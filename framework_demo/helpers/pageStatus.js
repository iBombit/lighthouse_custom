class PageStatus {
  /**
   * Check for success status before executing next flow
   * @page          current page in browser
   * @flow          lighthouse flow object (used for measurements and report)
  */
  async withPageStatusCheck (page, flow) {
    return page.isSuccess ? await flow() : console.log('Fail detected, skipping flow...');
  }

}

module.exports = PageStatus;
