const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { parse } = require('json2csv');
const fetchAndSaveData = require('./getClassterStudentData'); // Import Classter fetching function
require('dotenv').config();

// API Credentials
const PATHWAY_API_KEY = process.env.PATHWAY_API_KEY
const PATHWAY_USERS_URL = `https://www.cbtspathway.org/api/v3/users?api_key=${PATHWAY_API_KEY}&$limit=100`;
const CLASSTER_FINANCIALS_URL = `https://consumerapi.classter.com/api/financials/students`;
const CLASSTER_HEADERS = {
    'accept': 'application/json',
    'X-Institute-Tenant': process.env.X_Institute_Tenant, 
    'X-Institute-Period': '1',
    'Authorization': process.env.CLASSTER_TOKEN    
};

// Get today's date for file naming (MMDDYY format)
const today = new Date();
const dateStr = `${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}${today.getFullYear().toString().slice(-2)}`;

// Define folders
const classterStudentsPath = path.join(__dirname, 'classter_students', `classter_students_${dateStr}.json`);
const updatedRecordsDir = path.join(__dirname, 'updated_records');
const problematicRecordsDir = path.join(__dirname, 'problematic_records');

// Ensure directories exist
[updatedRecordsDir, problematicRecordsDir].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Output file paths
const updatedRecordsPath = path.join(updatedRecordsDir, `updated_records_${dateStr}.csv`);
const problematicRecordsPath = path.join(problematicRecordsDir, `problematic_records_${dateStr}.csv`);

// Function to determine financial status
async function getFinancialStatus(studentId) {
    try {
        const response = await axios.get(`${CLASSTER_FINANCIALS_URL}/${studentId}/payments`, { headers: CLASSTER_HEADERS });
        const payments = response.data;

        // Find the relevant payment arrangement
        const enrollmentFee = payments.find(payment => payment.arrangement === process.env.CLASSTER_FEE);

        if (!enrollmentFee) return null; // No matching arrangement found

        if (!enrollmentFee.isLatePayment) {
            return "clear"; // If not late
        }

        // Calculate how many days late
        const agreedDate = new Date(enrollmentFee.agreedDate);
        const today = new Date();
        const daysLate = Math.floor((today - agreedDate) / (1000 * 60 * 60 * 24));

        return daysLate > 30 ? "overdue" : "balance";

    } catch (error) {
        console.error(`❌ Error fetching financial status for student ID ${studentId}:`, error.message);
        return null;
    }
}

// Function to process Pathway users with proper pagination
async function fetchAndProcessPathwayUsers() {
    let lastUserId = null;
    let hasMoreData = true;
    const updatedRecords = [];
    const problematicRecords = [];
    let totalUsersProcessed = 0; // Track total users processed

    if (!fs.existsSync(classterStudentsPath)) {
        console.error(`❌ Classter students file not found: ${classterStudentsPath}`);
        return;
    }

    const classterData = JSON.parse(fs.readFileSync(classterStudentsPath, 'utf8'));

    // Map Classter students using student ID
    const classterMap = new Map(classterData.map(student => {
        const cpp = student.dynamicField5 ? student.dynamicField5.trim() : null;
        return [
            String(student.id), {
                registrationStatus: student.registrationStatus || null,
                program: student.grade || null,
                cpp: cpp,
                cppChurch: cpp ? student.freeTextField || null : null,
                classterEmail: student.userEmail || null,
                classterID: student.id || null
            }
        ];
    }));

    while (hasMoreData) {
        try {
            let url = PATHWAY_USERS_URL;
            if (lastUserId) url += `&$after=${lastUserId}`;

            const response = await axios.get(url);
            const users = response.data;

            if (users.length === 0) {
                hasMoreData = false;
                break;
            }

            totalUsersProcessed += users.length; // Increment total user count
            console.log(`📥 Fetched ${users.length} users. Processing...`);

            for (const user of users) {
                if (!user.studentID) continue;

                const classterRecord = classterMap.get(String(user.studentID));

                if (classterRecord) {
                    // Fetch financial status before updating
                    const financialStatus = await getFinancialStatus(user.studentID);
                    classterRecord.financialStatus = financialStatus;

                    const updateResult = await updatePathwayStudent(user.id, classterRecord);
                    updatedRecords.push(updateResult);
                } else {
                    console.log(`❌ No match found in Classter for Pathway studentID: ${user.studentID}`);
                    problematicRecords.push({
                        lmsId: user.id,
                        studentId: user.studentID,
                        issue: 'Classter student not found'
                    });
                }
            }

            lastUserId = users[users.length - 1].id;

            console.log(`✅ Finished processing batch. Waiting 3 seconds before fetching the next batch...`);
            await new Promise(resolve => setTimeout(resolve, 3000)); 
        } catch (error) {
            console.error(`❌ Error fetching Pathway users:`, error.message);
            hasMoreData = false;
        }
    }

    // Log total number of users processed
    console.log(`📊 Total Pathway users processed: ${totalUsersProcessed}`);

    if (updatedRecords.length > 0) {
        fs.writeFileSync(updatedRecordsPath, parse(updatedRecords), 'utf8');
        console.log(`🟢 Updated records saved to ${updatedRecordsPath}`);
    }

    if (problematicRecords.length > 0) {
        fs.writeFileSync(problematicRecordsPath, parse(problematicRecords), 'utf8');
        console.log(`🔴 Problematic records saved to ${problematicRecordsPath}`);
    }
}


// Function to update Pathway student with multiple fields
async function updatePathwayStudent(lmsId, classterRecord) {
    const url = `https://www.cbtspathway.org/api/v3/users/${lmsId}?api_key=${PATHWAY_API_KEY}`;
    const data = {
        custom_fields: {
            Status: classterRecord.registrationStatus,
            Program: classterRecord.program,
            CPP: classterRecord.cpp,
            "CPP Church": classterRecord.cppChurch,
            "Classter Email": classterRecord.classterEmail,
            "Classter Profile": `<a href="https://cbts.classter.com/Student/Edit?code=${classterRecord.classterID}" target="_blank" rel="noopener noreferrer">View Student Profile</a>`,
            "Financial Status": classterRecord.financialStatus || null
        }
    };

    try {
        await new Promise(resolve => setTimeout(resolve, 500)); // 0.5s delay to avoid 429 errors
        await axios.patch(url, data);
        console.log(`✅ Updated Pathway user ${lmsId} with fields:`, data.custom_fields);
        return { lmsId, ...data.custom_fields, updateStatus: 'success' };
    } catch (error) {
        console.error(`❌ Failed to update Pathway user ${lmsId}:`, error.message);
        return { lmsId, updateStatus: 'failed', error: error.message };
    }
}

// Run script with automatic Classter data fetching
// (async () => {
//     try {
//         if (!fs.existsSync(classterStudentsPath)) {
//             console.log(`❌ Classter students file not found. Fetching data first...`);
//             await fetchAndSaveData();
//         } else {
//             console.log(`✅ Using existing Classter data: ${classterStudentsPath}`);
//         }

//         await fetchAndProcessPathwayUsers();
//     } catch (error) {
//         console.error("❌ Error during execution:", error);
//     }
// })();


// Export as a function instead of auto-executing
async function runSyncProcess() {
    try {
        if (!fs.existsSync(classterStudentsPath)) {
            console.log(`❌ Classter students file not found. Fetching data first...`);
            await fetchAndSaveData();
        } else {
            console.log(`✅ Using existing Classter data: ${classterStudentsPath}`);
        }

        await fetchAndProcessPathwayUsers();
    } catch (error) {
        console.error("❌ Error during execution:", error);
    }
}

module.exports = runSyncProcess;
