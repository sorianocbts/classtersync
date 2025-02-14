const fs = require('fs');
const path = require('path');
const axios = require('axios');
const _ = require('lodash');
const moment = require('moment');
const { parse } = require('json2csv');
const fetchAndSaveData = require('./getClassterStudentData');
const fetchPathwayUsers = require('./fetchPathwayUsers');
require('dotenv').config();

const CLASSTER_FINANCIALS_URL = `https://consumerapi.classter.com/api/financials/students`;
const CLASSTER_HEADERS = {
    'accept': 'application/json',
    'X-Institute-Tenant': process.env.X_Institute_Tenant,
    'X-Institute-Period': '1',
    'Authorization': process.env.CLASSTER_TOKEN    
};

// Get current date for file naming
const dateHourStr = moment().format('MM-DD-YY-HH');

// File paths
const classterStudentsPath = path.join(__dirname, 'classter_students', `classter_students_${dateHourStr}.json`);
const pathwayUsersPath = path.join(__dirname, 'pathway_users', `pathway_users_${dateHourStr}.json`);
const updatedUsersPath = path.join(__dirname, 'updated_users', `updated_users_${dateHourStr}.json`);
const problematicRecordsPath = path.join(__dirname, 'problematic_records', `problematic_records_${dateHourStr}.csv`);

// Ensure necessary directories exist
['updated_users'].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Function to determine financial status
async function getFinancialStatus(studentId) {
    try {
        const response = await axios.get(`${CLASSTER_FINANCIALS_URL}/${studentId}/payments`, { headers: CLASSTER_HEADERS });
        const payments = response.data;

        const enrollmentFee = payments.find(payment => payment.arrangement === process.env.CLASSTER_FEE);
        if (!enrollmentFee) return null;

        if (!enrollmentFee.isLatePayment) {
            return "clear";
        }

        const agreedDate = new Date(enrollmentFee.agreedDate);
        const today = new Date();
        const daysLate = Math.floor((today - agreedDate) / (1000 * 60 * 60 * 24));

        return daysLate > 30 ? "overdue" : "balance";
    } catch (error) {
        console.error(`❌ Error fetching financial status for student ID ${studentId}:`, error.message);
        return null;
    }
}

async function fetchAndProcessPathwayUsers() {
    if (!fs.existsSync(classterStudentsPath)) {
        console.error(`❌ Classter students file not found: ${classterStudentsPath}`);
        return;
    }

    if (!fs.existsSync(pathwayUsersPath)) {
        console.log(`🔄 Fetching new Pathway users for current hour...`);
        await fetchPathwayUsers();
    }

    const classterData = JSON.parse(fs.readFileSync(classterStudentsPath, 'utf8'));
    const pathwayUsers = JSON.parse(fs.readFileSync(pathwayUsersPath, 'utf8'));

    const updatedUsers = [];
    const problematicRecords = [];

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

    for (const user of pathwayUsers) {
        if (!user.studentID) continue;

        const classterRecord = classterMap.get(String(user.studentID));
        if (!classterRecord) {
            console.log(`❌ No match found in Classter for Pathway studentID: ${user.studentID}`);
            problematicRecords.push({ lmsId: user.id, studentId: user.studentID, issue: 'Classter student not found' });
            continue;
        }

        const financialStatus = await getFinancialStatus(user.studentID);
        classterRecord.financialStatus = financialStatus;

        // Prepare update object
        const updatedUser = {
            lmsId: user.id,
            custom_fields: {
                Status: classterRecord.registrationStatus,
                Program: classterRecord.program,
                CPP: classterRecord.cpp,
                "CPP Church": classterRecord.cppChurch,
                "Classter Email": classterRecord.classterEmail,
                "Classter Profile": `<a href="https://cbts.classter.com/Student/Edit?code=${classterRecord.classterID}" target="_blank">View Student Profile</a>`,
                "Financial Status": classterRecord.financialStatus || null
            }
        };

        updatedUsers.push(updatedUser);
    }

    // Save all updates to JSON file
    fs.writeFileSync(updatedUsersPath, JSON.stringify(updatedUsers, null, 2), 'utf8');
    console.log(`🟢 Saved updated user records to ${updatedUsersPath}`);

    if (problematicRecords.length > 0) {
        fs.writeFileSync(problematicRecordsPath, parse(problematicRecords), 'utf8');
        console.log(`🔴 Problematic records saved to ${problematicRecordsPath}`);
    }

    // Now process updates in batches
    await batchUpdatePathwayUsers(updatedUsers);
}

// Function to batch update users (100 at a time)
async function batchUpdatePathwayUsers(updatedUsers) {
    const batchSize = 100;
    const url = `https://www.cbtspathway.org/api/v3/users/batch?api_key=${process.env.PATHWAY_API_KEY}`;

    for (let i = 0; i < updatedUsers.length; i += batchSize) {
        const batch = updatedUsers.slice(i, i + batchSize).map(user => ({
            id: user.lmsId, // Ensure this matches the Pathway ID
            attributes: {
                custom_fields: user.custom_fields || {} // Ensure custom fields are properly wrapped
            }
        }));

        try {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Delay to avoid rate limits
            const response = await axios.patch(url, batch, {
                headers: { "Content-Type": "application/json" }
            });
            
            console.log(`✅ Successfully updated ${batch.length} users (Batch ${i / batchSize + 1})`);
        } catch (error) {
            console.error(`❌ Failed to update batch ${i / batchSize + 1}:`, error.message);
        }
    }
}

async function runSyncProcess2() {
    try {
        if (!fs.existsSync(classterStudentsPath)) {
            console.log(`❌ Classter students file not found. Fetching data first...`);
            await fetchAndSaveData();
        }
        await fetchAndProcessPathwayUsers();
    } catch (error) {
        console.error("❌ Error during execution:", error);
    }
}

module.exports = runSyncProcess2;
