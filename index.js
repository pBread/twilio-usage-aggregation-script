import { createObjectCsvWriter } from "csv-writer";
import "dotenv/config";
import fs from "fs";
import path from "path";
import twilio from "twilio";

async function main() {
  // Check if local directory exists and create it if it doesn't
  const localDir = path.join(process.cwd(), "local");
  if (!fs.existsSync(localDir)) {
    console.log("Creating local/ directory...");
    fs.mkdirSync(localDir, { recursive: true });
  }

  // Find all Twilio account SID and auth token pairs in environment variables
  const twilioAccounts = findTwilioAccounts();
  console.log(`Found ${twilioAccounts.length} Twilio accounts to process`);

  if (twilioAccounts.length === 0) {
    console.error("No Twilio accounts found in environment variables");
    process.exit(1);
  }

  // Process all accounts in parallel
  const promises = twilioAccounts.map(async (account) => {
    const { accountSid, authToken } = account;
    console.log(`Processing account: ${accountSid}`);

    const client = twilio(accountSid, authToken);
    const outputPath = path.join(localDir, `${accountSid}.csv`);

    try {
      const totalRecords = await aggregateUsageToCSV(
        client,
        outputPath,
        accountSid,
      );
      return { accountSid, success: true, totalRecords };
    } catch (error) {
      console.error(`Error processing account ${accountSid}:`, error);
      return { accountSid, success: false, error: error.message };
    }
  });

  // Wait for all accounts to be processed
  const results = await Promise.all(promises);

  // Log summary
  console.log("\nSummary of processing:");
  results.forEach((result) => {
    if (result.success) {
      console.log(
        `✅ Account ${result.accountSid.slice(0, 10)}...: ${
          result.totalRecords
        } records`,
      );
    } else {
      console.log(
        `❌ Account ${result.accountSid.slice(0, 10)}...: Failed - ${
          result.error
        }`,
      );
    }
  });
}

/**
 * Find all Twilio account SID and auth token pairs in environment variables
 * @returns {Array<{accountSid: string, authToken: string}>}
 */
function findTwilioAccounts() {
  const accounts = [];
  const envVars = Object.keys(process.env);

  // Find all SID variables that follow the pattern TWILIO_ACCOUNT_SID_X
  const sidVars = envVars.filter((key) => /^TWILIO_ACCOUNT_SID_\w+$/.test(key));

  sidVars.forEach((sidVar) => {
    // Extract the suffix (e.g., "1" from "TWILIO_ACCOUNT_SID_1")
    const suffix = sidVar.replace("TWILIO_ACCOUNT_SID_", "");
    // Look for the corresponding auth token
    const tokenVar = `TWILIO_AUTH_TOKEN_${suffix}`;

    if (process.env[tokenVar]) {
      accounts.push({
        accountSid: process.env[sidVar],
        authToken: process.env[tokenVar],
        suffix,
      });
    }
  });

  return accounts;
}

async function aggregateUsageToCSV(client, outputPath, accountSid) {
  console.log(`Will write data to: ${outputPath}`);

  // Define the CSV writer with headers
  const csvWriter = createObjectCsvWriter({
    path: outputPath,
    header: [
      { id: "accountSid", title: "Account SID" },
      { id: "category", title: "Category" },
      { id: "description", title: "Description" },
      { id: "startDate", title: "Start Date" },
      { id: "endDate", title: "End Date" },
      { id: "count", title: "Count" },
      { id: "countUnit", title: "Count Unit" },
      { id: "usage", title: "Usage" },
      { id: "usageUnit", title: "Usage Unit" },
      { id: "price", title: "Price" },
      { id: "priceUnit", title: "Price Unit" },
    ],
  });

  // Track the current month to detect changes
  let currentMonth = null;
  let currentYear = null;
  let monthlyRecords = [];
  let totalRecords = 0;
  let firstRecordReceived = false;

  console.log(`${accountSid}\tFetching usage records...`);

  await client.usage.records.monthly.each(async (item) => {
    // Log when the first record is received
    if (!firstRecordReceived) {
      console.log(`${accountSid}\tFirst record received for account`);
      firstRecordReceived = true;
    }

    // Format dates to YYYY-MM-DD
    const startDate = formatDate(item.startDate);
    const endDate = formatDate(item.endDate);

    // Extract month and year from startDate
    const date = new Date(item.startDate);
    const month = date.getMonth();
    const year = date.getFullYear();

    // Check if we've moved to a new month
    if (
      currentMonth !== null &&
      (currentMonth !== month || currentYear !== year)
    ) {
      // Write the current month's records
      await csvWriter.writeRecords(monthlyRecords);

      // Only log at the end of each month with the total count
      if (monthlyRecords.length > 1) {
        console.log(
          `${accountSid}\tWrote ${
            monthlyRecords.length
          } records for ${currentYear}-${(currentMonth + 1)
            .toString()
            .padStart(2, "0")}`,
        );
      }

      // Clear the array for the new month
      totalRecords += monthlyRecords.length;
      monthlyRecords = [];
    }

    // Update current month/year
    currentMonth = month;
    currentYear = year;

    // Create a record object with the desired fields
    const record = {
      accountSid: item.accountSid,
      category: item.category,
      description: item.description,
      startDate: startDate,
      endDate: endDate,
      count: item.count,
      countUnit: item.countUnit,
      usage: item.usage,
      usageUnit: item.usageUnit,
      price: item.price,
      priceUnit: item.priceUnit,
    };

    // Add to current month's records
    monthlyRecords.push(record);
  });

  // Write any remaining records from the last month
  if (monthlyRecords.length > 0) {
    await csvWriter.writeRecords(monthlyRecords);

    // Only log if we have more than 1 record
    if (monthlyRecords.length > 1) {
      console.log(
        `${accountSid}\tWrote ${
          monthlyRecords.length
        } records for ${currentYear}-${(currentMonth + 1)
          .toString()
          .padStart(2, "0")}`,
      );
    }

    totalRecords += monthlyRecords.length;
  }

  console.log(
    `Successfully wrote a total of ${totalRecords} records to ${outputPath}`,
  );
  return totalRecords;
}

/**
 * Formats a date object to YYYY-MM-DD string
 * @param {Date} date - Date object to format
 * @returns {string} Formatted date string
 */
function formatDate(date) {
  const d = new Date(date);
  return d.toISOString().split("T")[0]; // Returns YYYY-MM-DD
}

// Run the main function
main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
