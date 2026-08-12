const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    try {
        console.log("Launching browser...");
        const browser = await puppeteer.launch({ headless: 'new' });
        const page = await browser.newPage();
        
        console.log("Navigating to http://localhost:3000/login...");
        await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });

        console.log("Clicking 'Get Started Free' button...");
        const getStartedBtn = await page.waitForFunction(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            return btns.find(b => b.textContent.includes('Get Started Free'));
        });
        
        if (getStartedBtn) {
            console.log("Found Get Started Free button. Clicking...");
            await getStartedBtn.click();
            await new Promise(r => setTimeout(r, 2000));
            
            await page.screenshot({ path: 'screenshot_login.png' });
            const dom = await page.evaluate(() => document.body.outerHTML);
            fs.writeFileSync('dom_login.html', dom);

            const hasLoginModal = dom.includes('Welcome to');
            console.log("Login Modal visible?", hasLoginModal);
        }

        await browser.close();
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
})();
