const Page = require('../core/page');
const LighthouseBrowser = require('../core/browser');
const CreateReport = require('../reporting/createReport');
const path = require('path');
const { timeLog } = require('console');
const uploadDir = path.relative(process.cwd(), __dirname)



var browserType = "desktop",
    headless = false,
    browser = new LighthouseBrowser(browserType, headless),
    TestPage = new Page();
    testTime = 100000;


// Create Page object for Google
function initTestPage() {
    TestPage.url = "https://demoqa.com/"
    TestPage.urlPracticeForm = "https://demoqa.com/automation-practice-form"
    TestPage.btn("elements", '//*[@id="app"]/div/div/div[2]/div/div[1]/div/div[3]')
    TestPage.btn("forms", '//*[@id="app"]/div/div/div[2]/div/div[2]/div/div[3]')
    TestPage.btn("alertsFrameWindows", '//*[@id="app"]/div/div/div[2]/div/div[3]/div/div[3]')
    TestPage.btn("widgets", '//*[@id="app"]/div/div/div[2]/div/div[4]/div/div[3]')
    TestPage.btn("interactions", '//*[@id="app"]/div/div/div[2]/div/div[5]/div/div[3]')
    TestPage.btn("bookStoreApplication", '//*[@id="app"]/div/div/div[2]/div/div[6]/div/div[3]')
    TestPage.btn("textBox", ".element-group [class='element-list collapse show'] #item-0")
    TestPage.input("fullName", "input[id='userName']")
    TestPage.input("userEmail", "input[id='userEmail']")
    TestPage.input("currentAddress", "textarea[id='currentAddress']")
    TestPage.input("permanentAddress", "textarea[id='permanentAddress']")
    TestPage.btn("submit", "button[id='submit']")
    TestPage.verify("textBoxVerify", "//*[@id='output']//*[@id='permanentAddress' and contains(text(),'Address')]")
    TestPage.btn("checkBox", ".element-group [class='element-list collapse show'] #item-1")
    TestPage.btn("checkBoxExpandFirst", "#tree-node > ol > li > span > button")
    TestPage.btn("checkBoxExpandSecond", "#tree-node > ol > li > ol > li:nth-child(2) > span > button")
    TestPage.btn("checkBoxExpandThird", "#tree-node > ol > li > ol ol > li:nth-child(2) > span > button")
    TestPage.btn("checkBoxSelectLabel", "#tree-node > ol > li > ol ol ol > li:nth-child(1) > span > label")
    TestPage.verify("checkBoxSelectVerify", "//*[@id='result']/span[text()='public']")
    TestPage.btn("radioButton", ".element-group [class='element-list collapse show'] #item-2")
    TestPage.btn("webTables", ".element-group [class='element-list collapse show'] #item-3")
    TestPage.btn("buttons", ".element-group [class='element-list collapse show'] #item-4")
    TestPage.btn("links", ".element-group [class='element-list collapse show'] #item-5")
    TestPage.btn("brokenLinksImages", ".element-group [class='element-list collapse show'] #item-6")
    TestPage.btn("uploadDownload", ".element-group [class='element-list collapse show'] #item-7")
    TestPage.upload("uploadFile", "input[id='uploadFile']")
    TestPage.verify("uploadVerify", "//*[@id='uploadedFilePath' and contains(text(),'uploadTest.txt')]")
    
    TestPage.input("firstName", "input[id='firstName']")
    TestPage.input("lastName", "input[id='lastName']")
    TestPage.btn("genderMale", "input[id='gender-radio-1']")
    TestPage.input("mobileNumber", "input[id='userNumber']")
    TestPage.btn("dateOfBirth", "input[id='dateOfBirthInput']")
    TestPage.btn("day", "//*[@id='dateOfBirth']/div[2]/div[2]/div/div/div[2]/div[2]/div[3]/div[2]")
    TestPage.input("subjects", "input[id='subjectsInput']")
    TestPage.upload("uploadPicture", "input[id='uploadPicture']")
    TestPage.btn("hobbiesSports", "//*[@id='hobbiesWrapper']/div[2]/div[1]")
    TestPage.btn("state", "//*[@id='state']/div/div[2]")
    TestPage.btn("stateNCR", "//*[@id='react-select-3-option-0']")
    TestPage.btn("city", "//*[@id='city']/div/div[2]")
    TestPage.btn("cityDelhi", "//*[@id='react-select-4-option-0']")
    TestPage.verify("formSubmitVerify", "//*[@id='example-modal-sizes-title-lg' and contains(text(),'Thanks for submitting the form')]")
}


beforeAll(async () =>  {
    await browser.init();
    await browser.start();   
    browser.page.isSuccess = true; // Track failed actions (any fail working with actions sets this to false)
    TestPage.init(browser.page); // Sets instance of puppeteer page to the page object
    initTestPage(); // Need to be here as elements initialized with instance of page
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
test('[ColdNavigation] Check https://demoqa.com', async () => {
    await browser.coldNavigation("Main Page", TestPage.url)
}, testTime)

// timespans -- actions
// should contain ONE submit action that triggers loading between start/end block
test("[Timespan] Click on 'Elements'", async () => {
    await browser.flow.startTimespan({ stepName: "Click on 'Elements'"})
        await TestPage.elements.click()
        await browser.waitTillRendered()
    await browser.flow.endTimespan()
}, testTime)

//Text Box
test("[Timespan] Click on 'Text Box'", async () => {
    await browser.flow.startTimespan({ stepName: "Click on 'Text Box'"})
        await TestPage.textBox.click()
        await browser.waitTillRendered()
    await browser.flow.endTimespan()
}, testTime)

test("[Timespan] Submit text box form", async () => {
    await TestPage.fullName.type("UI TESTER")
    await TestPage.userEmail.type("ui_tester@gmail.com")
    await TestPage.currentAddress.type("mars, musk st., 39 apt., twitter")
    await TestPage.permanentAddress.type("earth, UK, cotswolds, clarkson's farm")
    
    await browser.flow.startTimespan({ stepName: "Submit text box form"})
        await TestPage.submit.click()
        await TestPage.textBoxVerify.isVisible()
        await browser.waitTillRendered()
    await browser.flow.endTimespan()
}, testTime)

//Uploading
test("[Timespan] Click on 'Upload and Download'", async () => {
    await browser.flow.startTimespan({ stepName: "Click on 'Upload and Download'"})
        await TestPage.uploadDownload.click()
        await browser.waitTillRendered()
    await browser.flow.endTimespan()
}, testTime)

test("[Timespan] Upload file into 'Choose File'", async () => {
    await browser.flow.startTimespan({ stepName: "Upload file into 'Choose File'"})
        await TestPage.uploadFile.upload(uploadDir + "../testdata/files/uploadTest.txt")
        await TestPage.uploadVerify.isVisible()
        await browser.waitTillRendered()
    await browser.flow.endTimespan()
}, testTime)

//Check Box
test("[Timespan] Click on 'Check Box'", async () => {
    await browser.flow.startTimespan({ stepName: "Click on 'Check Box'"})
        await TestPage.checkBox.click()
        await browser.waitTillRendered()
    await browser.flow.endTimespan()
}, testTime)

test("[Timespan] Select 'Public' check box", async () => {
    await TestPage.checkBoxExpandFirst.click()
    await TestPage.checkBoxExpandSecond.click()
    await TestPage.checkBoxExpandThird.click()
    
    await browser.flow.startTimespan({ stepName: "Select 'Public' check box"})    
        await TestPage.checkBoxSelectLabel.click()
        await TestPage.checkBoxSelectVerify.isVisible()
        await browser.waitTillRendered()
    await browser.flow.endTimespan()
}, testTime)

//Practice Form
test('[ColdNavigation] Check https://demoqa.com/automation-practice-form', async () => {
    await browser.coldNavigation("Automation Practice Form", TestPage.urlPracticeForm)
}, testTime)

test("[Timespan] Fill out practice form", async () => {
    await TestPage.firstName.type("John")
    await TestPage.lastName.type("Doe")
    await TestPage.userEmail.type("johndoe@gmail.com")
    await TestPage.genderMale.click()
    await TestPage.mobileNumber.type("1234567890")
    await TestPage.dateOfBirth.click()
    await TestPage.day.click()
    await TestPage.subjects.type("Maths")
    await browser.page.keyboard.press('Enter');
    await TestPage.hobbiesSports.click()
    await TestPage.uploadPicture.upload(uploadDir + "../testdata/files/uploadTest.jpg")
    await TestPage.currentAddress.type("123 Main St.")
    await TestPage.state.click()
    await TestPage.stateNCR.click()
    await TestPage.city.click()
    await TestPage.cityDelhi.click()

    await browser.flow.startTimespan({ stepName: "Fill out practice form" })
        await TestPage.submit.click()
        await TestPage.formSubmitVerify.isVisible()
        await browser.waitTillRendered()
    await browser.flow.endTimespan()
    }, testTime)