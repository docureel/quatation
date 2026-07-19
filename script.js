import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, updateDoc, runTransaction, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Your Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCtNgTYpefLqHiShLO1NGOhDS9RoK1eEZw",
  authDomain: "docureel-apps.firebaseapp.com",
  projectId: "docureel-apps",
  storageBucket: "docureel-apps.firebasestorage.app",
  messagingSenderId: "987182248649",
  appId: "1:987182248649:web:2d32c4e0b7c7dfb07a5318"
};

// Initialize Firebase & Database
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const DASHBOARD_PIN = "1234"; // ⚠️ Change this pin to whatever you want

let currentScale = window.innerWidth < 800 ? 0.5 : 1; 
let currentQuoteData = null; 
let globalHistory = []; 

// Expose functions to window
window.showSection = showSection;
window.checkPinAndShowDashboard = checkPinAndShowDashboard;
window.clearFormIfNew = clearFormIfNew;
window.loadDashboard = loadDashboard;
window.viewHistoryItem = viewHistoryItem;
window.editHistoryItem = editHistoryItem;
window.deleteHistoryItem = deleteHistoryItem;
window.clearHistory = clearHistory;
window.zoomIn = zoomIn;
window.zoomOut = zoomOut;
window.resetZoom = resetZoom;
window.applyZoom = applyZoom;
window.downloadPDF = downloadPDF;
window.sendWhatsApp = sendWhatsApp;

document.addEventListener("DOMContentLoaded", () => {
    showSection('form-section'); // Force hide output on load
    applyZoom();
    loadDashboard();
    
    document.getElementById('c_currency').addEventListener('change', function(e) {
        const extraTimeCheckbox = document.getElementById('c_extra_time');
        if (e.target.value === 'BDT') {
            extraTimeCheckbox.checked = true;
            extraTimeCheckbox.disabled = true; 
        } else {
            extraTimeCheckbox.disabled = false; 
        }
    });
});

function checkPinAndShowDashboard() {
    const enteredPin = prompt("Please enter your PIN to access the Dashboard:");
    if (enteredPin === DASHBOARD_PIN) {
        showSection('history-section');
    } else if (enteredPin !== null) {
        alert("Incorrect PIN! Access Denied.");
    }
}

function getCurrencySymbol(code) {
    switch(code) {
        case 'USD': return '$'; case 'EUR': return '€'; case 'KRW': return '₩'; case 'BDT': default: return '৳';
    }
}

function showSection(sectionId) {
    document.getElementById('form-section').style.display = 'none';
    document.getElementById('history-section').style.display = 'none';
    document.getElementById('output-section').style.display = 'none';
    
    document.getElementById(sectionId).style.display = 'block';
    
    if(sectionId !== 'output-section') {
        document.getElementById('tab-form').classList.remove('active-tab');
        document.getElementById('tab-history').classList.remove('active-tab');
        
        if(sectionId === 'form-section') {
            document.getElementById('tab-form').classList.add('active-tab');
        } else {
            document.getElementById('tab-history').classList.add('active-tab');
            loadDashboard(); 
        }
    }
}

function clearFormIfNew() {
    document.getElementById('edit_id').value = '';
    document.getElementById('quotation-form').reset();
    document.getElementById('c_currency').dispatchEvent(new Event('change')); 
    
    const duePayInput = document.getElementById('due_pay');
    duePayInput.disabled = true;
    duePayInput.style.backgroundColor = "#f5f5f5";
    duePayInput.placeholder = "Only available in Edit Mode";

    document.getElementById('form-title').innerText = "Create Quotation";
    document.getElementById('submit-btn-text').innerText = "Generate & Save Quotation ⬇️";
}
document.getElementById('quotation-form').addEventListener('submit', async function(e) {
    e.preventDefault();

    const submitBtn = document.getElementById('submit-btn-text');
    const originalBtnText = submitBtn.innerText;
    submitBtn.innerText = "Saving to Database... ⏳";
    submitBtn.disabled = true;

    const editId = document.getElementById('edit_id').value;
    const currencyCode = document.getElementById('c_currency').value;
    const curSym = getCurrencySymbol(currencyCode);
    
    let includeExtraTime = document.getElementById('c_extra_time').checked;
    if (currencyCode === 'BDT') { includeExtraTime = true; }

    const showContact = document.getElementById('c_show_contact').checked;
    const showTerms = document.getElementById('c_show_terms').checked; 

    const rawDate = document.getElementById('c_date').value;
    const dateObj = new Date(rawDate);
    
    const numShifts = parseInt(document.getElementById('c_num_shifts').value) || 1;
    const pPrice = parseInt(document.getElementById('p_price').value) || 0;
    const totalPackagePrice = pPrice * numShifts;
    
    const photoCount = parseInt(document.getElementById('c_photo_count').value) || 0;
    const cinemaCount = parseInt(document.getElementById('c_cinema_count').value) || 0;
    let teamArr = [];
    if (photoCount > 0) teamArr.push(`${photoCount} Photographer(s)`);
    if (cinemaCount > 0) teamArr.push(`${cinemaCount} Cinematographer(s)`);
    const teamDetails = teamArr.length > 0 ? teamArr.join(" & ") : "Not Specified";
    
    const ePrice = parseInt(document.getElementById('e_price').value) || 0;
    const tCharge = parseInt(document.getElementById('t_charge').value) || 0;
    const subTotal = totalPackagePrice + ePrice + tCharge;

    const discountPct = parseFloat(document.getElementById('discount_pct').value) || 0;
    const discountAmount = Math.round(subTotal * (discountPct / 100)); 
    const amountAfterDiscount = subTotal - discountAmount;

    const vatPct = parseFloat(document.getElementById('vat_pct').value) || 0;
    const vatAmount = Math.round(amountAfterDiscount * (vatPct / 100));

    const advPay = parseInt(document.getElementById('adv_pay').value) || 0;
    const duePay = parseInt(document.getElementById('due_pay').value) || 0;
    const totalPaid = advPay + duePay;
    const grandTotal = amountAfterDiscount + vatAmount;
    
    const signatureOption = document.getElementById('c_signature').value;

    const deliveryTimeSelection = document.getElementById('c_delivery_time').value;
    let deliveryTimeText = "";
    if (deliveryTimeSelection === "On Season") {
        deliveryTimeText = "All Photo edited 30 Days<br>Cine 1 trailer & 1 Body edited 45 Days";
    } else {
        deliveryTimeText = "All Photo edited 15 Days<br>Cine 1 trailer & 1 Body edited 30 Days";
    }

    let quoteData = {
        year: new Date().getFullYear(),
        currencyCode: currencyCode,
        currencySymbol: curSym,
        includeExtraTime: includeExtraTime, 
        showContact: showContact, showTerms: showTerms,
        name: document.getElementById('c_name').value,
        phone: document.getElementById('c_phone').value,
        event: document.getElementById('c_event').value,
        numShifts: numShifts, shiftDetails: document.getElementById('c_shift_details').value,
        teamDetails: teamDetails, 
        photoCount: photoCount, cinemaCount: cinemaCount,
        rawDate: rawDate, pPriceOriginal: pPrice,
        dateStr: dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
        venue: document.getElementById('c_venue').value, payment: document.getElementById('c_payment').value,
        prints: document.getElementById('c_prints').value || 'N/A', delivery: document.getElementById('c_delivery').value || 'N/A',
        deliveryTimeSelection: deliveryTimeSelection, deliveryTimeText: deliveryTimeText,
        pName: document.getElementById('p_name').value, totalPackagePrice: totalPackagePrice,
        eName: document.getElementById('e_name').value, ePrice: ePrice, tCharge: tCharge,
        discountPct: discountPct, discountAmount: discountAmount, vatPct: vatPct, vatAmount: vatAmount,
        grandTotal: grandTotal, advPay: advPay, duePay: duePay, totalPaid: totalPaid, dueAmount: grandTotal - totalPaid, 
        signatureOption: signatureOption, timestamp: serverTimestamp()
    };
    try {
        if (editId) {
            const docRef = doc(db, "quotations", editId);
            quoteData.qNo = document.getElementById('out_qno').innerText; 
            quoteData.generateDateStr = document.getElementById('out_today').innerText;
            await setDoc(docRef, quoteData, { merge: true });
            quoteData.id = editId;
        } else {
            const today = new Date();
            const counterRef = doc(db, "settings", "serialCounter");
            await runTransaction(db, async (transaction) => {
                const counterDoc = await transaction.get(counterRef);
                let currentSerial = counterDoc.exists() ? counterDoc.data().lastSerial + 1 : 1001;
                quoteData.qNo = `DOC-${today.getFullYear()}${(today.getMonth()+1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}-${currentSerial}`;
                quoteData.generateDateStr = today.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
                const newDocRef = doc(collection(db, "quotations"));
                transaction.set(newDocRef, quoteData);
                transaction.set(counterRef, { lastSerial: currentSerial });
                quoteData.id = newDocRef.id;
            });
        }
        
        clearFormIfNew();
        renderQuotation(quoteData);
        await loadDashboard(); 
    } catch (error) {
        console.error("Error saving document: ", error);
        alert("Failed to save. Please check your internet connection.");
    } finally {
        submitBtn.innerText = originalBtnText; submitBtn.disabled = false;
    }
});

function renderQuotation(data) {
    currentQuoteData = data; 
    const sym = data.currencySymbol || '৳';
    
    document.getElementById('paid_stamp').style.display = (data.dueAmount <= 0) ? 'block' : 'none';

    const sigImg = document.getElementById('out_sig_img');
    const sigName = document.getElementById('out_sig_name');
    if (data.signatureOption === 'Shovon') { sigImg.src = 'signature1.png'; sigImg.style.display = 'inline-block'; sigName.innerText = 'Shovon'; }
    else if (data.signatureOption === 'Sazzid') { sigImg.src = 'signature2.png'; sigImg.style.display = 'inline-block'; sigName.innerText = 'Sazzid'; }
    else { sigImg.style.display = 'none'; sigName.innerText = ''; }

    document.getElementById('company-details-block').style.display = (data.showContact !== false) ? 'block' : 'none';
    document.getElementById('terms-page').style.display = (data.showTerms !== false) ? 'block' : 'none';
    
    document.getElementById('out_qno').innerText = data.qNo;
    document.getElementById('out_today').innerText = data.generateDateStr;
    document.getElementById('out_name').innerText = data.name;
    document.getElementById('out_phone').innerText = data.phone;
    document.getElementById('out_event').innerText = data.event;
    document.getElementById('out_shift').innerText = `${data.numShifts} (${data.shiftDetails})`;
    document.getElementById('out_team').innerText = data.teamDetails || "Not Specified";
    document.getElementById('out_date').innerText = data.dateStr;
    document.getElementById('out_venue').innerText = data.venue;
    document.getElementById('out_payment').innerText = data.payment;
    document.getElementById('out_prints').innerText = data.prints;
    document.getElementById('out_delivery').innerText = data.delivery;
    document.getElementById('out_delivery_time').innerHTML = data.deliveryTimeText || "Not Specified";
    
    document.getElementById('extra_time_label').style.display = (data.includeExtraTime || data.currencyCode === 'BDT') ? 'block' : 'none';
    document.getElementById('extra_time_value').style.display = (data.includeExtraTime || data.currencyCode === 'BDT') ? 'block' : 'none';

    document.getElementById('out_currency_txt').innerText = data.currencyCode || "BDT";
    document.getElementById('out_grand_currency').innerText = data.currencyCode || "BDT";
    document.getElementById('out_pname').innerText = data.numShifts > 1 ? `${data.pName} (x${data.numShifts} Shifts)` : data.pName;
    document.getElementById('out_pprice').innerText = sym + data.totalPackagePrice.toLocaleString();

    document.getElementById('extra-row').style.display = (data.eName && data.ePrice > 0) ? 'flex' : 'none';
    document.getElementById('out_ename').innerText = data.eName;
    document.getElementById('out_eprice').innerText = sym + (data.ePrice || 0).toLocaleString();
    document.getElementById('travel-row').style.display = (data.tCharge > 0) ? 'flex' : 'none';
    document.getElementById('out_tcharge').innerText = sym + (data.tCharge || 0).toLocaleString();
    document.getElementById('discount-row').style.display = (data.discountAmount > 0) ? 'flex' : 'none';
    document.getElementById('out_discount_pct').innerText = data.discountPct;
    document.getElementById('out_discount_amt').innerText = "- " + sym + (data.discountAmount || 0).toLocaleString();
    document.getElementById('vat-row').style.display = (data.vatAmount > 0) ? 'flex' : 'none';
    document.getElementById('out_vat_pct').innerText = data.vatPct;
    document.getElementById('out_vat_amt').innerText = "+ " + sym + (data.vatAmount || 0).toLocaleString();
    document.getElementById('out_total').innerText = sym + (data.grandTotal || 0).toLocaleString();
    document.getElementById('out_advance').innerText = sym + (data.totalPaid || data.advPay || 0).toLocaleString();
    document.getElementById('out_due').innerText = sym + (data.dueAmount || 0).toLocaleString();

    showSection('output-section');
    applyZoom();
}
async function loadDashboard() {
    try {
        const q = query(collection(db, "quotations"), orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);
        
        globalHistory = [];
        querySnapshot.forEach((docSnap) => {
            let item = docSnap.data();
            item.id = docSnap.id; 
            globalHistory.push(item);
        });

        const currentYear = new Date().getFullYear();
        let incBDT = 0, dueBDT = 0, incUSD = 0, incEUR = 0;
        let monthlyData = {}; let yearlyData = {}; 
        const tbody = document.getElementById('history-list');
        tbody.innerHTML = '';

        if(globalHistory.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No history found in database. Create a quotation first!</td></tr>';
        } else {
            globalHistory.forEach((item) => {
                const currentTotalPaid = item.totalPaid || item.advPay || 0;
                
                if (item.year && (!item.currencyCode || item.currencyCode === 'BDT')) {
                    if(!yearlyData[item.year]) { yearlyData[item.year] = { events: 0, totalValue: 0, collected: 0 }; }
                    yearlyData[item.year].events += 1;
                    yearlyData[item.year].totalValue += (item.grandTotal || 0);
                    yearlyData[item.year].collected += currentTotalPaid;
                }

                if(item.year === currentYear) {
                    if (item.currencyCode === 'USD') incUSD += currentTotalPaid;
                    else if (item.currencyCode === 'EUR') incEUR += currentTotalPaid;
                    else if (item.currencyCode !== 'KRW') { incBDT += currentTotalPaid; dueBDT += (item.dueAmount || 0); }

                    if (item.rawDate && (!item.currencyCode || item.currencyCode === 'BDT')) {
                        const d = new Date(item.rawDate);
                        const monthKey = d.toLocaleString('en-GB', { month: 'short', year: 'numeric' });
                        if(!monthlyData[monthKey]) { monthlyData[monthKey] = { events: 0, totalValue: 0, collected: 0 }; }
                        monthlyData[monthKey].events += 1;
                        monthlyData[monthKey].totalValue += (item.grandTotal || 0);
                        monthlyData[monthKey].collected += currentTotalPaid;
                    }
                }

                const sym = item.currencySymbol || '৳';
                const statusLabel = item.dueAmount <= 0 ? '✅ PAID' : `Due: ${sym}${item.dueAmount.toLocaleString()}`;
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${item.generateDateStr}</td>
                    <td><b>${item.name}</b><br><small>${item.phone}</small></td>
                    <td>${item.event}</td>
                    <td>${sym}${(item.grandTotal || 0).toLocaleString()}</td>
                    <td style="color: ${item.dueAmount <= 0 ? '#28a745' : '#dc3545'}; font-weight: bold;">${statusLabel}</td>
                    <td>
                        <button class="btn-view" onclick="viewHistoryItem('${item.id}')">👁️</button>
                        <button class="btn-edit-item" onclick="editHistoryItem('${item.id}')">✏️</button>
                        <button class="btn-delete-item" onclick="deleteHistoryItem('${item.id}')">🗑️</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }

        document.getElementById('inc-bdt').innerText = `৳${incBDT.toLocaleString()}`;
        document.getElementById('due-bdt').innerText = `৳${dueBDT.toLocaleString()}`;
        document.getElementById('inc-usd').innerText = `$${incUSD.toLocaleString()}`;
        document.getElementById('inc-eur').innerText = `€${incEUR.toLocaleString()}`;

        const yearlyList = document.getElementById('yearly-list');
        if(yearlyList) {
            yearlyList.innerHTML = '';
            const yearsArray = Object.keys(yearlyData).sort((a, b) => b - a);
            if (yearsArray.length === 0) { yearlyList.innerHTML = '<tr><td colspan="4" style="text-align:center;">No BDT event data found yet.</td></tr>'; } 
            else {
                yearsArray.forEach(year => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `<td><b>${year}</b></td><td>${yearlyData[year].events} Event(s)</td><td>৳${yearlyData[year].totalValue.toLocaleString()}</td><td>৳${yearlyData[year].collected.toLocaleString()}</td>`;
                    yearlyList.appendChild(tr);
                });
            }
        }

        const monthlyList = document.getElementById('monthly-list');
        monthlyList.innerHTML = '';
        const monthsArray = Object.keys(monthlyData);
        if (monthsArray.length === 0) { monthlyList.innerHTML = '<tr><td colspan="4" style="text-align:center;">No BDT event data found yet.</td></tr>'; } 
        else {
            monthsArray.forEach(month => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td><b>${month}</b></td><td>${monthlyData[month].events} Event(s)</td><td>৳${monthlyData[month].totalValue.toLocaleString()}</td><td>৳${monthlyData[month].collected.toLocaleString()}</td>`;
                monthlyList.appendChild(tr);
            });
        }
    } catch (error) { console.error("Error loading dashboard data:", error); }
}

function viewHistoryItem(id) {
    const item = globalHistory.find(x => x.id === id);
    if(item) { renderQuotation(item); }
}

function editHistoryItem(id) {
    const item = globalHistory.find(x => x.id === id);
    if(item) {
        document.getElementById('edit_id').value = item.id;
        document.getElementById('c_name').value = item.name || '';
        document.getElementById('c_phone').value = item.phone || '';
        document.getElementById('c_event').value = item.event || 'Wedding';
        document.getElementById('c_date').value = item.rawDate || ""; 
        document.getElementById('c_num_shifts').value = item.numShifts || 1;
        document.getElementById('c_shift_details').value = item.shiftDetails || '';
        document.getElementById('c_photo_count').value = item.photoCount || 0;
        document.getElementById('c_cinema_count').value = item.cinemaCount || 0;
        document.getElementById('c_venue').value = item.venue || '';
        document.getElementById('c_payment').value = item.payment || 'Cash';
        document.getElementById('c_prints').value = item.prints !== 'N/A' ? item.prints : '';
        document.getElementById('c_delivery').value = item.delivery !== 'N/A' ? item.delivery : '';
        document.getElementById('c_delivery_time').value = item.deliveryTimeSelection || 'On Season';
        
        document.getElementById('c_currency').value = item.currencyCode || 'BDT';
        document.getElementById('c_extra_time').checked = item.includeExtraTime !== false;
        document.getElementById('c_show_contact').checked = item.showContact !== false; 
        document.getElementById('c_show_terms').checked = item.showTerms !== false; 
        document.getElementById('c_currency').dispatchEvent(new Event('change')); 
        
        document.getElementById('p_name').value = item.pName || 'None (Custom Event)';
        document.getElementById('p_price').value = item.pPriceOriginal || item.totalPackagePrice || ''; 
        document.getElementById('e_name').value = item.eName || '';
        document.getElementById('e_price').value = item.ePrice || '';
        document.getElementById('t_charge').value = item.tCharge || '';
        document.getElementById('discount_pct').value = item.discountPct || '';
        document.getElementById('vat_pct').value = item.vatPct || '';
        document.getElementById('adv_pay').value = item.advPay || 0;
        
        const duePayEl = document.getElementById('due_pay');
        duePayEl.disabled = false; duePayEl.style.backgroundColor = "white"; duePayEl.placeholder = "Enter payment against due"; duePayEl.value = item.duePay || '';
        
        document.getElementById('c_signature').value = item.signatureOption || 'Shovon';
        document.getElementById('form-title').innerText = "Edit Quotation: " + (item.qNo || '');
        document.getElementById('submit-btn-text').innerText = "Update Quotation & Payment 🔄";

        showSection('form-section');
    }
}

async function deleteHistoryItem(id) {
    if(confirm("Are you sure you want to delete this specific quotation from the Database?")) {
        try { await deleteDoc(doc(db, "quotations", id)); await loadDashboard(); } 
        catch (error) { console.error("Error deleting document:", error); alert("Could not delete. Check internet connection."); }
    }
}

async function clearHistory() {
    if(confirm("Are you sure you want to delete ALL quotation history from the database? This cannot be undone!")) {
        try { for (let item of globalHistory) { await deleteDoc(doc(db, "quotations", item.id)); } await loadDashboard(); } 
        catch (error) { console.error("Error clearing history:", error); }
    }
}

function zoomIn() { currentScale += 0.1; applyZoom(); }
function zoomOut() { currentScale = Math.max(0.3, currentScale - 0.1); applyZoom(); }
function resetZoom() { currentScale = 1; applyZoom(); }
function applyZoom() {
    const docContainer = document.getElementById('quotation-doc');
    if(docContainer) { docContainer.style.transform = `scale(${currentScale})`; }
}

function downloadPDF() {
    const element = document.getElementById('quotation-doc');
    const oldScale = currentScale; currentScale = 1; applyZoom(); 
    const qNo = document.getElementById('out_qno').innerText;
    const opt = { margin: 0, filename: `Quotation_${qNo}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true, scrollY: 0 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
    html2pdf().set(opt).from(element).save().then(() => { currentScale = oldScale; applyZoom(); });
}

function sendWhatsApp() {
    if(!currentQuoteData) return;
    const sym = currentQuoteData.currencySymbol || '৳';
    const message = `Hello ${currentQuoteData.name},\n\nHere is your quotation from *DocuReel Photography & Cinematography*.\n\n*Quotation No:* ${currentQuoteData.qNo}\n*Total Due:* ${sym}${currentQuoteData.dueAmount.toLocaleString()}\n\nPlease check the attached document. Let us know if you have any questions!\n\nBest Regards,\nDocuReel`;
    const cleanPhone = currentQuoteData.phone.replace(/\D/g, ''); 
    window.open(`https://wa.me/88${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
}
