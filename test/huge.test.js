const HomePage = require('../pages/homePage');
const TextBoxPage = require('../pages/webElements/textBoxPage');
const PracticeFormPage = require('../pages/webForms/practiceFormPage');
const UploadDownloadPage = require('../pages/webElements/uploadDownloadPage');
const CheckBoxPage = require('../pages/webElements/checkBoxPage');
const ButtonsPage = require('../pages/webElements/buttonsPage');
const LighthouseBrowser = require('../core/browser');
const CreateReport = require('../reporting/createReport');
const path = require('path');
const uploadDir = path.relative(process.cwd(), __dirname)

var browserType = "desktop",
    headless = false,
    browser = new LighthouseBrowser(browserType, headless),
    Home = new HomePage(),
    PracticeForm = new PracticeFormPage(),
    TextBox = new TextBoxPage(),
    UploadDownload = new UploadDownloadPage(),
    CheckBox = new CheckBoxPage(),
    Buttons = new ButtonsPage(),
    testTime = 100000;

beforeAll(async () =>  {
    await browser.init();
    await browser.start();   
    browser.page.isSuccess = true; // Track failed actions (any fail working with actions sets this to false)
    Home.init(browser.page); // Sets instance of puppeteer page to Home page object
    PracticeForm.init(browser.page); // Sets instance of puppeteer page to PracticeForm page object
    TextBox.init(browser.page); // Sets instance of puppeteer page to TextBox page object
    UploadDownload.init(browser.page); // Sets instance of puppeteer page to UploadDownload page object
    CheckBox.init(browser.page); // Sets instance of puppeteer page to CheckBox page object
    Buttons.init(browser.page); // Sets instance of puppeteer page to Buttons page object
}, testTime);

// Check if prev flow finished successfully before launching test
beforeEach(async () =>  {
    console.log("[STARTED] " + expect.getState().currentTestName)
    if (browser.flow.currentTimespan) {  // happens if waiting inside actions exceeds "testTime" timeout
        await browser.flow.endTimespan() // stopping active timespan if not stopped by timeout
        browser.page.isSuccess = false
        throw new Error('Skipping test because previous flow exceeded testTime limit: ' + testTime);
    }
    else if (!browser.page.isSuccess) 
        throw new Error('Skipping test because previous flow failed');
}, testTime)

afterEach(async () =>  {
    console.log("[ENDED] " + expect.getState().currentTestName)
})

afterAll(async () =>  {
    if (browser.flow.currentTimespan) {  // happens if waiting inside actions exceeds "testTime" timeout
        await browser.flow.endTimespan() // stopping active timespan if not stopped by timeout
        browser.page.isSuccess = false
    }
    await browser.flow.snapshot({stepName: 'Capturing last state of the test'});
    await new CreateReport().createReports(browser.flow, browserType)
    await browser.closeBrowser();
}, testTime)


// coldNavigations -- full page load
// can't be used together with timespan
test('[ColdNavigation] Check ' + Home.url, async () => {
    await browser.coldNavigation("Main Page", Home.url)
}, testTime)

// timespans -- actions
// should contain ONE submit action that triggers loading between start/end block
test("[Timespan] Click on 'Elements'", async () => {
    await browser.flow.startTimespan({ stepName: "Click on 'Elements'"})
        await Home.elements.click()
        await browser.waitTillRendered()
    await browser.flow.endTimespan()
}, testTime)

test('[ColdNavigation] Check ' + TextBox.url, async () => {
    await browser.coldNavigation("TextBox Page", TextBox.url)
}, testTime)

test("[Timespan] Submit text box form", async () => {
    await TextBox.fullName.type("UI TESTER")
    await TextBox.userEmail.type("ui_tester@gmail.com")
    await TextBox.currentAddress.type("mars, musk st., 39 apt., twitter")
    await TextBox.permanentAddress.type("earth, UK, cotswolds, clarkson's farm")
    
    await browser.flow.startTimespan({ stepName: "Submit text box form"})
        await TextBox.submit.click()
        await TextBox.textBoxVerify.find()
        await browser.waitTillRendered()
    await browser.flow.endTimespan()
}, testTime)

//Check Box
test('[ColdNavigation] Check ' + CheckBox.url, async () => {
    await browser.coldNavigation("CheckBox Page", CheckBox.url)
}, testTime)

test("[Timespan] Select 'Home' checkBox", async () => {    
    await browser.flow.startTimespan({ stepName: "Select 'Public' checkBox"})    
        await CheckBox.homeCheckBox.click()
        await CheckBox.homeSelectVerify.find()
        await browser.waitTillRendered()
    await browser.flow.endTimespan()
}, testTime)

test("[Timespan] Expand 'Home' treeNode", async () => {
    await browser.flow.startTimespan({ stepName: "Expand 'Home' treeNode"})    
        await CheckBox.checkBoxExpandHome.click()
        await CheckBox.checkBoxSelectVerify.find()
        await browser.waitTillRendered()
    await browser.flow.endTimespan()
}, testTime)

test("[Timespan] Deselect 'Desktop' checkBox", async () => {    
    await browser.flow.startTimespan({ stepName: "Deselect 'Desktop' checkBox"})    
        await CheckBox.desktopCheckbox.click()
        await CheckBox.desktopCheckboxVerify.findHidden()
        await browser.waitTillRendered()
    await browser.flow.endTimespan()
}, testTime)

//Buttons
test('[ColdNavigation] Check ' + Buttons.url, async () => {
    await browser.coldNavigation("Buttons Page", Buttons.url)
}, testTime)

test("[Timespan] Simple click button", async () => {    
    await browser.flow.startTimespan({ stepName: "Simple click button"})    
        await Buttons.clickBtn.click()
        await Buttons.clickVerify.find()
        await browser.waitTillRendered()
    await browser.flow.endTimespan()
}, testTime)

test("[Timespan] Double click button", async () => {    
    await browser.flow.startTimespan({ stepName: "Double click button"})    
        await Buttons.doubleClickBtn.dobleClick()
        await Buttons.doubleClickVerify.find()
        await browser.waitTillRendered()
    await browser.flow.endTimespan()
}, testTime)

test("[Timespan] Right click button", async () => {    
    await browser.flow.startTimespan({ stepName: "Right click button"})    
        await Buttons.rightClickBtn.rightClick()
        await Buttons.rightClickVerify.find()
        await browser.waitTillRendered()
    await browser.flow.endTimespan()
}, testTime)

//Uploading
test('[ColdNavigation] Check ' + UploadDownload.url, async () => {
    await browser.coldNavigation("UploadDownload Page", UploadDownload.url)
}, testTime)

test("[Timespan] Upload file into 'Choose File'", async () => {
    await browser.flow.startTimespan({ stepName: "Upload file into 'Choose File'"})
        await UploadDownload.uploadFile.upload(uploadDir + "../testdata/files/uploadTest.txt")
        await UploadDownload.uploadVerify.find()
        await browser.waitTillRendered()
    await browser.flow.endTimespan()
}, testTime)

//Practice Form
test('[ColdNavigation] Check ' + PracticeForm.url, async () => {
    await browser.coldNavigation("Automation Practice Form", PracticeForm.url)
}, testTime)

test("[Timespan] Fill out practice form", async () => {
    await PracticeForm.firstName.type("John")
    await PracticeForm.lastName.type("Doe")
    await PracticeForm.userEmail.type("johndoe@gmail.com")
    await PracticeForm.genderMale.click()
    await PracticeForm.mobileNumber.type("1234567890")
    await PracticeForm.dateOfBirth.click()
    await PracticeForm.day.click()
    await PracticeForm.subjects.type("Maths")
    await browser.page.keyboard.press('Enter')
    await PracticeForm.hobbiesSports.click()
    await PracticeForm.uploadPicture.upload(uploadDir + "../testdata/files/uploadTest.jpg")
    await PracticeForm.currentAddress.type("123 Main St.")
    await PracticeForm.state.click()
    await PracticeForm.stateNCR.click()
    await PracticeForm.city.click()
    await PracticeForm.cityDelhi.click()

    await browser.flow.startTimespan({ stepName: "Fill out practice form" })
        await PracticeForm.submit.click()
        await PracticeForm.formSubmitVerify.find()
        await browser.waitTillRendered()
    await browser.flow.endTimespan()
}, testTime)