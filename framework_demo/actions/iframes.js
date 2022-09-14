class Iframes {
    /**
     * Create iframe with success status
     * @selector CSS selector for iframe
     * @scope    current scope (page in browser or other iframe)
    */
    async createIframe(selector, scope) {
      let frameHandle = await scope.$(selector);
      let frame = await frameHandle.contentFrame();
      //each time we create a new frame we need to set status as sucess
      //If it fails in "actions" -- it will skip other actions within this frame
      frame.isSuccess = true;
      return frame;
    }

}


module.exports = Iframes;
