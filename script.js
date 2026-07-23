const firebaseConfig = {
    apiKey: "AIzaSyBqoGjcCktg4P7c4P0jaATlGBDfu-L1ysc",
    authDomain: "docureel-web.firebaseapp.com",
    projectId: "docureel-web",
    storageBucket: "docureel-web.firebasestorage.app",
    messagingSenderId: "759919038746",
    appId: "1:759919038746:web:00734ef981388a8567dca3"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
let currentQuoteData = null; 

document.addEventListener("DOMContentLoaded", () => {
    loadDashboard(); 
    flatpickr("#c_date", { 
        mode: "multiple", 
        dateFormat: "Y-m-d", 
        altInput: true, 
        altFormat: "d M Y" 
    });
});

let isDashboardUnlocked = false; 
const dashboardPassword = "1234"; 
let targetSectionId = "";

function showSection(sectionId) {
    if (sectionId === 'history-section' && !isDashboardUnlocked) {
        targetSectionId = sectionId;
        document.getElementById('custom-pass-modal').style.display = 'flex';
        return;
    }
    executeShowSection(sectionId);
}

function executeShowSection(sectionId) {
    document.getElementById('form-section').style.display = 'none';
    document.getElementById('history-section').style.display = 'none';
    document.getElementById('output-section').style.display = 'none';
    
    document.getElementById(sectionId).style.display = 'block';
    
    document.getElementById('tab-form').classList.remove('active-tab');
    document.getElementById('tab-history').classList.remove('active-tab');
    
    if(sectionId === 'form-section') {
        document.getElementById('tab-form').classList.add('active-tab');
    } else if(sectionId === 'history-section') {
        document.getElementById('tab-history').classList.add('active-tab');
        loadDashboard();
    }
}

function closePassModal() {
    document.getElementById('custom-pass-modal').style.display = 'none';
}

function checkPassword() {
    if (document.getElementById('custom-pass-input').value === dashboardPassword) {
        isDashboardUnlocked = true;
        document.getElementById('custom-pass-modal').style.display = 'none';
        executeShowSection(targetSectionId);
    } else {
        document.getElementById('pass-error-msg').style.display = 'block';
    }
}

function addExtraRow() {
    const container = document.getElementById('extra-services-container');
    const row = document.createElement('div');
    row.className = 'extra-service-row';
    row.style.cssText = 'display: flex; gap: 10px; margin-bottom: 10px;';
    row.innerHTML = `
        <input type="text" class="form-control e_name_input" placeholder="Service Name">
        <input type="number" class="form-control e_price_input" placeholder="Price" min="0">
        <button type="button" class="btn-remove-extra" onclick="removeExtraRow(this)">❌</button>
    `;
    container.appendChild(row);
    updateRemoveButtons();
}

function removeExtraRow(btn) {
    btn.parentElement.remove();
    updateRemoveButtons();
}

function updateRemoveButtons() {
    const rows = document.querySelectorAll('.extra-service-row');
    rows.forEach((row) => {
        row.querySelector('.btn-remove-extra').style.display = rows.length === 1 ? 'none' : 'block';
    });
}

function clearFormIfNew() {
    document.getElementById('quotation-form').reset();
    document.getElementById('firebase_doc_id').value = '';
    document.getElementById('edit_id').value = '';
    
    const dateInput = document.getElementById('c_date');
    if (dateInput._flatpickr) {
        dateInput._flatpickr.clear();
    }
    
    document.getElementById('due_pay').disabled = true;
    document.getElementById('form-title').innerText = "Create Quotation";
    document.getElementById('submit-btn-text').innerText = "Generate Quotation ⬇️";
}
document.getElementById('quotation-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('submit-btn-text');
    submitBtn.innerText = "Saving... ⏳";
    submitBtn.disabled = true;
    
    let extraServices = [];
    let totalExtraPrice = 0;
    
    document.querySelectorAll('.extra-service-row').forEach(row => {
        const name = row.querySelector('.e_name_input').value.trim();
        const price = parseInt(row.querySelector('.e_price_input').value) || 0;
        if (name || price > 0) {
            extraServices.push({ name: name, price: price });
            totalExtraPrice += price;
        }
    });

    const pPrice = parseInt(document.getElementById('p_price').value) || 0;
    const numShifts = parseInt(document.getElementById('c_num_shifts').value) || 1;
    const totalPackagePrice = pPrice * numShifts;
    const tCharge = parseInt(document.getElementById('t_charge').value) || 0;
    const subTotal = totalPackagePrice + totalExtraPrice + tCharge;

    const discountAmount = Math.round(subTotal * ((parseFloat(document.getElementById('discount_pct').value) || 0) / 100)); 
    const vatAmount = Math.round((subTotal - discountAmount) * ((parseFloat(document.getElementById('vat_pct').value) || 0) / 100));
    const grandTotal = (subTotal - discountAmount) + vatAmount;
    
    const advPay = parseInt(document.getElementById('adv_pay').value) || 0;
    const duePay = parseInt(document.getElementById('due_pay').value) || 0;
    const totalPaid = advPay + duePay;

    let dateStr = "";
    const rawDate = document.getElementById('c_date').value;
    if (rawDate) {
        dateStr = rawDate.split(', ').map(d => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })).join(', ');
    }

    let quoteData = {
        id: document.getElementById('edit_id').value ? parseInt(document.getElementById('edit_id').value) : Date.now(),
        currencyCode: document.getElementById('c_currency').value,
        currencySymbol: document.getElementById('c_currency').value === 'USD' ? '$' : '৳',
        showTerms: document.getElementById('c_show_terms').checked,
        showContact: document.getElementById('c_show_contact').checked,
        name: document.getElementById('c_name').value,
        phone: document.getElementById('c_phone').value,
        event: document.getElementById('c_event').value,
        numShifts: numShifts,
        shiftDetails: document.getElementById('c_shift_details').value,
        photoCount: document.getElementById('c_photo_count').value,
        cinemaCount: document.getElementById('c_cinema_count').value,
        gearDetails: document.getElementById('c_gear').value || 'N/A',
        rawDate: rawDate,
        dateStr: dateStr,
        venue: document.getElementById('c_venue').value,
        payment: document.getElementById('c_payment').value,
        prints: document.getElementById('c_prints').value || 'N/A',
        delivery: document.getElementById('c_delivery').value || 'N/A',
        deliveryTimeText: document.getElementById('c_delivery_time').value === "On Season" ? "All Photo 30 Days, Cine 45 Days" : "All Photo 15 Days, Cine 30 Days",
        pName: document.getElementById('p_name').value,
        pPriceOriginal: pPrice,
        totalPackagePrice: totalPackagePrice,
        extraServices: extraServices,
        totalExtraPrice: totalExtraPrice,
        tCharge: tCharge,
        discountPct: document.getElementById('discount_pct').value,
        discountAmount: discountAmount,
        vatPct: document.getElementById('vat_pct').value,
        vatAmount: vatAmount,
        grandTotal: grandTotal,
        advPay: advPay,
        duePay: duePay,
        totalPaid: totalPaid,
        dueAmount: grandTotal - totalPaid,
        signatureOption: document.getElementById('c_signature').value
    };

    try {
        if (document.getElementById('firebase_doc_id').value) {
            const docRef = db.collection("quotations").doc(document.getElementById('firebase_doc_id').value);
            const docSnap = await docRef.get();
            if (docSnap.exists) {
                quoteData.qNo = docSnap.data().qNo;
                quoteData.generateDateStr = docSnap.data().generateDateStr;
                quoteData.timestamp = docSnap.data().timestamp;
            }
            await docRef.update(quoteData);
            quoteData.firebaseDocId = document.getElementById('firebase_doc_id').value;
        } else {
            const today = new Date();
            let lastSerial = parseInt(localStorage.getItem('docuReelSerialCounter')) || 1000;
            lastSerial++;
            localStorage.setItem('docuReelSerialCounter', lastSerial.toString());
            
            quoteData.qNo = `DOC-${today.getFullYear()}${(today.getMonth()+1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}-${lastSerial}`;
            quoteData.generateDateStr = today.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
            quoteData.timestamp = firebase.firestore.FieldValue.serverTimestamp();
            
            const docRef = await db.collection("quotations").add(quoteData);
            quoteData.firebaseDocId = docRef.id; 
        }
        
        submitBtn.innerText = "Generate Quotation ⬇️";
        submitBtn.disabled = false;
        clearFormIfNew();
        renderQuotation(quoteData);
        
    } catch (error) {
        alert("Database Error: " + error.message);
        submitBtn.disabled = false;
        submitBtn.innerText = "Generate Quotation ⬇️";
    }
});
function renderQuotation(data) {
    currentQuoteData = data; const sym = data.currencySymbol || '৳';
    document.getElementById('paid_stamp').style.display = data.dueAmount <= 0 ? 'block' : 'none';
    
    const sigImg = document.getElementById('out_sig_img'); const sigName = document.getElementById('out_sig_name');
    if (data.signatureOption === 'Shovon' || data.signatureOption === 'Sazzid') {
        sigImg.src = data.signatureOption === 'Shovon' ? 'signature1.png' : 'signature2.png';
        sigImg.style.display = 'block'; sigName.innerText = data.signatureOption;
    } else { sigImg.style.display = 'none'; sigName.innerText = 'DocuReel'; }

    document.getElementById('terms-page').style.display = data.showTerms !== false ? 'block' : 'none';
    document.getElementById('company-details-block').style.display = data.showContact !== false ? 'block' : 'none';
    
    document.getElementById('out_qno').innerText = data.qNo; document.getElementById('out_today').innerText = data.generateDateStr;
    document.getElementById('out_name').innerText = data.name; document.getElementById('out_phone').innerText = data.phone;
    document.getElementById('out_event').innerText = data.event; document.getElementById('out_shift').innerText = `${data.numShifts} (${data.shiftDetails})`;
    document.getElementById('out_gear').innerText = data.gearDetails || "Not Specified"; document.getElementById('out_date').innerText = data.dateStr;
    document.getElementById('out_venue').innerText = data.venue; document.getElementById('out_payment').innerText = data.payment;
    document.getElementById('out_prints').innerText = data.prints || 'N/A'; document.getElementById('out_delivery').innerText = data.delivery || 'N/A';
    document.getElementById('out_delivery_time').innerText = data.deliveryTimeText || "Not Specified";
    document.getElementById('out_grand_currency').innerText = sym;

    let listHTML = "";
    const pNameDisplay = data.numShifts > 1 ? `${data.pName} (x${data.numShifts} Shifts)` : data.pName;
    listHTML += `<div class="classic-pack-row"><span>${pNameDisplay}</span><span class="dots"></span><span>${sym}${data.totalPackagePrice.toLocaleString()}</span></div>`;
    if (data.extraServices) { data.extraServices.forEach(ext => { listHTML += `<div class="classic-pack-row"><span>${ext.name}</span><span class="dots"></span><span>${sym}${ext.price.toLocaleString()}</span></div>`; }); }
    if (data.tCharge > 0) listHTML += `<div class="classic-pack-row"><span>Travel Charge</span><span class="dots"></span><span>${sym}${data.tCharge.toLocaleString()}</span></div>`;
    if (data.discountAmount > 0) listHTML += `<div class="classic-pack-row" style="color: #dc3545;"><span>Discount (${data.discountPct}%)</span><span class="dots"></span><span>- ${sym}${data.discountAmount.toLocaleString()}</span></div>`;
    if (data.vatAmount > 0) listHTML += `<div class="classic-pack-row"><span>VAT (${data.vatPct}%)</span><span class="dots"></span><span>+ ${sym}${data.vatAmount.toLocaleString()}</span></div>`;
    
    document.getElementById('classic-package-list').innerHTML = listHTML;
    document.getElementById('out_total').innerText = data.grandTotal.toLocaleString();
    document.getElementById('out_advance').innerText = sym + (data.totalPaid || data.advPay).toLocaleString();
    document.getElementById('out_due').innerText = sym + data.dueAmount.toLocaleString();
    
    showSection('output-section');
    resetZoom(); // Generate করার পর অটোমেটিক জুম আউট হয়ে স্ক্রিনে ফিট হয়ে যাবে
}

// ================= ZOOM CONTROLS =================
let currentScale = window.innerWidth < 800 ? 0.45 : 0.9;
function zoomIn() { currentScale += 0.1; applyZoom(); }
function zoomOut() { currentScale = Math.max(0.3, currentScale - 0.1); applyZoom(); }
function resetZoom() { currentScale = window.innerWidth < 800 ? 0.45 : 0.9; applyZoom(); }
function applyZoom() {
    const docContainer = document.getElementById('quotation-doc');
    if(docContainer) { docContainer.style.transform = `scale(${currentScale})`; }
}
// ===============================================

async function loadDashboard() {
    const tbody = document.getElementById('history-list'); tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Loading... ⏳</td></tr>';
    try {
        const snapshot = await db.collection("quotations").orderBy("timestamp", "desc").get();
        let incBDT = 0, dueBDT = 0; tbody.innerHTML = '';
        if(snapshot.empty) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No history found.</td></tr>';
        
        snapshot.forEach(doc => {
            let item = doc.data(); item.firebaseDocId = doc.id;
            const currentTotalPaid = item.totalPaid || item.advPay;
            if (!item.currencyCode || item.currencyCode === 'BDT') { incBDT += currentTotalPaid; dueBDT += item.dueAmount; }
            const sym = item.currencySymbol || '৳';
            const statusLabel = item.dueAmount <= 0 ? '✅ PAID' : `Due: ${sym}${item.dueAmount.toLocaleString()}`;
            tbody.innerHTML += `<tr><td>${item.generateDateStr}</td><td><b>${item.name}</b><br><small>${item.phone}</small></td><td>${item.event}</td><td>${sym}${item.grandTotal.toLocaleString()}</td><td style="color: ${item.dueAmount <= 0 ? '#28a745' : '#dc3545'}; font-weight: bold;">${statusLabel}</td><td><button class="btn-view" onclick="viewHistoryItem('${item.firebaseDocId}')">👁️</button><button class="btn-edit-item" onclick="editHistoryItem('${item.firebaseDocId}')">✏️</button><button class="btn-delete-item" onclick="deleteHistoryItem('${item.firebaseDocId}')">🗑️</button></td></tr>`;
        });
        document.getElementById('inc-bdt').innerText = `৳${incBDT.toLocaleString()}`; document.getElementById('due-bdt').innerText = `৳${dueBDT.toLocaleString()}`;
    } catch (error) {}
}

async function viewHistoryItem(docId) { try { const doc = await db.collection("quotations").doc(docId).get(); if(doc.exists) { let data = doc.data(); data.firebaseDocId = doc.id; renderQuotation(data); } } catch (e) {} }

async function editHistoryItem(docId) {
    try {
        const doc = await db.collection("quotations").doc(docId).get();
        if(doc.exists) {
            const item = doc.data();
            document.getElementById('firebase_doc_id').value = doc.id; document.getElementById('edit_id').value = item.id;
            document.getElementById('c_name').value = item.name; document.getElementById('c_phone').value = item.phone;
            document.getElementById('c_event').value = item.event;
            const dateInput = document.getElementById('c_date'); if (dateInput._flatpickr) dateInput._flatpickr.setDate(item.rawDate ? item.rawDate.split(', ') : []);
            document.getElementById('c_num_shifts').value = item.numShifts; document.getElementById('c_shift_details').value = item.shiftDetails;
            document.getElementById('c_photo_count').value = item.photoCount || 0; document.getElementById('c_cinema_count').value = item.cinemaCount || 0;
            document.getElementById('c_gear').value = item.gearDetails !== 'N/A' ? item.gearDetails : '';
            document.getElementById('c_venue').value = item.venue; document.getElementById('c_payment').value = item.payment;
            document.getElementById('c_prints').value = item.prints !== 'N/A' ? item.prints : ''; document.getElementById('c_delivery').value = item.delivery !== 'N/A' ? item.delivery : '';
            document.getElementById('c_currency').value = item.currencyCode || 'BDT'; document.getElementById('c_show_terms').checked = item.showTerms !== false; document.getElementById('c_show_contact').checked = item.showContact !== false; 
            document.getElementById('p_name').value = item.pName; document.getElementById('p_price').value = item.pPriceOriginal || item.totalPackagePrice; 
            
            const extraContainer = document.getElementById('extra-services-container'); extraContainer.innerHTML = ''; 
            if (item.extraServices && item.extraServices.length > 0) {
                item.extraServices.forEach(ext => {
                    const row = document.createElement('div'); row.className = 'extra-service-row'; row.style.cssText = 'display: flex; gap: 10px; margin-bottom: 10px;';
                    row.innerHTML = `<input type="text" class="form-control e_name_input" value="${ext.name}"><input type="number" class="form-control e_price_input" value="${ext.price}"><button type="button" class="btn-remove-extra" onclick="removeExtraRow(this)">❌</button>`;
                    extraContainer.appendChild(row);
                });
            } else { addExtraRow(); }
            updateRemoveButtons();

            document.getElementById('t_charge').value = item.tCharge || ''; document.getElementById('discount_pct').value = item.discountPct || '';
            document.getElementById('vat_pct').value = item.vatPct || ''; document.getElementById('adv_pay').value = item.advPay || 0;
            const duePayEl = document.getElementById('due_pay'); duePayEl.disabled = false; duePayEl.value = item.duePay || '';
            document.getElementById('c_signature').value = item.signatureOption || 'Shovon';
            document.getElementById('form-title').innerText = "Edit Quotation"; document.getElementById('submit-btn-text').innerText = "Update Quotation 🔄";
            showSection('form-section');
        }
    } catch (e) {}
}

async function deleteHistoryItem(docId) { if(confirm("Delete this quotation?")) { await db.collection("quotations").doc(docId).delete(); loadDashboard(); } }

function downloadPDF() {
    const element = document.getElementById('quotation-doc'); const qNo = document.getElementById('out_qno').innerText || "New";
    
    // PDF ডাউনলোড করার আগে জুম 100% করে নিতে হবে যাতে PDF ফাটে না
    const oldScale = currentScale;
    currentScale = 1; applyZoom(); 

    const opt = { margin: 0, filename: `Quotation_${qNo}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
    const btn = document.querySelector('.btn-pdf'); const oldText = btn.innerText; btn.innerText = "Downloading... ⏳";
    
    html2pdf().set(opt).from(element).save().then(() => { 
        btn.innerText = oldText; 
        currentScale = oldScale; applyZoom(); // ডাউনলোড শেষে আবার আগের জুমে ফেরত আসবে
    });
}

function sendWhatsApp() {
    if(!currentQuoteData) return; const sym = currentQuoteData.currencySymbol || '৳';
    const message = `Hello ${currentQuoteData.name},\n\nHere is your quotation from *DocuReel Photography & Cinematography*.\n*Quote No:* ${currentQuoteData.qNo}\n*Total Due:* ${sym}${currentQuoteData.dueAmount.toLocaleString()}\n\nPlease check the attached document.\n\nBest Regards,\nDocuReel`;
    window.open(`https://wa.me/88${currentQuoteData.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
}
