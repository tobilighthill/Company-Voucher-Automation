# 📊 Google Sheets "Master Records" Setup

To make your vouchers permanent and visible to everyone (shared "Master Excel"), follow these 3 simple steps:

### Step 1: Prepare your Google Sheet
1. Open your Google Sheet: [Voucher Master Records](https://docs.google.com/spreadsheets/d/1wtgftAfsGB279J8suIGpcsFw8Tf3_FFekYjvzUuOflY/edit)
2. In the first row (A1 to N1), paste these exact headers:
   `Voucher ID`, `Date`, `Prepared By`, `Department`, `Company`, `Beneficiary`, `Bank`, `Account Number`, `Account Name`, `Description`, `Qty`, `Rate`, `Amount`, `Approver Email`

### Step 2: Add the Sync Script
1. In your Google Sheet, go to **Extensions** > **Apps Script**.
2. **IMPORTANT**: Delete EVERYTHING in the editor first (including `function myFunction() { ... }`). The page should be completely blank.
3. Paste ONLY the code below (do not include the word "javascript"):

```javascript
function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var headers = ["Voucher ID", "Date", "Prepared By", "Department", "Company", "Beneficiary", "Bank", "Account Number", "Account Name", "Description", "Qty", "Rate", "Amount", "Approver Email"];
  
  var payload = JSON.parse(e.postData.contents);
  var rows = Array.isArray(payload) ? payload : [payload];
  
  rows.forEach(function(row) {
    var values = headers.map(function(h) { return row[h] || ""; });
    sheet.appendRow(values);
  });
  
  return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);
}

function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var values = sheet.getDataRange().getValues();
  return ContentService.createTextOutput(JSON.stringify(values)).setMimeType(ContentService.MimeType.JSON);
}
```

3. Click **Deploy** > **New Deployment**.
4. Select type: **Web App**.
5. Description: `Voucher Sync`.
6. Execute as: **Me**.
7. Who has access: **Anyone** (This is important for the app to work).
8. Click **Deploy**, authorize permissions, and **COPY the "Web App URL"**.

### Step 3: Link the App
1. Open `script.js` in your code editor.
2. At the very top, you will see `const GOOGLE_SCRIPT_URL = '';`
3. Paste your Web App URL between the quotes.
4. Save the file.

---

### How it works now:
- **Every time you send a voucher**, it is automatically added as a new row in your Google Sheet.
- **Master Excel Button**: Now downloads the latest data directly from this Google Sheet, so everyone sees the same records!
- **History Persistence**: Even if you clear your browser history, the data stays safe in Google Sheets forever.
