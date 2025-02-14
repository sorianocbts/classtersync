const fs = require('fs');
const axios = require('axios');
const moment = require('moment');
require('dotenv').config();

// API Credentials
const PATHWAY_API_KEY = process.env.PATHWAY_API_KEY;
const PATHWAY_USERS_URL = `https://www.cbtspathway.org/api/v3/users`;
const LIMIT = 100; // Max limit per request
const DIRECTORY = 'pathway_users'; // Directory to save the file

// Generate dynamic filename with timestamp (MM-DD-YY-HH)
const timestamp = moment().format('MM-DD-YY-HH');
const FILE_PATH = `${DIRECTORY}/pathway_users_${timestamp}.json`;

let allUsers = [];

async function fetchPathwayUsers(offset = 0) {
    try {
        const response = await axios.get(PATHWAY_USERS_URL, {
            headers: {
                'x-api-key': PATHWAY_API_KEY
            },
            params: {
                $limit: LIMIT,
                $offset: offset
            }
        });

        const users = response.data;
        allUsers.push(...users);

        console.log(`Fetched ${users.length} users... (Total: ${allUsers.length})`);

        // If we received the full limit, there might be more data, so fetch next batch
        if (users.length === LIMIT) {
            await fetchPathwayUsers(offset + LIMIT);
        } else {
            // Ensure the directory exists
            if (!fs.existsSync(DIRECTORY)) {
                fs.mkdirSync(DIRECTORY);
            }

            // Save to JSON file with timestamped filename
            fs.writeFileSync(FILE_PATH, JSON.stringify(allUsers, null, 2));
            console.log(`All users saved to ${FILE_PATH}!`);
        }
    } catch (error) {
        console.error('Error fetching users:', error.response ? error.response.data : error.message);
    }
}

// Start fetching users
module.exports = fetchPathwayUsers;
