# 📊 Google Sheets "Master Records" Setup

To make your vouchers permanent and visible to everyone (shared "Master Excel"), follow these 3 simple steps:

### Step 1: Prepare your Google Sheet
1. Open your Google Sheet: [Voucher Master Records](https://docs.google.com/spreadsheets/d/1wtgftAfsGB279J8suIGpcsFw8Tf3_FFekYjvzUuOflY/edit)
2. In the first row (A1 to P1), paste these exact headers:
   `Voucher ID`, `Date`, `Prepared By`, `Department`, `Company`, `Beneficiary`, `Bank`, `Account Number`, `Account Name`, `Description`, `Qty`, `Rate`, `Amount`, `Approver Email`, `Status`, `Approver Comment`

### Step 2: Add the Sync Script
1. In your Google Sheet, go to **Extensions** > **Apps Script**.
2. **IMPORTANT**: Delete EVERYTHING in the editor first.
3. Paste ONLY the code below:

```javascript
var HEADERS = ["Voucher ID", "Date", "Prepared By", "Department", "Company", "Beneficiary", "Bank", "Account Number", "Account Name", "Description", "Qty", "Rate", "Amount", "Approver Email", "Status", "Approver Comment"];

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var payload = JSON.parse(e.postData.contents);
  var action = payload.action || "create"; // create or update
  
  if (action === "update") {
    return handleUpdate(sheet, payload);
  } else {
    return handleCreate(sheet, payload);
  }
}

function handleCreate(sheet, payload) {
  var rows = Array.isArray(payload.data) ? payload.data : [payload.data];
  rows.forEach(function(row) {
    var values = HEADERS.map(function(h) { 
      if (h === "Status") return row[h] || "Pending";
      return row[h] || ""; 
    });
    sheet.appendRow(values);
  });
  return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);
}

function handleUpdate(sheet, payload) {
  var voucherId = payload.voucherId;
  var newStatus = payload.status;
  var comment = payload.comment || "";
  var data = sheet.getDataRange().getValues();
  
  var updated = false;
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == voucherId) {
      sheet.getRange(i + 1, 15).setValue(newStatus); // Status is column 15
      sheet.getRange(i + 1, 16).setValue(comment);   // Comment is column 16
      updated = true;
    }
  }
  return ContentService.createTextOutput(updated ? "Updated" : "Not Found").setMimeType(ContentService.MimeType.TEXT);
}

function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var values = sheet.getDataRange().getValues();
  var headers = values[0];
  var rows = values.slice(1);
  
  if (e.parameter.action === "getStatus") {
    var vId = e.parameter.voucherId;
    var match = rows.find(r => r[0] == vId);
    return ContentService.createTextOutput(JSON.stringify({
      status: match ? match[14] : "Not Found",
      comment: match ? match[15] : ""
    })).setMimeType(ContentService.MimeType.JSON);
  }

  var filteredRows = rows;
  if (e.parameter.filter === "date_range") {
    var start = new Date(e.parameter.start);
    var end = new Date(e.parameter.end);
    end.setHours(23, 59, 59);
    filteredRows = rows.filter(r => r[1] && new Date(r[1]) >= start && new Date(r[1]) <= end);
  } else if (e.parameter.query) {
    var query = e.parameter.query.toLowerCase();
    var colIndex = (e.parameter.filter === "voucher_id") ? 0 : (e.parameter.filter === "beneficiary") ? 5 : (e.parameter.filter === "prepared_by") ? 2 : -1;
    if (colIndex !== -1) filteredRows = rows.filter(r => r[colIndex] && r[colIndex].toString().toLowerCase().includes(query));
  }
  
  // Dedup rows by Voucher ID for the search result display
  var uniqueVouchers = {};
  filteredRows.forEach(row => {
    var vId = row[0];
    if (!uniqueVouchers[vId]) {
      uniqueVouchers[vId] = {
        voucherId: row[0],
        date: row[1],
        preparedBy: row[2],
        department: row[3],
        company: row[4],
        total: 0,
        status: row[14],
        comment: row[15],
        beneficiaries: []
      };
    }
    uniqueVouchers[vId].total += parseFloat(row[12]) || 0;
  });

  return ContentService.createTextOutput(JSON.stringify(Object.values(uniqueVouchers))).setMimeType(ContentService.MimeType.JSON);
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
