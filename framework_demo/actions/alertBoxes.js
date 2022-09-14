class AlertBoxes {
    /**
     * Accept Alert Message
     * @page     current page in browser
    */
    async acceptAlert(page) {
      page.on('dialog', async dialog => {
          //get alert message
          console.log(dialog.message());
          //accept alert
          await dialog.accept();
      });
    }

}


module.exports = AlertBoxes;
