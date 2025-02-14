const express = require('express');
// const fetchAndProcessPathwayUsers = require('./updatePathwayUsersThroughClasster');
const runSyncProcess = require('./updatePathwayUsersThroughClasster.js');
const runSyncProcess2 = require('./sync2.js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Health check route
app.get('/', (req, res) => {
    res.send('ClassterSync Web App is running!');
});

// Route to trigger the script
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
// Route to trigger the script
app.get('/sync2', async (req, res) => {
    try {
        console.log('🔄 Sync process started...');
        await runSyncProcess2();
        res.send('✅ Sync process completed successfully.');
    } catch (error) {
        console.error('❌ Error during sync:', error);
        res.status(500).send('❌ An error occurred during sync.');
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
