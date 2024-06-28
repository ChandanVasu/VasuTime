require('dotenv').config();

const ndtvMain = require('./models/ndtv/ndtv.js');
const indiaExpress = require('./models/indianexpress/indiaexpress.js');

(async () => {
    try {
        await ndtvMain();
        await indiaExpress();
        console.log('Both operations completed successfully.');
    } catch (error) {
        console.error('An error occurred:', error);
    }
})();
