// ===================================
// Application State
// ===================================
const state = {
    voucherType: 'petty-cash',
    date: new Date().toISOString().split('T')[0],
    name: '',
    preparedBy: '',
    company: '',
    department: '',
    transactions: [],
    accountName: '',
    accountNumber: '',
    bankName: '',
    approvedBy: '',
    history: JSON.parse(localStorage.getItem('voucher_history') || '[]')
};

// ===================================
// DOM Elements
// ===================================
const elements = {
    dateInput: document.getElementById('date'),
    nameInput: document.getElementById('name'),
    preparedByInput: document.getElementById('preparedBy'),
    companyInput: document.getElementById('company'),
    departmentInput: document.getElementById('department'),
    accountNameInput: document.getElementById('accountName'),
    accountNumberInput: document.getElementById('accountNumber'),
    bankNameInput: document.getElementById('bankName'),
    approvedByInput: document.getElementById('approvedBy'),
    transactionsBody: document.getElementById('transactionsBody'),
    totalAmount: document.getElementById('totalAmount'),
    addTransactionBtn: document.getElementById('addTransactionBtn'),
    sendEmailBtn: document.getElementById('sendEmailBtn'),
    downloadPdfBtn: document.getElementById('downloadPdfBtn'),
    downloadExcelBtn: document.getElementById('downloadExcelBtn'),
    successMessage: document.getElementById('successMessage'),
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

    // Add initial transaction row
    addTransaction();

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
    elements.nameInput.addEventListener('input', (e) => state.name = e.target.value);
    elements.preparedByInput.addEventListener('input', (e) => state.preparedBy = e.target.value);
    elements.companyInput.addEventListener('input', (e) => state.company = e.target.value);
    elements.departmentInput.addEventListener('input', (e) => state.department = e.target.value);
    elements.accountNameInput.addEventListener('input', (e) => state.accountName = e.target.value);
    elements.accountNumberInput.addEventListener('input', (e) => state.accountNumber = e.target.value);
    elements.bankNameInput.addEventListener('input', (e) => state.bankName = e.target.value);
    elements.approvedByInput.addEventListener('input', (e) => state.approvedBy = e.target.value);

    // Action buttons
    elements.addTransactionBtn.addEventListener('click', addTransaction);
    elements.sendEmailBtn.addEventListener('click', handleSendEmail);
    elements.downloadPdfBtn.addEventListener('click', handleDownloadPDF);
    elements.downloadExcelBtn.addEventListener('click', handleDownloadExcel);

    // Auto-export on any data change (debounced)
    const autoExportInputs = [
        elements.dateInput,
        elements.nameInput,
        elements.preparedByInput,
        elements.companyInput,
        elements.departmentInput,
        elements.accountNameInput,
        elements.accountNumberInput,
        elements.bankNameInput,
        elements.approvedByInput
    ];

    autoExportInputs.forEach(input => {
        // Auto-export removed as requested
    });

    // Better Focus Experience: Focus input when clicking anywhere in the form group
    document.querySelectorAll('.form-group').forEach(group => {
        group.addEventListener('click', () => {
            const input = group.querySelector('.form-input');
            if (input) input.focus();
        });
    });

    // History listeners
    if (elements.clearHistoryBtn) {
        elements.clearHistoryBtn.addEventListener('click', clearHistory);
    }
}


// ===================================
// Auto-Export Timer
// ===================================
let autoExportTimer = null;

function debounceAutoExport() {
    clearTimeout(autoExportTimer);
    autoExportTimer = setTimeout(() => {
        autoExportToExcel();
    }, 1000); // Wait 1 second after last change before exporting
}

// ===================================
// Voucher Type Handler
// ===================================
function handleTypeChange(clickedBtn) {
    elements.typeButtons.forEach(btn => btn.classList.remove('active'));
    clickedBtn.classList.add('active');
    state.voucherType = clickedBtn.dataset.type;
}

// ===================================
// Transaction Management
// ===================================
function addTransaction() {
    const transaction = {
        id: Date.now(),
        quantity: '',
        description: '',
        rate: '',
        amount: 0
    };

    state.transactions.push(transaction);
    renderTransactions();
}

function deleteTransaction(id) {
    if (state.transactions.length > 1) {
        state.transactions = state.transactions.filter(t => t.id !== id);
        renderTransactions();
    }
}

function updateTransaction(id, field, value) {
    const transaction = state.transactions.find(t => t.id === id);
    if (transaction) {
        transaction[field] = value;

        // Calculate amount
        if (field === 'quantity' || field === 'rate') {
            const qty = parseFloat(transaction.quantity) || 0;
            const rate = parseFloat(transaction.rate) || 0;
            transaction.amount = qty * rate;

            // Update the specific amount cell in the UI without re-rendering everything
            const row = elements.transactionsBody.querySelector(`[data-id="${id}"]`).closest('tr');
            if (row) {
                const amountCell = row.querySelector('.amount-cell');
                if (amountCell) {
                    amountCell.textContent = `₦${transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                }
            }
        }

        updateTotal();
    }
}

function renderTransactions() {
    elements.transactionsBody.innerHTML = '';

    state.transactions.forEach(transaction => {
        const row = document.createElement('tr');
        row.className = 'transaction-row';
        row.innerHTML = `
            <td>
                <input 
                    type="number" 
                    placeholder="0" 
                    value="${transaction.quantity}"
                    data-id="${transaction.id}"
                    data-field="quantity"
                    min="0"
                    step="0.01"
                    class="table-input"
                >
            </td>
            <td>
                <input 
                    type="text" 
                    placeholder="Item description" 
                    value="${transaction.description}"
                    data-id="${transaction.id}"
                    data-field="description"
                    class="table-input"
                >
            </td>
            <td>
                <div class="currency-input-wrapper">
                    <span class="currency-symbol">₦</span>
                    <input 
                        type="number" 
                        placeholder="0.00" 
                        value="${transaction.rate}"
                        data-id="${transaction.id}"
                        data-field="rate"
                        min="0"
                        step="0.01"
                        class="table-input rate-input"
                    >
                </div>
            </td>
            <td class="amount-cell">₦${transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td style="text-align: center;">
                <button class="delete-btn" data-id="${transaction.id}" title="Delete row">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                        <path d="M6 2h6M2 4h14M3 4l1 11a2 2 0 002 2h6a2 2 0 002-2l1-11M7 8v5M11 8v5" stroke="currentColor" stroke-width="2" fill="none"/>
                    </svg>
                </button>
            </td>
        `;

        elements.transactionsBody.appendChild(row);
    });

    // Add event listeners once during render
    elements.transactionsBody.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', (e) => {
            const id = parseInt(e.target.dataset.id);
            const field = e.target.dataset.field;
            updateTransaction(id, field, e.target.value);
        });

        // Focus highlighting
        input.addEventListener('focus', (e) => {
            e.target.closest('tr').classList.add('row-active');
        });
        input.addEventListener('blur', (e) => {
            e.target.closest('tr').classList.remove('row-active');
        });
    });

    // Add event listeners to delete buttons
    elements.transactionsBody.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(btn.dataset.id);
            deleteTransaction(id);
        });
    });

    updateTotal();
}

function updateTotal() {
    const total = state.transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    elements.totalAmount.textContent = `₦${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ===================================
// Email Handler
// ===================================
// ===================================
// Email Handler (Formspree Integration)
// ===================================
async function handleSendEmail() {
    // 1. Validation
    if (!state.name || !state.company || !state.approvedBy) {
        showStatus('Please fill Name, Company, and Approver Email.', 'error');
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
    const total = state.transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    const summary = state.transactions.map((t, i) => `${i + 1}. ${t.description} (₦${t.amount.toFixed(2)})`).join('\n');

    // Save to local history immediately
    saveToHistory(voucherId);

    // 3. Create the Payload (Matching your successful React structure)
    const payload = {
        name: state.name,
        company: state.company,
        email: state.preparedBy || 'user@company.com',
        voucher_id: voucherId,
        total_amount: `₦${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        bank_details: `${state.bankName} | ${state.accountName} | ${state.accountNumber}`,
        message: `Voucher Details:\n${summary}`,
        _subject: `Cash Voucher Approval: ${voucherId} (${state.name})`,
        _template: "table",
        _captcha: "false"
    };

    try {
        showStatus('Launching Secure Transmission...', 'info');

        // THE BULLETPROOF METHOD: Direct Form Submit
        // This is the ONLY way to ensure receipt from a local file.
        // It bypasses all browser "CORS/Security" blocks.
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = `https://formsubmit.co/${state.approvedBy}`;
        form.target = '_blank'; // Opens in new tab so you don't lose your work
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

        // 4. Handle UI Success
        showStatus('Sent! Check the new tab for status.', 'success');
        showActivationGuidance(state.approvedBy);

        // Reset local form for next use
        state.transactions = [];
        addTransaction();
        updateTotal();

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

function handleSubmissionSuccess(originalBtn) {
    // Handled directly in handleSendEmail for absolute reliability
}

function showActivationGuidance(approverEmail) {
    const existing = document.getElementById('premium-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'premium-overlay';
    overlay.className = 'premium-success-overlay';
    overlay.innerHTML = `
        <div class="overlay-content">
            <div class="success-icon">✅</div>
            <h2>Voucher Sent Successfully!</h2>
            <p>The voucher has been submitted to <strong>${approverEmail}</strong></p>
            
            <div class="instruction-box">
                <strong>⚠️ IMPORTANT - First Time Setup:</strong><br><br>
                
                <strong>If this is the FIRST voucher to this email:</strong><br>
                1. The approver will receive TWO emails:<br>
                   • <strong>"Confirm Your Email"</strong> from FormSubmit<br>
                   • Your voucher (after confirmation)<br><br>
                
                2. <strong>They MUST click "Confirm"</strong> in the first email<br>
                   (Check SPAM/Junk folder if not in inbox)<br><br>
                
                3. After confirmation, they'll receive your voucher<br><br>
                
                <strong>Future vouchers will arrive instantly!</strong><br>
                This activation is only needed once per email address.
            </div>
            
            <div style="margin-top: 20px; padding: 15px; background: #fff3cd; border-radius: 8px; font-size: 14px;">
                <strong>📋 Tell the approver:</strong><br>
                "Please check your email (including spam) for a message from FormSubmit and click 'Confirm Your Email'. After that, you'll receive the voucher."
            </div>
            
            <button class="overlay-btn" onclick="this.parentElement.parentElement.remove()">I Understand</button>
        </div>
    `;
    document.body.appendChild(overlay);
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


// ===================================
// PDF Download Handler
// ===================================
function handleDownloadPDF() {
    const voucherTypeName = state.voucherType === 'petty-cash' ? 'PETTY CASH VOUCHER' : 'CASH REQUISITION';
    const total = state.transactions.reduce((sum, t) => sum + (t.amount || 0), 0);

    const printWindow = window.open('', '', 'height=800,width=1000');

    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>${voucherTypeName}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 40px;
            color: #1f2937;
            line-height: 1.6;
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 3px solid #82c24c;
        }
        
        .logo-section {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .logo {
            width: 80px;
            height: 80px;
            background: white;
            border-radius: 8px;
            padding: 5px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        .logo img {
            width: 100%;
            height: 100%;
            object-fit: contain;
        }
        
        .company-info h1 {
            font-size: 32px;
            color: #342844;
            margin-bottom: 5px;
            font-weight: 800;
        }
        
        .company-info p {
            color: #82c24c;
            font-size: 16px;
            font-weight: 600;
        }
        
        .voucher-type {
            text-align: right;
        }
        
        .voucher-type h2 {
            font-size: 32px;
            color: #342844;
            font-weight: 800;
            margin-bottom: 5px;
        }
        
        .voucher-type .date {
            color: #6b7280;
            font-size: 14px;
        }
        
        .section {
            margin-bottom: 30px;
        }
        
        .section-title {
            font-size: 18px;
            font-weight: 700;
            color: #374151;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 2px solid #e5e7eb;
        }
        
        .details-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin-bottom: 20px;
        }
        
        .detail-item {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }
        
        .detail-label {
            font-size: 12px;
            font-weight: 600;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        
        .detail-value {
            font-size: 16px;
            color: #1f2937;
            font-weight: 500;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        thead {
            background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
        }
        
        th {
            padding: 12px;
            text-align: left;
            font-size: 12px;
            font-weight: 700;
            color: #374151;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            border-bottom: 2px solid #d1d5db;
        }
        
        td {
            padding: 12px;
            border-bottom: 1px solid #e5e7eb;
            font-size: 14px;
        }
        
        tbody tr:hover {
            background: #f9fafb;
        }
        
        .total-row {
            background: linear-gradient(135deg, #e8f5e0 0%, #d4edca 100%);
            font-weight: 700;
            font-size: 16px;
        }
        
        .total-row td {
            padding: 15px 12px;
            border-bottom: none;
        }
        
        .amount {
            text-align: right;
            font-weight: 600;
        }
        
        .signature-section {
            margin-top: 60px;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 40px;
        }
        
        .signature-box {
            text-align: center;
        }
        
        .signature-line {
            border-top: 2px solid #1f2937;
            margin-top: 50px;
            padding-top: 10px;
            font-size: 12px;
            font-weight: 600;
            color: #6b7280;
        }
        
        .footer {
            margin-top: 60px;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
            text-align: center;
            color: #9ca3af;
            font-size: 12px;
        }
        
        @media print {
            body {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo-section">
            <div class="logo">
                <img src="lighthill-logo.png" alt="LightHill">
            </div>
            <div class="company-info">
                <h1>LightHill</h1>
                <p>CONGLOMERATE - Adding Values</p>
            </div>
        </div>
        <div class="voucher-type">
            <h2>${voucherTypeName}</h2>
            <p class="date">Date: ${state.date}</p>
        </div>
    </div>
    
    <div class="section">
        <h3 class="section-title">Employee Information</h3>
        <div class="details-grid">
            <div class="detail-item">
                <span class="detail-label">Employee Name</span>
                <span class="detail-value">${state.name || 'N/A'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Company</span>
                <span class="detail-value">${state.company || 'N/A'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Department</span>
                <span class="detail-value">${state.department || 'N/A'}</span>
            </div>
        </div>
    </div>
    
    <div class="section">
        <h3 class="section-title">Transaction Details</h3>
        <table>
            <thead>
                <tr>
                    <th style="width: 10%;">Qty</th>
                    <th style="width: 50%;">Description</th>
                    <th style="width: 20%;">Rate (₦)</th>
                    <th style="width: 20%;">Amount (₦)</th>
                </tr>
            </thead>
            <tbody>
                ${state.transactions.map(t => `
                    <tr>
                        <td>${t.quantity || '0'}</td>
                        <td>${t.description || 'N/A'}</td>
                        <td class="amount">₦${parseFloat(t.rate || 0).toFixed(2)}</td>
                        <td class="amount">₦${t.amount.toFixed(2)}</td>
                    </tr>
                `).join('')}
                <tr class="total-row">
                    <td colspan="3" style="text-align: right;">TOTAL AMOUNT</td>
                    <td class="amount">₦${total.toFixed(2)}</td>
                </tr>
            </tbody>
        </table>
    </div>
    
    <div class="section">
        <h3 class="section-title">Bank Details</h3>
        <div class="details-grid">
            <div class="detail-item">
                <span class="detail-label">Account Name</span>
                <span class="detail-value">${state.accountName || 'N/A'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Account Number</span>
                <span class="detail-value">${state.accountNumber || 'N/A'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Bank Name</span>
                <span class="detail-value">${state.bankName || 'N/A'}</span>
            </div>
        </div>
    </div>
    
    <div class="signature-section">
        <div class="signature-box">
            <div class="signature-line">Prepared By</div>
        </div>
        <div class="signature-box">
            <div class="signature-line">Reviewed By</div>
        </div>
        <div class="signature-box">
            <div class="signature-line">Approved By<br>${state.approvedBy || ''}</div>
        </div>
    </div>
    
    <div class="footer">
        <p>This is a computer-generated document. Generated on ${new Date().toLocaleString()}</p>
    </div>
</body>
</html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();

    // Wait for content to load, then print
    printWindow.onload = function () {
        printWindow.print();
    };
}

// ===================================
// Success Message
// ===================================
function showSuccessMessage() {
    elements.successMessage.classList.add('show');
    setTimeout(() => {
        elements.successMessage.classList.remove('show');
    }, 3000);
}

// ===================================
// Auto-Export to Excel
// ===================================
function handleDownloadExcel() {
    try {
        if (typeof XLSX === 'undefined') {
            showStatus('Export tool not loaded', 'error');
            return;
        }

        const wb = XLSX.utils.book_new();

        // 1. Current Voucher Data
        const voucherTypeName = state.voucherType === 'petty-cash' ? 'PETTY CASH VOUCHER' : 'CASH REQUISITION';
        const total = state.transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
        const currentVoucherData = [
            ['LIGHTHILL CONGLOMERATE'],
            [voucherTypeName],
            [`Date: ${state.date}`],
            ['Employee:', state.name],
            ['Total Amount:', total.toFixed(2)],
            [],
            ['Qty', 'Description', 'Rate', 'Amount']
        ];
        state.transactions.forEach(t => {
            currentVoucherData.push([t.quantity, t.description, t.rate, t.amount]);
        });
        const wsCurrent = XLSX.utils.aoa_to_sheet(currentVoucherData);
        XLSX.utils.book_append_sheet(wb, wsCurrent, 'Current Voucher');

        // 2. Master History Data
        if (state.history.length > 0) {
            const historyData = [
                ['VOUCHER MASTER HISTORY'],
                ['Timestamp', 'Date', 'Type', 'Employee', 'Company', 'Total (₦)']
            ];
            state.history.forEach(h => {
                historyData.push([h.timestamp, h.date, h.type, h.employee, h.company, h.total]);
            });
            const wsHistory = XLSX.utils.aoa_to_sheet(historyData);
            XLSX.utils.book_append_sheet(wb, wsHistory, 'Master History');
        }

        XLSX.writeFile(wb, `LightHill_Voucher_Master_${new Date().toISOString().split('T')[0]}.xlsx`);
        showStatus('Master Excel Downloaded!', 'success');
    } catch (error) {
        console.error('Export error:', error);
    }
}

// ===================================
// History Management
// ===================================
function saveToHistory(voucherId) {
    const total = state.transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    const voucherRecord = {
        id: voucherId,
        uid: Date.now(),
        date: state.date,
        type: state.voucherType === 'petty-cash' ? 'Petty Cash' : 'Cash Requisition',
        employee: state.name,
        company: state.company,
        total: total,
        timestamp: new Date().toLocaleString(),
        transactionData: JSON.stringify(state.transactions)
    };

    state.history.push(voucherRecord);
    localStorage.setItem('voucher_history', JSON.stringify(state.history));
    renderHistory();
}

function renderHistory() {
    if (!elements.historyList) return;

    elements.historyList.innerHTML = '';

    if (state.history.length === 0) {
        elements.historyList.innerHTML = '<div class="empty-history">No history yet. Send a voucher to see it here!</div>';
        return;
    }

    // Show last 6 items, newest first
    const recentHistory = [...state.history].reverse().slice(0, 10);

    recentHistory.forEach(voucher => {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerHTML = `
            <div class="history-item-header">
                <span>${voucher.type}</span>
                <span class="history-item-total">₦${voucher.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div class="history-item-date">${voucher.date} (${voucher.employee || 'No Name'})</div>
            <div style="font-size: 10px; color: #9ca3af; margin-top: 5px;">Click to load details</div>
        `;

        item.addEventListener('click', () => loadVoucherFromHistory(voucher.uid || voucher.id));
        elements.historyList.appendChild(item);
    });
}

function loadVoucherFromHistory(id) {
    const voucher = state.history.find(v => (v.uid === id || v.id === id));
    if (!voucher) return;

    if (confirm('Load this voucher details into the form? Current unsaved data will be replaced.')) {
        // Map history back to state
        state.date = voucher.date;
        state.name = voucher.employee || '';
        state.company = voucher.company || '';
        state.voucherType = voucher.type === 'Petty Cash' ? 'petty-cash' : 'cash-req';

        // Populate inputs
        elements.dateInput.value = state.date;
        elements.nameInput.value = state.name;
        elements.companyInput.value = state.company;

        // Handle type buttons
        elements.typeButtons.forEach(btn => {
            if (btn.dataset.type === state.voucherType) btn.classList.add('active');
            else btn.classList.remove('active');
        });

        // Load transactions if they were saved (optional, requires saving them in saveToHistory)
        if (voucher.transactionData) {
            state.transactions = JSON.parse(voucher.transactionData);
            renderTransactions();
        }

        showStatus('Voucher details loaded!', 'success');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function clearHistory() {
    if (confirm('Are you sure you want to clear your voucher history? This cannot be undone.')) {
        state.history = [];
        localStorage.removeItem('voucher_history');
        renderHistory();
        showStatus('History cleared.', 'info');
    }
}

// ===================================
// Initialize on DOM Load
// ===================================
document.addEventListener('DOMContentLoaded', init);

