// ===================================
// Cloud Sync Configuration
// ===================================
// 1. Follow the instructions in GOOGLE_SHEETS_SETUP.md to get this URL
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzpqeS9CaljoT-mpyJwlSyHBdOiUCbwReQp_U_43Ny_eKqUDK0S058lIb60J-vWnz95kw/exec';
const MASTER_SHEET_ID = '1wtgftAfsGB279J8suIGpcsFw8Tf3_FFekYjvzUuOflY';

// ===================================
// Application State
// ===================================
const state = {
    voucherType: 'petty-cash',
    date: new Date().toISOString().split('T')[0],
    preparedBy: '',
    company: '',
    department: '',
    beneficiaries: [], // Array of { id, employeeName, accountName, accountNumber, bankName, transactions: [] }
    approvedBy: '',
    history: JSON.parse(localStorage.getItem('voucher_history') || '[]')
};

// ===================================
// DOM Elements
// ===================================
const elements = {
    dateInput: document.getElementById('date'),
    preparedByInput: document.getElementById('preparedBy'),
    companyInput: document.getElementById('company'),
    departmentInput: document.getElementById('department'),
    beneficiariesContainer: document.getElementById('beneficiariesContainer'),
    addBeneficiaryBtn: document.getElementById('addBeneficiaryBtn'),
    grandTotalAmount: document.getElementById('grandTotalAmount'),
    approvedByInput: document.getElementById('approvedBy'),
    sendEmailBtn: document.getElementById('sendEmailBtn'),
    downloadPdfBtn: document.getElementById('downloadPdfBtn'),
    downloadExcelBtn: document.getElementById('downloadExcelBtn'),
    typeButtons: document.querySelectorAll('.type-btn'),
    historyList: document.getElementById('historyList'),
    clearHistoryBtn: document.getElementById('clearHistoryBtn')
};

// ===================================
// Initialize Application
// ===================================
function init() {
    // Set default date
    elements.dateInput.value = state.date;

    // Add initial beneficiary
    if (state.beneficiaries.length === 0) {
        addBeneficiary();
    }

    // Render history
    renderHistory();

    // Event Listeners
    setupEventListeners();
}

// ===================================
// Event Listeners Setup
// ===================================
function setupEventListeners() {
    // Voucher type buttons
    elements.typeButtons.forEach(btn => {
        btn.addEventListener('click', () => handleTypeChange(btn));
    });

    // Form inputs
    elements.dateInput.addEventListener('change', (e) => state.date = e.target.value);
    elements.preparedByInput.addEventListener('input', (e) => state.preparedBy = e.target.value);
    elements.companyInput.addEventListener('input', (e) => state.company = e.target.value);
    elements.departmentInput.addEventListener('change', (e) => state.department = e.target.value);
    elements.approvedByInput.addEventListener('input', (e) => state.approvedBy = e.target.value);

    // Action buttons
    elements.addBeneficiaryBtn.addEventListener('click', addBeneficiary);
    elements.sendEmailBtn.addEventListener('click', handleSendEmail);
    elements.downloadPdfBtn.addEventListener('click', handleDownloadPDF);
    elements.downloadExcelBtn.addEventListener('click', handleDownloadExcel);

    // History listeners
    if (elements.clearHistoryBtn) {
        elements.clearHistoryBtn.addEventListener('click', clearHistory);
    }
}

// ===================================
// Beneficiary Management
// ===================================
function addBeneficiary() {
    if (state.beneficiaries.length >= 5) {
        showStatus('Maximum 5 beneficiaries allowed per voucher.', 'warning');
        return;
    }

    const beneficiary = {
        id: Date.now(),
        employeeName: '',
        accountName: '',
        accountNumber: '',
        bankName: '',
        transactions: [
            { id: Date.now() + 1, quantity: '', description: '', rate: '', amount: 0 }
        ]
    };

    state.beneficiaries.push(beneficiary);
    renderBeneficiaries();
}

function removeBeneficiary(id) {
    if (state.beneficiaries.length > 1) {
        state.beneficiaries = state.beneficiaries.filter(b => b.id !== id);
        renderBeneficiaries();
        updateGrandTotal();
    }
}

function updateBeneficiaryField(id, field, value) {
    const beneficiary = state.beneficiaries.find(b => b.id === id);
    if (beneficiary) {
        beneficiary[field] = value;
    }
}

// ===================================
// Transaction Management (Per Beneficiary)
// ===================================
function addTransaction(beneficiaryId) {
    const beneficiary = state.beneficiaries.find(b => b.id === beneficiaryId);
    if (beneficiary) {
        beneficiary.transactions.push({
            id: Date.now(),
            quantity: '',
            description: '',
            rate: '',
            amount: 0
        });
        renderBeneficiaries();
    }
}

function deleteTransaction(beneficiaryId, transactionId) {
    const beneficiary = state.beneficiaries.find(b => b.id === beneficiaryId);
    if (beneficiary && beneficiary.transactions.length > 1) {
        beneficiary.transactions = beneficiary.transactions.filter(t => t.id !== transactionId);
        renderBeneficiaries();
        updateGrandTotal();
    }
}

function updateTransaction(beneficiaryId, transactionId, field, value) {
    const beneficiary = state.beneficiaries.find(b => b.id === beneficiaryId);
    if (beneficiary) {
        const transaction = beneficiary.transactions.find(t => t.id === transactionId);
        if (transaction) {
            transaction[field] = value;
            if (field === 'quantity' || field === 'rate') {
                const qty = parseFloat(transaction.quantity) || 0;
                const rate = parseFloat(transaction.rate) || 0;
                transaction.amount = qty * rate;

                // Update local amounts and grand total
                const totalEl = document.getElementById(`total-${beneficiaryId}`);
                const bTotal = beneficiary.transactions.reduce((sum, t) => sum + t.amount, 0);
                if (totalEl) totalEl.textContent = `₦${bTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

                // Update specific row amount
                const row = document.querySelector(`[data-tid="${transactionId}"]`).closest('tr');
                const amountCell = row.querySelector('.amount-cell');
                if (amountCell) amountCell.textContent = `₦${transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

                updateGrandTotal();
            }
        }
    }
}

function renderBeneficiaries() {
    elements.beneficiariesContainer.innerHTML = '';

    state.beneficiaries.forEach((b, index) => {
        const block = document.createElement('div');
        block.className = 'beneficiary-block';
        block.innerHTML = `
            <div class="beneficiary-header">
                <h3 class="beneficiary-title">Beneficiary #${index + 1}</h3>
                ${state.beneficiaries.length > 1 ? `<button class="btn-remove-beneficiary" onclick="removeBeneficiary(${b.id})">✕ Remove</button>` : ''}
            </div>
            
            <div class="form-grid" style="margin-bottom: 1.5rem;">
                <div class="form-group">
                    <label>Employee Name</label>
                    <input type="text" class="form-input b-name" data-id="${b.id}" placeholder="Full Name" value="${b.employeeName}">
                </div>
                <div class="form-group">
                    <label>Account Name</label>
                    <input type="text" class="form-input b-acc-name" data-id="${b.id}" placeholder="Account Name" value="${b.accountName}">
                </div>
                <div class="form-group">
                    <label>Account Number</label>
                    <input type="text" class="form-input b-acc-num" data-id="${b.id}" placeholder="0123..." value="${b.accountNumber}">
                </div>
                <div class="form-group">
                    <label>Bank Name</label>
                    <input type="text" class="form-input b-bank" data-id="${b.id}" placeholder="Bank Name" value="${b.bankName}">
                </div>
            </div>

            <div class="table-container">
                <table class="transactions-table">
                    <thead>
                        <tr>
                            <th style="width: 80px;">Qty</th>
                            <th>Description</th>
                            <th style="width: 150px;">Rate (₦)</th>
                            <th style="width: 150px;">Amount (₦)</th>
                            <th style="width: 50px;"></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${b.transactions.map(t => `
                            <tr>
                                <td><input type="number" class="table-input qty-in" data-bid="${b.id}" data-tid="${t.id}" value="${t.quantity}"></td>
                                <td><input type="text" class="table-input desc-in" data-bid="${b.id}" data-tid="${t.id}" value="${t.description}"></td>
                                <td>
                                    <div class="currency-input-wrapper">
                                        <span class="currency-symbol">₦</span>
                                        <input type="number" class="table-input rate-in" data-bid="${b.id}" data-tid="${t.id}" value="${t.rate}">
                                    </div>
                                </td>
                                <td class="amount-cell">₦${t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                <td><button class="delete-btn" onclick="deleteTransaction(${b.id}, ${t.id})">✕</button></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem;">
                <button class="btn-add" onclick="addTransaction(${b.id})">+ Add Item</button>
                <div class="total-section">
                    <span class="total-label">Subtotal:</span>
                    <span class="total-amount" id="total-${b.id}">₦${b.transactions.reduce((s, t) => s + t.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
            </div>
        `;

        elements.beneficiariesContainer.appendChild(block);
    });

    // Rebind listeners for inputs
    elements.beneficiariesContainer.querySelectorAll('.b-name').forEach(i => i.addEventListener('input', (e) => updateBeneficiaryField(parseInt(e.target.dataset.id), 'employeeName', e.target.value)));
    elements.beneficiariesContainer.querySelectorAll('.b-acc-name').forEach(i => i.addEventListener('input', (e) => updateBeneficiaryField(parseInt(e.target.dataset.id), 'accountName', e.target.value)));
    elements.beneficiariesContainer.querySelectorAll('.b-acc-num').forEach(i => i.addEventListener('input', (e) => updateBeneficiaryField(parseInt(e.target.dataset.id), 'accountNumber', e.target.value)));
    elements.beneficiariesContainer.querySelectorAll('.b-bank').forEach(i => i.addEventListener('input', (e) => updateBeneficiaryField(parseInt(e.target.dataset.id), 'bankName', e.target.value)));

    elements.beneficiariesContainer.querySelectorAll('.qty-in').forEach(i => i.addEventListener('input', (e) => updateTransaction(parseInt(e.target.dataset.bid), parseInt(e.target.dataset.tid), 'quantity', e.target.value)));
    elements.beneficiariesContainer.querySelectorAll('.desc-in').forEach(i => i.addEventListener('input', (e) => updateTransaction(parseInt(e.target.dataset.bid), parseInt(e.target.dataset.tid), 'description', e.target.value)));
    elements.beneficiariesContainer.querySelectorAll('.rate-in').forEach(i => i.addEventListener('input', (e) => updateTransaction(parseInt(e.target.dataset.bid), parseInt(e.target.dataset.tid), 'rate', e.target.value)));

    updateGrandTotal();
}

function updateGrandTotal() {
    const total = state.beneficiaries.reduce((sum, b) => {
        return sum + b.transactions.reduce((s, t) => s + (t.amount || 0), 0);
    }, 0);
    elements.grandTotalAmount.textContent = `₦${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ===================================
// Email Handler
// ===================================
// Email Handler (Formspree Integration)
// ===================================
async function handleSendEmail() {
    // 1. Validation
    if (!state.preparedBy || !state.company || !state.approvedBy) {
        showStatus('Please fill Prepared By, Company, and Approver Email.', 'error');
        return;
    }

    // Validate beneficiaries
    const validBeneficiaries = state.beneficiaries.every(b => b.employeeName && b.bankName && b.accountNumber);
    if (!validBeneficiaries) {
        showStatus('Please ensure all beneficiaries have a name and bank details.', 'error');
        return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(state.approvedBy)) {
        showStatus('Please enter a valid email address for Approver.', 'error');
        elements.approvedByInput.focus();
        return;
    }

    const originalBtn = elements.sendEmailBtn.innerHTML;
    elements.sendEmailBtn.disabled = true;
    elements.sendEmailBtn.innerHTML = `<span class="btn-spinner"></span> Sending to ${state.approvedBy}...`;

    // 2. Prepare Unique Data
    const voucherId = `LH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const grandTotal = state.beneficiaries.reduce((sum, b) => sum + b.transactions.reduce((s, t) => s + t.amount, 0), 0);

    // Build Detailed Summary for Email
    const beneficiarySummaries = state.beneficiaries.map((b, i) => {
        const transTable = b.transactions.map(t => `- ${t.description}: ₦${t.amount.toFixed(2)}`).join('\n');
        return `BENEFICIARY #${i + 1}: ${b.employeeName}\nBank: ${b.bankName} | Acc: ${b.accountNumber}\nTransactions:\n${transTable}\nSubtotal: ₦${b.transactions.reduce((s, t) => s + t.amount, 0).toLocaleString()}`;
    }).join('\n\n' + '='.repeat(30) + '\n\n');

    const fullSummary = `Voucher ID: ${voucherId}\nPrepared By: ${state.preparedBy}\nDepartment: ${state.department || 'N/A'}\n\n${beneficiarySummaries}\n\nGRAND TOTAL: ₦${grandTotal.toLocaleString()}`;

    // Save to local history immediately (Persistent records)
    const newEntry = {
        voucherId,
        date: state.date,
        preparedBy: state.preparedBy,
        department: state.department,
        company: state.company,
        beneficiaries: JSON.parse(JSON.stringify(state.beneficiaries)),
        grandTotal,
        timestamp: new Date().toISOString()
    };
    state.history.unshift(newEntry);
    localStorage.setItem('voucher_history', JSON.stringify(state.history));
    renderHistory();

    // 3. Create the Payload - Clean structure for FormSubmit
    const payload = {
        Voucher_ID: voucherId,
        Prepared_By: state.preparedBy,
        Department: state.department,
        Company: state.company,
        Date: state.date,
        Number_of_Beneficiaries: state.beneficiaries.length,
        Grand_Total_Amount: `₦${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        Details: fullSummary,
        _subject: `Cash Voucher Approval: ${voucherId} (Prepared by: ${state.preparedBy})`,
        _template: "table",
        _captcha: "false"
    };

    try {
        showStatus('Launching Secure Transmission...', 'info');

        const form = document.createElement('form');
        form.method = 'POST';
        form.action = `https://formsubmit.co/${state.approvedBy}`;
        form.target = '_blank';
        form.style.display = 'none';

        Object.entries(payload).forEach(([key, value]) => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = value;
            form.appendChild(input);
        });

        document.body.appendChild(form);
        form.submit();

        showStatus('Sent! Check the new tab for status.', 'success');
        showActivationGuidance(state.approvedBy);

        // 4. Sync to Google Sheets (Cloud Backup)
        syncToGoogleSheets(newEntry);

        // Reset local form for next use
        state.beneficiaries = [];
        addBeneficiary();
        updateGrandTotal();

        setTimeout(() => {
            elements.sendEmailBtn.disabled = false;
            elements.sendEmailBtn.innerHTML = originalBtn;
            if (form.parentNode) document.body.removeChild(form);
        }, 3000);

    } catch (err) {
        console.error('Submission Error:', err);
        showStatus('Critical Error. Use PDF/Excel instead.', 'error');
        elements.sendEmailBtn.disabled = false;
        elements.sendEmailBtn.innerHTML = originalBtn;
    }
}

// ===================================
// PDF Download Handler
// ===================================
function handleDownloadPDF() {
    const voucherTypeName = state.voucherType === 'petty-cash' ? 'PETTY CASH VOUCHER' : 'CASH REQUISITION';
    const grandTotal = state.beneficiaries.reduce((sum, b) => sum + b.transactions.reduce((s, t) => s + t.amount, 0), 0);

    const printWindow = window.open('', '', 'height=800,width=1000');

    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>${voucherTypeName}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1f2937; line-height: 1.6; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 3px solid #82c24c; }
        .logo-section { display: flex; align-items: center; gap: 15px; }
        .logo img { width: 60px; height: 60px; object-fit: contain; }
        .company-info h1 { font-size: 24px; color: #342844; margin-bottom: 2px; }
        .voucher-type { text-align: right; }
        .voucher-type h2 { font-size: 24px; color: #342844; margin-bottom: 2px; }
        .section { margin-bottom: 20px; }
        .section-title { font-size: 16px; font-weight: 700; color: #374151; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 2px solid #e5e7eb; }
        .details-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 10px; }
        .detail-item { display: flex; flex-direction: column; }
        .detail-label { font-size: 10px; font-weight: 600; color: #6b7280; text-transform: uppercase; }
        .detail-value { font-size: 14px; font-weight: 500; }
        .beneficiary-box { border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin-bottom: 20px; background: #fafafa; }
        .beneficiary-header-pdf { display: flex; justify-content: space-between; margin-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 5px; }
        th { padding: 8px; text-align: left; font-size: 11px; background: #f3f4f6; border-bottom: 2px solid #d1d5db; }
        td { padding: 8px; border-bottom: 1px solid #e5e7eb; font-size: 12px; }
        .amount { text-align: right; }
        .grand-total-box { margin-top: 20px; padding: 15px; background: #342844; color: white; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; }
        .signature-section { margin-top: 40px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; text-align: center; }
        .sig-line { border-top: 1px solid #333; margin-top: 40px; font-size: 11px; font-weight: 600; }
        @media print { body { padding: 10px; } }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo-section">
            <div class="logo"><img src="lighthill-logo.png" alt="Logo"></div>
            <div class="company-info">
                <h1>LightHill</h1>
                <p>CONGLOMERATE - Adding Values</p>
            </div>
        </div>
        <div class="voucher-type">
            <h2>${voucherTypeName}</h2>
            <p>Date: ${state.date}</p>
        </div>
    </div>
    
    <div class="section">
        <div class="details-grid">
            <div class="detail-item"><span class="detail-label">Prepared By</span><span class="detail-value">${state.preparedBy || 'N/A'}</span></div>
            <div class="detail-item"><span class="detail-label">Company</span><span class="detail-value">${state.company || 'N/A'}</span></div>
            <div class="detail-item"><span class="detail-label">Department</span><span class="detail-value">${state.department || 'N/A'}</span></div>
        </div>
    </div>
    
    ${state.beneficiaries.map((b, i) => `
        <div class="beneficiary-box">
            <div class="beneficiary-header-pdf">
                <strong>BENEFICIARY #${i + 1}: ${b.employeeName || 'N/A'}</strong>
                <span>${b.bankName || ''} | ${b.accountNumber || ''}</span>
            </div>
            <table>
                <thead>
                    <tr><th style="width: 10%;">Qty</th><th style="width: 60%;">Description</th><th style="width: 15%;">Rate</th><th style="width: 15%;">Amount</th></tr>
                </thead>
                <tbody>
                    ${b.transactions.map(t => `
                        <tr>
                            <td>${t.quantity || '0'}</td>
                            <td>${t.description || 'N/A'}</td>
                            <td class="amount">₦${parseFloat(t.rate || 0).toLocaleString()}</td>
                            <td class="amount"><strong>₦${t.amount.toLocaleString()}</strong></td>
                        </tr>
                    `).join('')}
                    <tr>
                        <td colspan="3" style="text-align: right; border-bottom: none;"><strong>Subtotal</strong></td>
                        <td class="amount" style="border-bottom: none;"><strong>₦${b.transactions.reduce((s, t) => s + t.amount, 0).toLocaleString()}</strong></td>
                    </tr>
                </tbody>
            </table>
        </div>
    `).join('')}
    
    <div class="grand-total-box">
        <span style="font-size: 16px; font-weight: 700;">GRAND TOTAL</span>
        <span style="font-size: 24px; font-weight: 800;">₦${grandTotal.toLocaleString()}</span>
    </div>
    
    <div class="signature-section">
        <div class="sig-box"><div class="sig-line">Prepared By<br>(${state.preparedBy})</div></div>
        <div class="sig-box"><div class="sig-line">Reviewed By</div></div>
        <div class="sig-box"><div class="sig-line">Approved By<br>(${state.approvedBy})</div></div>
    </div>
</body>
</html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => printWindow.print();
}

// ===================================
// Excel Handler (Master Excel)
// ===================================
function handleDownloadExcel() {
    // If we have a Master Sheet ID, prefer downloading the shared source of truth
    if (MASTER_SHEET_ID) {
        showStatus('Downloading Shared Master Records...', 'info');
        const downloadUrl = `https://docs.google.com/spreadsheets/d/${MASTER_SHEET_ID}/export?format=xlsx`;
        window.open(downloadUrl, '_blank');
        return;
    }

    try {
        if (typeof XLSX === 'undefined') {
            showStatus('Export tool not loaded', 'error');
            return;
        }

        const wb = XLSX.utils.book_new();

        // 1. MASTER RECORDS (All history)
        // Flatten history for analysis
        const masterData = [];
        state.history.forEach(v => {
            v.beneficiaries.forEach(b => {
                b.transactions.forEach(t => {
                    masterData.push({
                        'Voucher ID': v.voucherId,
                        'Date': v.date,
                        'Prepared By': v.preparedBy,
                        'Department': v.department,
                        'Company': v.company,
                        'Beneficiary': b.employeeName,
                        'Bank': b.bankName,
                        'Account Number': b.accountNumber,
                        'Account Name': b.accountName,
                        'Description': t.description,
                        'Qty': t.quantity,
                        'Rate': t.rate,
                        'Amount': t.amount,
                        'Approver Email': v.approvedBy || ''
                    });
                });
            });
        });

        // If no history, export current
        if (masterData.length === 0) {
            state.beneficiaries.forEach(b => {
                b.transactions.forEach(t => {
                    masterData.push({
                        'Voucher ID': 'PENDING',
                        'Date': state.date,
                        'Prepared By': state.preparedBy,
                        'Department': state.department,
                        'Company': state.company,
                        'Beneficiary': b.employeeName,
                        'Bank': b.bankName,
                        'Account Number': b.accountNumber,
                        'Account Name': b.accountName,
                        'Description': t.description,
                        'Qty': t.quantity,
                        'Rate': t.rate,
                        'Amount': t.amount
                    });
                });
            });
        }

        const wsMaster = XLSX.utils.json_to_sheet(masterData);
        XLSX.utils.book_append_sheet(wb, wsMaster, "Master Records");

        // 2. Export File
        const fileName = `LightHill_Master_Excel_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
        showStatus('Master Excel Downloaded!', 'success');

    } catch (err) {
        console.error('Excel Error:', err);
        showStatus('Error generating Excel', 'error');
    }
}

// ===================================
// UI Utilities
// ===================================
function handleTypeChange(clickedBtn) {
    elements.typeButtons.forEach(btn => btn.classList.remove('active'));
    clickedBtn.classList.add('active');
    state.voucherType = clickedBtn.dataset.type;
}

function showStatus(message, type = 'info') {
    let container = document.getElementById('status-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'status-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `status-toast status-${type}`;
    toast.innerHTML = message;
    container.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

function showActivationGuidance(approverEmail) {
    const existing = document.getElementById('premium-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'premium-overlay';
    overlay.className = 'premium-success-overlay';
    overlay.innerHTML = `
        <div class="overlay-content">
            <button class="overlay-close-x" onclick="this.closest('#premium-overlay').remove()">✕</button>
            <div class="success-icon">✅</div>
            <h2>Voucher Sent Successfully!</h2>
            <p>Sent to <strong>${approverEmail}</strong></p>
            <div class="instruction-box">
                <strong>⚠️ Note:</strong> The first time you send a voucher to a new email, the approver must confirm via an email from FormSubmit.
            </div>
            <button class="overlay-btn" onclick="this.closest('#premium-overlay').remove()">Got It!</button>
        </div>
    `;
    document.body.appendChild(overlay);
}

async function syncToGoogleSheets(voucherEntry) {
    if (!GOOGLE_SCRIPT_URL) {
        console.warn('Google Sheets sync not configured. See GOOGLE_SHEETS_SETUP.md');
        return;
    }

    // Flatten transactions into rows for the sheet
    const rows = [];
    voucherEntry.beneficiaries.forEach(b => {
        b.transactions.forEach(t => {
            rows.push({
                'Voucher ID': voucherEntry.voucherId,
                'Date': voucherEntry.date,
                'Prepared By': voucherEntry.preparedBy,
                'Department': voucherEntry.department,
                'Company': voucherEntry.company,
                'Beneficiary': b.employeeName,
                'Bank': b.bankName,
                'Account Number': b.accountNumber,
                'Account Name': b.accountName,
                'Description': t.description,
                'Qty': t.quantity,
                'Rate': t.rate,
                'Amount': t.amount,
                'Approver Email': state.approvedBy
            });
        });
    });

    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors', // Apps Script requires no-cors for simple redirects
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rows)
        });
        console.log('Syncing to Google Sheets...');
        showStatus('Cloud Backup Synced!', 'success');
    } catch (err) {
        console.error('Sync Error:', err);
        showStatus('Cloud Sync Failed (Offline?)', 'warning');
    }
}

function saveToHistory(voucherId) {
    // Handled inside handleSendEmail now
}

function renderHistory() {
    if (!elements.historyList) return;

    if (state.history.length === 0) {
        elements.historyList.innerHTML = '<div class="empty-history">No history yet.</div>';
        return;
    }

    elements.historyList.innerHTML = state.history.map(h => `
        <div class="history-item">
            <div class="history-item-header">
                <span>${h.voucherId}</span>
                <span>₦${h.grandTotal.toLocaleString()}</span>
            </div>
            <div class="history-item-date">${new Date(h.timestamp).toLocaleString()}</div>
            <div style="font-size: 11px; margin-top: 5px;">
                Prep: ${h.preparedBy} | Beneficiaries: ${h.beneficiaries.length}
            </div>
        </div>
    `).join('');
}

function clearHistory() {
    if (confirm('Are you sure you want to clear your local history? This won\'t affect shared records if a database is used.')) {
        state.history = [];
        localStorage.removeItem('voucher_history');
        renderHistory();
        showStatus('History cleared', 'info');
    }
}

// Global scope helpers for onclick handlers
window.removeBeneficiary = removeBeneficiary;
window.addTransaction = addTransaction;
window.deleteTransaction = deleteTransaction;

// ===================================
// Initialize on DOM Load
// ===================================
document.addEventListener('DOMContentLoaded', init);

