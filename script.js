// ===================================
// Cloud Sync Configuration
// ===================================
// 1. Follow the instructions in GOOGLE_SHEETS_SETUP.md to get this URL

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyIEJPd-k-ZfA2c6CR_fowWPYuFE2kQvqb8oGebL92HQKuI7s56yK-v9lgfQv7PFrGXAQ/exec';
const MASTER_SHEET_ID = '1wtgftAfsGB279J8suIGpcsFw8Tf3_FFekYjvzUuOflY';

// ===================================
// Application State
// ===================================
const state = {
    voucherId: '', // Current voucher ID if editing
    voucherType: 'petty-cash',
    date: new Date().toISOString().split('T')[0],
    preparedBy: '',
    company: '',
    department: '',
    beneficiaries: [],
    approvedBy: '',
    attachment: null, // Stores { name, data, type }
    isViewingHistory: false,
    isApprovalMode: false,
    history: JSON.parse(localStorage.getItem('voucher_history') || '[]')
};

// ===================================
// DOM Elements
// ===================================
let elements = {};

// ===================================
// Initialize Application
// ===================================
function init() {
    // Initialize element references
    elements = {
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
        clearHistoryBtn: document.getElementById('clearHistoryBtn'),
        fileInput: document.getElementById('fileInput'),
        fileNameDisplay: document.getElementById('fileNameDisplay'),
        searchQuery: document.getElementById('searchQuery'),
        searchBtn: document.getElementById('searchBtn'),
        searchResults: document.getElementById('searchResults'),
        searchFilter: document.getElementById('searchFilter'),
        startDate: document.getElementById('startDate'),
        endDate: document.getElementById('endDate'),
        searchQueryContainer: document.getElementById('searchQueryContainer'),
        dateRangeContainer: document.getElementById('dateRangeContainer'),
        searchQueryContainer: document.getElementById('searchQueryContainer'),
        dateRangeContainer: document.getElementById('dateRangeContainer'),
        dashboardBody: document.getElementById('dashboardBody'),
        refreshDashboardBtn: document.getElementById('refreshDashboardBtnInline')
    };

    // Check for approval mode in URL
    const urlParams = new URLSearchParams(window.location.search);
    const vId = urlParams.get('vId');
    const mode = urlParams.get('mode');

    if (vId) {
        if (mode === 'approve') {
            state.isApprovalMode = true;
        }
        setupApprovalMode(vId, mode);
        // Automatically switch to create-tab to see the loaded voucher
        switchTab('create-tab');
    }

    // Set default date
    if (elements.dateInput) elements.dateInput.value = state.date;

    // Add initial beneficiary
    if (state.beneficiaries.length === 0) {
        addBeneficiary();
    }

    // Render history and dashboard
    renderHistory();
    renderTrackingDashboard();

    // Event Listeners
    setupEventListeners();

    // Auto-refresh visibility for approval mode
    if (state.isApprovalMode && elements.approvedByInput) {
        elements.approvedByInput.closest('.section').style.display = 'none';
        document.querySelector('.actions-section').style.display = 'none';
    }
}

async function setupApprovalMode(voucherId, mode) {
    showStatus('Loading Voucher Data...', 'info');
    try {
        // 1. Load the actual voucher content into the form
        await viewVoucherFromDatabase(voucherId);

        // 2. Fetch the current status
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getStatus&voucherId=${voucherId}`);
        const data = await response.json();

        // 3. Show appropriate UI based on mode
        if (mode === 'approve') {
            renderApprovalPanel(voucherId, data.status);
        } else {
            renderTrackingBanner(voucherId, data.status, data.comment);
        }
    } catch (e) {
        console.error('Error loading voucher mode:', e);
        showStatus('Failed to load voucher details', 'error');
    }
}

function renderTrackingBanner(voucherId, currentStatus, comment) {
    // Remove any existing panels
    const existing = document.querySelector('.approval-panel, .tracking-banner');
    if (existing) existing.remove();

    const banner = document.createElement('div');
    banner.className = 'tracking-banner';
    const status = currentStatus || 'Pending';
    const statusClass = `badge-${status.toLowerCase()}`;

    banner.innerHTML = `
        <div class="tracking-banner-content">
            <div class="tracking-info">
                <span class="tracking-label">VIEWING VOUCHER:</span>
                <span class="tracking-id">${voucherId}</span>
                <span class="status-badge ${statusClass}">${status}</span>
            </div>
            ${comment ? `<div class="tracking-comment"><strong>Approver Comment:</strong> ${comment}</div>` : ''}
            <div class="tracking-actions-top">
                <button class="btn-close-tracking" onclick="window.location.href=window.location.pathname">✕ Exit View</button>
            </div>
        </div>
    `;
    document.querySelector('.voucher-card').prepend(banner);
}

function renderApprovalPanel(voucherId, currentStatus) {
    const panel = document.createElement('div');
    panel.className = 'approval-panel';
    panel.innerHTML = `
        <div class="approval-header">
            <h3>Approval Panel - Voucher ${voucherId}</h3>
            <span class="status-badge badge-${currentStatus?.toLowerCase()}">${currentStatus || 'Pending'}</span>
        </div>
        <div class="approval-body">
            <div class="form-group">
                <label>Approver Comment</label>
                <textarea id="approverComment" class="form-input" placeholder="Enter comments or reason for reduction..."></textarea>
            </div>
            <div class="approval-actions">
                <button class="btn btn-success" onclick="updateVoucherStatus('${voucherId}', 'Approved')">Approve Entirely</button>
                <button class="btn btn-warning" onclick="updateVoucherStatus('${voucherId}', 'Reduced')">Reduce / Adjust</button>
                <button class="btn btn-danger" onclick="updateVoucherStatus('${voucherId}', 'Rejected')">Reject</button>
            </div>
        </div>
    `;
    document.querySelector('.voucher-card').prepend(panel);
}

async function updateVoucherStatus(voucherId, status) {
    const comment = document.getElementById('approverComment').value;
    if (status === 'Reduced' && !comment) {
        showStatus('Please provide a comment for the reduction.', 'warning');
        return;
    }

    showStatus(`Updating status to ${status}...`, 'info');

    try {
        await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({
                action: 'update',
                voucherId: voucherId,
                status: status,
                comment: comment
            })
        });

        // Update local history if it exists
        const localEntry = state.history.find(h => h.voucherId === voucherId);
        if (localEntry) {
            localEntry.status = status;
            localEntry.comment = comment;
            localStorage.setItem('voucher_history', JSON.stringify(state.history));
        }

        showStatus(`Voucher ${status} Successfully!`, 'success');
        setTimeout(() => {
            // Reload to dashboard to show updated status
            window.location.href = window.location.pathname + '?tab=track-tab';
        }, 2000);
    } catch (e) {
        showStatus('Update failed', 'error');
    }
}

function switchTab(tabId) {
    // Update State
    const tabs = document.querySelectorAll('.tab-content');
    const buttons = document.querySelectorAll('.tab-btn');

    tabs.forEach(tab => {
        tab.classList.remove('active');
        if (tab.id === tabId) tab.classList.add('active');
    });

    buttons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabId) btn.classList.add('active');
    });

    // Handle scroll if needed
    if (tabId === 'track-tab') {
        refreshHistoryStatus('dashboard');
    }
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
    if (elements.addBeneficiaryBtn) {
        elements.addBeneficiaryBtn.addEventListener('click', (e) => {
            e.preventDefault();
            addBeneficiary();
        });
    }
    if (elements.sendEmailBtn) elements.sendEmailBtn.addEventListener('click', handleSendEmail);
    if (elements.downloadPdfBtn) elements.downloadPdfBtn.addEventListener('click', handleDownloadPDF);
    if (elements.downloadExcelBtn) elements.downloadExcelBtn.addEventListener('click', handleDownloadExcel);

    // File handling
    if (elements.fileInput) {
        elements.fileInput.addEventListener('change', handleFileSelect);
    }

    // Search handling
    if (elements.searchBtn) {
        elements.searchBtn.addEventListener('click', performSearch);
    }

    // History listeners
    if (elements.clearHistoryBtn) {
        elements.clearHistoryBtn.addEventListener('click', clearHistory);
    }

    // Dashboard listeners
    if (elements.refreshDashboardBtn) {
        elements.refreshDashboardBtn.addEventListener('click', () => refreshHistoryStatus('dashboard'));
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
    // 0. Manual Scrape (Safety for autofill)
    if (elements.preparedByInput) state.preparedBy = elements.preparedByInput.value;
    if (elements.companyInput) state.company = elements.companyInput.value;
    if (elements.approvedByInput) state.approvedBy = elements.approvedByInput.value;
    if (elements.dateInput) state.date = elements.dateInput.value;
    if (elements.departmentInput) state.department = elements.departmentInput.value;

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

    // 2. Prepare Unique Data (Timestamp-based for 100% uniqueness)
    const now = new Date();
    const dateStr = now.toISOString().slice(2, 10).replace(/-/g, ''); // 260105
    const timeStr = now.getHours().toString().padStart(2, '0') + now.getMinutes().toString().padStart(2, '0'); // 1613
    const randomSalt = Math.random().toString(36).substring(2, 4).toUpperCase(); // A4
    const voucherId = state.voucherId || `LH-${dateStr}-${timeStr}-${randomSalt}`;
    const trackingLink = `${window.location.protocol}//${window.location.host}${window.location.pathname}?vId=${voucherId}`;
    const grandTotal = state.beneficiaries.reduce((sum, b) => sum + b.transactions.reduce((s, t) => s + t.amount, 0), 0);

    // Build Detailed Summary for Email
    const beneficiarySummaries = state.beneficiaries.map((b, i) => {
        const transTable = b.transactions.map(t => `- ${t.description}: ₦${t.amount.toFixed(2)}`).join('\n');
        return `BENEFICIARY #${i + 1}: ${b.employeeName}\nBank: ${b.bankName} | Acc: ${b.accountNumber}\nTransactions:\n${transTable}\nSubtotal: ₦${b.transactions.reduce((s, t) => s + t.amount, 0).toLocaleString()}`;
    }).join('\n\n' + '='.repeat(30) + '\n\n');

    const fullSummary = `Voucher ID: ${voucherId}\nPrepared By: ${state.preparedBy}\nDepartment: ${state.department || 'N/A'}\n\n${beneficiarySummaries}\n\nGRAND TOTAL: ₦${grandTotal.toLocaleString()}\n\nApprove here: ${trackingLink}&mode=approve\nTrack here: ${trackingLink}`;

    // Save to local history immediately (Persistent records)
    const newEntry = {
        voucherId,
        date: state.date,
        preparedBy: state.preparedBy,
        department: state.department,
        company: state.company,
        beneficiaries: JSON.parse(JSON.stringify(state.beneficiaries)),
        grandTotal,
        status: 'Pending',
        timestamp: new Date().toISOString()
    };

    // Replace if editing, otherwise add new
    if (state.voucherId) {
        const idx = state.history.findIndex(h => h.voucherId === state.voucherId);
        if (idx !== -1) state.history[idx] = newEntry;
        else state.history.unshift(newEntry);
    } else {
        state.history.unshift(newEntry);
    }

    localStorage.setItem('voucher_history', JSON.stringify(state.history));
    renderHistory();

    // 3. Create the Payload - Clean structure for FormSubmit
    const payload = {
        _subject: `Cash Voucher Approval: ${voucherId} (Prep: ${state.preparedBy})`,
        Voucher_ID: voucherId,
        Prepared_By: state.preparedBy,
        Department: state.department || 'N/A',
        Company: state.company,
        Date: state.date,
        Total_Voucher_Amount: `₦${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        Beneficiaries_Count: state.beneficiaries.length,
        Breakdown: fullSummary,
        Tracking_Link: trackingLink,
        _template: "table",
        _captcha: "false"
    };

    try {
        console.log('Preparing submission for:', state.approvedBy);
        showStatus('Sending to ' + state.approvedBy + '...', 'info');

        // Trigger Google Sheets Sync in background
        syncToGoogleSheets(newEntry).catch(e => console.error('Sync error:', e));

        // Create a hidden form for FormSubmit.co
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = `https://formsubmit.co/${state.approvedBy.trim()}`;
        form.target = '_blank';
        form.style.display = 'none';

        // Only use multipart if there's actually a file
        const hasFile = elements.fileInput && elements.fileInput.files.length > 0;
        if (hasFile) {
            form.enctype = 'multipart/form-data';
        }

        Object.entries(payload).forEach(([key, value]) => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = value;
            form.appendChild(input);
        });

        // Add file attachment if present
        if (hasFile) {
            const fileInput = elements.fileInput;
            const fileClone = fileInput.cloneNode(true); // Technically file clones might clear in some browsers
            // Better approach: move the REAL input into the form temporarily
            const originalParent = fileInput.parentNode;
            const originalNextSibling = fileInput.nextSibling;

            fileInput.name = 'attachment';
            form.appendChild(fileInput);

            document.body.appendChild(form);
            form.submit();

            // Put it back
            originalParent.insertBefore(fileInput, originalNextSibling);
            fileInput.name = ''; // Clear name to avoid conflicts
        } else {
            document.body.appendChild(form);
            form.submit();
        }

        showStatus('SUCCESS: Check the new tab to finish!', 'success');
        showActivationGuidance(state.approvedBy);

        // Reset local form AFTER a short delay to ensure submission captured
        setTimeout(() => {
            state.voucherId = ''; // Reset ID so next one is a new entry
            state.beneficiaries = [];
            state.attachment = null;
            if (elements.fileInput) elements.fileInput.value = '';
            if (elements.fileNameDisplay) elements.fileNameDisplay.textContent = 'No file chosen (Max 5MB)';

            addBeneficiary();
            updateGrandTotal();

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
                'Approver Email': state.approvedBy,
                'Status': voucherEntry.status || 'Pending'
            });
        });
    });

    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            cache: 'no-cache',
            body: JSON.stringify({
                action: state.voucherId ? 'update' : 'create',
                data: rows,
                voucherId: voucherEntry.voucherId,
                status: voucherEntry.status
            })
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

async function refreshHistoryStatus(refreshSource = 'history') {
    if (!GOOGLE_SCRIPT_URL || state.history.length === 0) return;

    showStatus('Syncing status with cloud...', 'info');

    // Animate the correct button
    let activeBtn;
    if (refreshSource === 'dashboard') {
        activeBtn = elements.refreshDashboardBtn;
    } else {
        activeBtn = document.getElementById('refreshHistoryBtn');
    }

    if (activeBtn) activeBtn.classList.add('rotating');

    try {
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?filter=voucher_id&query=`);
        const cloudRecords = await response.json();

        state.history.forEach(entry => {
            const cloudMatch = cloudRecords.find(r => r.voucherId === entry.voucherId);
            if (cloudMatch) {
                entry.status = cloudMatch.status || 'Pending';
                entry.comment = cloudMatch.comment || '';
            }
        });

        localStorage.setItem('voucher_history', JSON.stringify(state.history));
        renderHistory();
        renderTrackingDashboard();
        showStatus('All statuses updated!', 'success');
    } catch (e) {
        console.error('Refresh error:', e);
        showStatus('Cloud sync failed', 'warning');
    } finally {
        if (activeBtn) activeBtn.classList.remove('rotating');
    }
}

function renderTrackingDashboard() {
    if (!elements.dashboardBody) return;

    if (state.history.length === 0) {
        elements.dashboardBody.innerHTML = `<tr><td colspan="7" class="empty-msg">No active vouchers tracked. Send your first voucher to begin!</td></tr>`;
        return;
    }

    elements.dashboardBody.innerHTML = state.history.map(h => {
        const vId = h.voucherId || 'N/A';
        const date = h.date || 'N/A';
        const prep = h.preparedBy || 'N/A';
        const amount = `₦${(h.grandTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
        const status = h.status || 'Pending';
        const comment = h.comment || 'No comments yet';
        const statusClass = `badge-${status.toLowerCase()}`;
        const trackingLink = `${window.location.protocol}//${window.location.host}${window.location.pathname}?vId=${vId}&mode=track`;

        return `
            <tr>
                <td><span class="tracking-id">${vId}</span></td>
                <td>${date}</td>
                <td>${prep}</td>
                <td class="history-amount">${amount}</td>
                <td><span class="status-badge ${statusClass}">${status}</span></td>
                <td><div class="comment-text" title="${comment}">${comment}</div></td>
                <td>
                    <div class="tracking-actions">
                        <button class="btn-dashboard-action btn-edit-tracked" onclick="editVoucher('${vId}')">✏️ Edit/Resubmit</button>
                        <a href="${trackingLink}" class="btn-dashboard-action btn-track-item">🔍 Track</a>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function renderHistory() {
    if (!elements.historyList) return;

    if (!Array.isArray(state.history) || state.history.length === 0) {
        elements.historyList.innerHTML = '<div class="empty-history">No history yet.</div>';
        return;
    }

    elements.historyList.innerHTML = state.history.map(h => {
        const vId = h.voucherId || h.id || 'N/A';
        const total = h.grandTotal || h.total || 0;
        const date = h.timestamp ? new Date(h.timestamp).toLocaleString() : (h.date || 'N/A');
        const prep = h.preparedBy || h.name || 'Unknown';
        const bCount = h.beneficiaries ? h.beneficiaries.length : 1;
        const status = h.status || 'Pending';
        const statusClass = `badge-${status.toLowerCase()}`;

        return `
            <div class="history-item">
                <div class="history-item-header">
                    <span class="history-v-id">${vId}</span>
                    <span class="history-amount">₦${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div class="history-meta">
                    <div class="history-item-date">${date}</div>
                    <span class="status-badge ${statusClass}">${status}</span>
                </div>
                <div class="history-details-row">
                    <span>Prep: ${prep} | Payees: ${bCount}</span>
                    <div class="history-actions">
                        <button class="btn-edit-inline" onclick="editVoucher('${vId}')">✏️ Edit</button>
                        <a href="${window.location.protocol}//${window.location.host}${window.location.pathname}?vId=${vId}&mode=track" class="track-link-small">🔍 Track</a>
                    </div>
                </div>
                ${h.comment ? `<div class="history-comment">💬 ${h.comment}</div>` : ''}
            </div>
        `;
    }).join('');
}

function editVoucher(voucherId) {
    const entry = state.history.find(h => h.voucherId === voucherId);
    if (!entry) return;

    // Prepopulate form
    state.voucherId = entry.voucherId;
    state.date = entry.date;
    state.preparedBy = entry.preparedBy;
    state.company = entry.company;
    state.department = entry.department;
    state.beneficiaries = JSON.parse(JSON.stringify(entry.beneficiaries));

    // Update UI
    if (elements.dateInput) elements.dateInput.value = state.date;
    if (elements.preparedByInput) elements.preparedByInput.value = state.preparedBy;
    if (elements.companyInput) elements.companyInput.value = state.company;
    if (elements.departmentInput) elements.departmentInput.value = state.department;

    renderBeneficiaries();
    updateGrandTotal();

    // Smooth scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showStatus('Voucher loaded for editing', 'info');
}

function clearHistory() {
    if (confirm('Are you sure you want to clear your local history? This won\'t affect shared records if a database is used.')) {
        state.history = [];
        localStorage.removeItem('voucher_history');
        renderHistory();
        showStatus('History cleared', 'info');
    }
}

// ===================================
// File & Search Handlers
// ===================================
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) { // 5MB Limit
        showStatus('File too large (Max 5MB)', 'error');
        e.target.value = '';
        return;
    }

    state.attachment = { name: file.name, type: file.type };
    elements.fileNameDisplay.textContent = `📎 Attached: ${file.name}`;
    showStatus('Document attached successfully', 'success');
}

function toggleSearchInputs() {
    const filter = elements.searchFilter.value;
    if (filter === 'date_range') {
        elements.searchQueryContainer.style.display = 'none';
        elements.dateRangeContainer.style.display = 'flex';
    } else {
        elements.searchQueryContainer.style.display = 'block';
        elements.dateRangeContainer.style.display = 'none';
        if (filter === 'voucher_id') elements.searchQuery.placeholder = "Enter Voucher ID...";
        else if (filter === 'beneficiary') elements.searchQuery.placeholder = "Enter Payee Name...";
        else elements.searchQuery.placeholder = "Enter Prepared By Name...";
    }
}

async function performSearch() {
    if (!GOOGLE_SCRIPT_URL) {
        showStatus('Cloud Search not configured', 'error');
        return;
    }

    const filter = elements.searchFilter.value;
    let queryParams = `?filter=${filter}`;

    if (filter === 'date_range') {
        const start = elements.startDate.value;
        const end = elements.endDate.value;
        if (!start || !end) {
            showStatus('Please select both start and end dates', 'warning');
            return;
        }
        queryParams += `&start=${start}&end=${end}`;
    } else {
        const query = elements.searchQuery.value.trim();
        if (!query) {
            showStatus('Please enter a search term', 'warning');
            return;
        }
        queryParams += `&query=${encodeURIComponent(query)}`;
    }

    elements.searchBtn.disabled = true;
    elements.searchBtn.innerHTML = '<span class="btn-spinner"></span> Searching...';
    elements.searchResults.innerHTML = '<div class="searching-msg">Connecting to database...</div>';

    try {
        const response = await fetch(`${GOOGLE_SCRIPT_URL}${queryParams}`);
        const data = await response.json();
        displaySearchResults(data);
    } catch (err) {
        console.error('Search error:', err);
        showStatus('Error querying database', 'error');
        elements.searchResults.innerHTML = '<div class="empty-history">Search failed. Check your connection.</div>';
    } finally {
        elements.searchBtn.disabled = false;
        elements.searchBtn.innerHTML = 'Search Database';
    }
}

function displaySearchResults(results) {
    if (!results || results.length <= 1) {
        elements.searchResults.innerHTML = '<div class="empty-history">No records found matching your search.</div>';
        return;
    }

    const rows = results.slice(1);
    const vouchers = {};
    rows.forEach(row => {
        const vid = row[0];
        if (!vouchers[vid]) vouchers[vid] = [];
        vouchers[vid].push(row);
    });

    elements.searchResults.innerHTML = Object.keys(vouchers).map(vid => {
        const vData = vouchers[vid];
        const date = vData[0][1];
        const prepBy = vData[0][2];
        const total = vData.reduce((sum, r) => sum + parseFloat(r[12] || 0), 0);

        return `
            <div class="search-item">
                <div class="search-item-header">
                    <strong>${vid}</strong>
                    <span style="color: var(--primary-color);">₦${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div class="search-item-meta">Date: ${date} | Prepared By: ${prepBy} | Payees: ${[...new Set(vData.map(r => r[5]))].length}</div>
                <button class="btn-view-doc" onclick="viewVoucherFromDatabase('${vid}')">View & Repopulate Form</button>
            </div>
        `;
    }).join('');
}

window.viewVoucherFromDatabase = async function (vid) {
    showStatus('Retrieving data...', 'info');

    try {
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?filter=voucher_id&query=${encodeURIComponent(vid)}`);
        const data = await response.json();

        if (data.length <= 1) {
            showStatus('Voucher not found in database', 'error');
            return;
        }
        const rows = data.slice(1);
        const base = rows[0];

        // Repopulate state
        state.voucherId = vid; // Ensure current voucher ID is tracked
        state.date = base[1];
        state.preparedBy = base[2];
        state.department = base[3];
        state.company = base[4];
        state.approvedBy = base[13];
        state.beneficiaries = [];

        const groups = {};
        rows.forEach(r => {
            const bName = r[5];
            if (!groups[bName]) {
                groups[bName] = {
                    employeeName: bName, bankName: r[6], accountNumber: r[7], accountName: r[8],
                    transactions: []
                };
            }
            groups[bName].transactions.push({
                quantity: r[10], description: r[9], rate: r[11], amount: parseFloat(r[12])
            });
        });

        state.beneficiaries = Object.values(groups).map((b, i) => ({ id: Date.now() + i, ...b }));

        // Update UI fields
        if (elements.preparedByInput) elements.preparedByInput.value = state.preparedBy;
        if (elements.companyInput) elements.companyInput.value = state.company;
        if (elements.departmentInput) elements.departmentInput.value = state.department;
        if (elements.approvedByInput) elements.approvedByInput.value = state.approvedBy;
        if (elements.dateInput) elements.dateInput.value = state.date;

        renderBeneficiaries();
        updateGrandTotal();
        showStatus('Voucher data loaded', 'success');

        // Scroll to top to see tracking banner/form
        window.scrollTo({ top: 0, behavior: 'smooth' });

        return true; // Return success for async chaining
    } catch (err) {
        console.error('View Data Error:', err);
        showStatus('Failed to retrieve voucher', 'error');
        return false;
    }
}

// Global scope helpers for onclick handlers
window.toggleSearchInputs = toggleSearchInputs;
window.removeBeneficiary = removeBeneficiary;
window.addTransaction = addTransaction;
window.deleteTransaction = deleteTransaction;
window.addBeneficiary = addBeneficiary;
window.switchTab = switchTab;

// ===================================
// Initialize on DOM Load
// ===================================
document.addEventListener('DOMContentLoaded', init);

