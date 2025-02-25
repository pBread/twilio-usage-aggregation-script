# Twilio Usage Aggregation Script

This tool helps you export and aggregate Twilio usage data across multiple accounts into CSV files for analysis and record-keeping.

## Features

- Exports complete usage records for Twilio accounts
- Supports processing multiple Twilio accounts simultaneously
- Organizes data by month and writes to separate CSV files per account
- Fast parallel processing for efficient data collection

## Requirements

- Node.js (version 14 or higher)

## Setup Instructions

### 1. Setup the Repository

```bash
git clone https://github.com/pBread/twilio-usage-aggregation-script.git
cd twilio-usage-aggregation-script
npm install
cp .env.example .env
```

### 2. Add Twilio Account Credentials

Add each account with a unique suffix (1, 2, 3, etc.)

```bash
TWILIO_ACCOUNT_SID_1=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN_1=your_auth_token_for_account_1

TWILIO_ACCOUNT_SID_2=ACyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
TWILIO_AUTH_TOKEN_2=your_auth_token_for_account_2

TWILIO_ACCOUNT_SID_3=ACzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz
TWILIO_AUTH_TOKEN_3=your_auth_token_for_account_3
```

### 3. Start

```bash
npm run start
```
