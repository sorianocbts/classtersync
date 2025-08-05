const express = require('express');
const runSyncProcess = require('./updatePathwayUsersThroughClasster.js');
const runSyncProcess2 = require('./sync2.js');
require('dotenv').config();
const moment = require('moment-timezone');

function getTimestamp() {
  return moment.tz("America/Chicago").format('MM-DD-YY_HH-mm-ss');
}

const app = express();
const PORT = process.env.PORT || 3000;

// Health check route
app.get('/', (req, res) => {
    res.send('ClassterSync Web App is running!');
});

// Route to trigger the first sync process (sync)
app.get('/sync', async (req, res) => {
    try {
        console.log('🔄 Sync process started...');
        await runSyncProcess();
        res.send('✅ Sync process completed successfully.');
    } catch (error) {
        console.error('❌ Error during sync:', error);
        res.status(500).send('❌ An error occurred during sync.');
    }
});

// Route to trigger the second sync process (sync2) **without waiting**
app.get('/sync2', (req, res) => {
    console.log('🔄 Sync2 process started...');

    // Respond to the client immediately
    res.send('✅ Sync2 process has started and is running in the background.');
const dateHourStr = getTimestamp();

    // Run the sync process asynchronously
    setImmediate(async () => {
        try {
            await runSyncProcess2(dateHourStr);
            console.log('✅ Sync2 process completed successfully.');
        } catch (error) {
            console.error('❌ Error during Sync2:', error);
        }
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
