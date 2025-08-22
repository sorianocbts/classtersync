const fs = require('fs');
const path = require('path');
const axios = require('axios');
const _ = require('lodash');
const moment = require('moment-timezone');
const { parse } = require('json2csv');
const fetchAndSaveData = require('./getClassterStudentData');
const fetchPathwayUsers = require('./fetchPathwayUsers');
require('dotenv').config();

const CLASSTER_EDUPROG_URL   = `https://consumerapi.classter.com/api/educationalprograms/students`;

const CLASSTER_HEADERS = {
  'accept': 'application/json',
  'X-Institute-Tenant': process.env.X_Institute_Tenant,
  'X-Institute-Period': '1',
  'Authorization': process.env.CLASSTER_TOKEN
};

/** Get the latest statusDate from the student's educational programs,
 *  and compute its age (in days) from today. */
// async function getLatestProgramStatus(studentId) {
//   try {
//     const res = await axios.get(
//       `${CLASSTER_EDUPROG_URL}/${studentId}`,
//       {
//         headers: CLASSTER_HEADERS,
//         params: {
//           // harmless passthroughs (present in your curl)
//           additionalProp1: 'Asc',
//           additionalProp2: 'Asc',
//           additionalProp3: 'Asc'
//         }
//       }
//     );

//     const arr = Array.isArray(res.data) ? res.data : [];
//     const dates = arr
//       .map(o => o && o.statusDate)
//       .filter(Boolean)
//       .map(d => new Date(d))
//       .filter(dt => !isNaN(dt.getTime()));

//     if (dates.length === 0) return { latestISO: null, daysOld: null };

//     const latest = new Date(Math.max(...dates.map(d => d.getTime())));
//     const today = new Date();
//     const daysOld = Math.floor((today - latest) / (1000 * 60 * 60 * 24));

//     return { latestISO: moment(latest).format("YYYY-MM-DD"), daysOld };
//   } catch (error) {
//     console.error(`❌ Error fetching edu program status for student ID ${studentId}:`, error.message);
//     return { latestISO: null, daysOld: null };
//   }
// }




async function getLatestProgramStatus(studentId) {
  try {
    const res = await axios.get(
      `${CLASSTER_EDUPROG_URL}/${studentId}`,
      {
        headers: CLASSTER_HEADERS,
        params: {
          additionalProp1: 'Asc',
          additionalProp2: 'Asc',
          additionalProp3: 'Asc'
        }
      }
    );

    const arr = Array.isArray(res.data) ? res.data : [];
    const statusDates = arr
      .map(o => o && o.statusDate)
      .filter(Boolean)
      .map(d => new Date(d))
      .filter(dt => !isNaN(dt.getTime()));

    // Compute latest status date (if any)
    const latest =
      statusDates.length > 0
        ? new Date(Math.max(...statusDates.map(d => d.getTime())))
        : null;

    // Chicago "now"
    const now = moment.tz("America/Chicago");

    // Determine semester anchor (Chicago)
    // JS months are 0-based in moment(): 0=Jan ... 7=Aug
    const year = now.year();
    const month = now.month(); // 0..11

    // Spring = Jan(0)–Jul(6), Fall = Aug(7)–Dec(11)
    const semesterAnchor = (month >= 7) // Aug or later
      ? moment.tz({ year, month: 7, day: 1 }, "America/Chicago") // Aug 1
      : moment.tz({ year, month: 0, day: 1 }, "America/Chicago"); // Jan 1

    // Anchor candidate = later of latest statusDate and semesterAnchor
    let anchorMoment = semesterAnchor.clone();
    if (latest) {
      const latestM = moment.tz(latest, "America/Chicago");
      if (latestM.isAfter(anchorMoment)) {
        anchorMoment = latestM;
      }
    }

    // If no latest date at all, we still use semester anchor per your rule
    const daysOld = now.startOf('day').diff(anchorMoment.startOf('day'), 'days');

    return {
      latestISO: latest ? moment(latest).format("YYYY-MM-DD") : null,
      daysOld
    };
  } catch (error) {
    console.error(`❌ Error fetching edu program status for student ID ${studentId}:`, error.message);
    return { latestISO: null, daysOld: null };
  }
}














async function fetchAndProcessPathwayUsers(classterStudentsPath, pathwayUsersPath, updatedUsersPath, problematicRecordsPath, dateHourStr) {
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

    // 1) Build async pairs and resolve them
const pairs = await Promise.all(
  classterData.map(async (student) => {
    const cpp = student.dynamicField5 ? student.dynamicField5.trim() : null;
    const drop5 = student.customFieldDropDown5 || null;
    const drop6 = student.customFieldDropDown6 || null;
    const semester_fee = student.dynamicField4 ? student.dynamicField4.trim() : null;

    let financialStatus = "clear";
    let latestProgramStatusISO = null;
    let programStatusAgeDays = null;

    const isActive =
      typeof student.registrationStatus === 'string' &&
      student.registrationStatus.toLowerCase() === 'active';

      const prog = await getLatestProgramStatus(student.id);
      latestProgramStatusISO = prog.latestISO;
      
    if (isActive && semester_fee !== "Fall 2025 Semester Enrollment Fee") {
        programStatusAgeDays = prog.daysOld;
      if (prog.latestISO != null && Number.isFinite(prog.daysOld)) {
        financialStatus = prog.daysOld < 30 ? "balance" : "overdue";
      }
    }

    let pricingCategory = null;
    if (drop5) {
      if (drop6 === "William Carey")      pricingCategory = `${drop5}_WC`;
      else if (drop6 === "John Cotton")   pricingCategory = `${drop5}_JC`;
      else                                pricingCategory = drop5;
    }

    return [
      String(student.id),
      {
        registrationStatus: student.registrationStatus || null,
        program: student.grade || null,
        cpp,
        cppChurch: cpp ? student.freeTextField || null : null,
        classterEmail: student.userEmail || null,
        classterID: student.id || null,
        pricingCategory: pricingCategory || null,
        semester_fee,
        financialStatus,
        latestProgramStatusISO,
        programStatusAgeDays,
      }
    ];
  })
);

// 2) Now build the real Map from resolved pairs
const classterMap = new Map(pairs);

// 3) Later: do NOT await .get()
    for (const user of pathwayUsers) {
        if (!user.studentID) continue;

        const classterRecord = classterMap.get(String(user.studentID));
        if (!classterRecord) {
            console.log(`❌ No match found in Classter for Pathway studentID: ${user.studentID}`);
            problematicRecords.push({ lmsId: user.id, studentId: user.studentID, issue: 'Classter student not found' });
            continue;
        }


        const updatedUser = {
            lmsId: user.id,
            custom_fields: {
                Status: classterRecord.registrationStatus,
                Program: classterRecord.program,
                CPP: classterRecord.cpp,
                "CPP Church": classterRecord.cppChurch,
                "Classter Email": classterRecord.classterEmail,
                "Classter Profile": `<a href="https://cbts.classter.com/Student/Edit?code=${classterRecord.classterID}" target="_blank">View Student Profile</a>`,
                "Last Updated": moment.tz("America/Chicago").format('MMMM D, YYYY [at] h:mm A z'),
                pricing_category: classterRecord.pricingCategory,
                semester_fee: classterRecord.semester_fee,
                "Financial Status": classterRecord.financialStatus || null,
                "Latest Program Status Date": classterRecord.latestProgramStatusISO,
                "Days Since Semester Invoice": classterRecord.programStatusAgeDays,
            }
        };

        updatedUsers.push(updatedUser);
    }

    fs.writeFileSync(updatedUsersPath, JSON.stringify(updatedUsers, null, 2), 'utf8');
    console.log(`🟢 Saved updated user records to ${updatedUsersPath}`);

    if (problematicRecords.length > 0) {
        fs.writeFileSync(problematicRecordsPath, parse(problematicRecords), 'utf8');
        console.log(`🔴 Problematic records saved to ${problematicRecordsPath}`);
    }

    await batchUpdatePathwayUsers(updatedUsers);
}

async function batchUpdatePathwayUsers(updatedUsers) {
    const batchSize = 100;
    const url = `https://www.cbtspathway.org/api/v3/users/batch?api_key=${process.env.PATHWAY_API_KEY}`;

    for (let i = 0; i < updatedUsers.length; i += batchSize) {
        const batch = updatedUsers.slice(i, i + batchSize).map(user => ({
            id: user.lmsId,
            attributes: {
                custom_fields: user.custom_fields || {}
            }
        }));

        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
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
        const dateHourStr = moment.tz("America/Chicago").format('MM-DD-YY_HH_A');
        // const dateHourStr = '-';
            console.log("💾 Using dateHourStr:", dateHourStr);

        const classterStudentsPath = path.join(__dirname, 'classter_students', `classter_students_${dateHourStr}.json`);
        const pathwayUsersPath = path.join(__dirname, 'pathway_users', `pathway_users_${dateHourStr}.json`);
        const updatedUsersPath = path.join(__dirname, 'updated_users', `updated_users_${dateHourStr}.json`);
        const problematicRecordsPath = path.join(__dirname, 'problematic_records', `problematic_records_${dateHourStr}.csv`);

        ['updated_users'].forEach(dir => {
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        });

        if (!fs.existsSync(classterStudentsPath)) {
            console.log(`❌ Classter students file not found. Fetching data first...`);
            await fetchAndSaveData();
        }

        await fetchAndProcessPathwayUsers(classterStudentsPath, pathwayUsersPath, updatedUsersPath, problematicRecordsPath, dateHourStr);
    } catch (error) {
        console.error("❌ Error during execution:", error);
    }
}

module.exports = runSyncProcess2;