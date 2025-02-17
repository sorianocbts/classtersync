const axios = require('axios');
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
require('dotenv').config();

// API URL and headers
const apiUrl = `https://consumerapi.classter.com/api/students?additionalProp1=Asc&additionalProp2=Asc&additionalProp3=Asc`;
const headers = {
    'accept': 'application/json',
    'X-Institute-Tenant': process.env.X_Institute_Tenant, 
    'X-Institute-Period': '1',
    'Authorization': process.env.CLASSTER_TOKEN
};

// Get today's date in MMDDYY format
const today = new Date();
const dateStr = `${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}${today.getFullYear().toString().slice(-2)}`;
const dateHourStr = moment.tz("America/Chicago").format('MM-DD-YY hh:mm A');

// Define the correct folder and file path
const classterStudentsDir = path.join(__dirname, 'classter_students');
const outputFilePath = path.join(classterStudentsDir, `classter_students_${dateHourStr}.json`);

// Ensure the `classter_students` directory exists
if (!fs.existsSync(classterStudentsDir)) {
    fs.mkdirSync(classterStudentsDir, { recursive: true });
}

// Function to fetch and save Classter student data with pagination
async function fetchAndSaveData(page = 1, url = apiUrl, maxPages = 50) {
    if (page > maxPages) {
        console.log('Reached the maximum page limit of 50.');
        return;
    }

    try {
        // Call the API with pagination
        const response = await axios.get(`${url}&PageNumber=${page}`, { headers });
        const data = response.data;

        // Check if data is received
        if (!data || data.length === 0) {
            console.log('No more data to fetch.');
            return;
        }

        // If file exists, append data; otherwise, create a new file
        if (fs.existsSync(outputFilePath)) {
            const existingData = JSON.parse(fs.readFileSync(outputFilePath, 'utf8'));
            const combinedData = existingData.concat(data); // Append new data
            fs.writeFileSync(outputFilePath, JSON.stringify(combinedData, null, 2), 'utf8');
        } else {
            fs.writeFileSync(outputFilePath, JSON.stringify(data, null, 2), 'utf8');
        }

        console.log(`📄 Classter Students Page ${page} saved to ${outputFilePath}`);

        // Recursively fetch the next page
        await fetchAndSaveData(page + 1, apiUrl);
    } catch (error) {
        console.error(`❌ Error fetching data for page ${page}:`, error.message);
    }
}

// Export the function
module.exports = fetchAndSaveData;
