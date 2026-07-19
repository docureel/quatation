// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCtNgTYpefLqHiShLO1NGOhDS9RoK1eEZw",
    authDomain: "docureel-apps.firebaseapp.com",
    projectId: "docureel-apps",
    storageBucket: "docureel-apps.firebasestorage.app",
    messagingSenderId: "987182248649",
    appId: "1:987182248649:web:2d32c4e0b7c7dfb07a5318",
    measurementId: "G-3FF9M1C4HW"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let currentScale = window.innerWidth < 800 ? 0.5 : 1; 
let currentQuoteData = null; 

document.addEventListener("DOMContentLoaded", () => {
    applyZoom();
    loadDashboard(); 
    
    // Initialize Multi-Date Calendar
    flatpickr("#c_date", {
        mode: "multiple",
        dateFormat: "Y-m-d", 
        altInput: true,
        altFormat: "d M Y", 
        placeholder: "Select Event Date(s)"
    });
    
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

function getCurrencySymbol(code) {
    switch(code) {
        case 'USD': return '$';
        case 'EUR': return '€';
        case 'KRW': return '₩';
        case 'BDT':
        default: return '৳';
    }
}

// --------------------------------------------------
// Password Protection Logic
// --------------------------------------------------
let isDashboardUnlocked = false; 
const dashboardPassword = "840733"; // ⚠️ আপনার পিন 
let targetSectionId = "";

function showSection(sectionId) {
    if (sectionId === 'history-section' && !isDashboardUnlocked) {
        targetSectionId = sectionId;
        document.getElementById('custom-pass-modal').style.display = 'flex';
        document.getElementById('custom-pass-input').value = '';
        document.getElementById('pass-error-msg').style.display = 'none';
        return; 
    }
    executeShowSection(sectionId);
}

function executeShowSection(sectionId) {
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

function closePassModal() { document.getElementById('custom-pass-modal').style.display = 'none'; }
function checkPassword() {
    const pass = document.getElementById('custom-pass-input').value;
    if (pass === dashboardPassword) {
        isDashboardUnlocked = true;
        document.getElementById('custom-pass-modal').style.display = 'none';
        executeShowSection(targetSectionId); 
    } else {
        document.getElementById('pass-error-msg').style.display = 'block';
    }
}

function clearFormIfNew() {
    document.getElementById('firebase_doc_id').value = '';
    document.getElementById('edit_id').value = '';
    document.getElementById('quotation-form').reset();
    document.getElementById('c_currency').dispatchEvent(new Event('change')); 
    
    const dateInput = document.getElementById('c_date');
    if (dateInput._flatpickr) { dateInput._flatpickr.clear(); }
    
    const duePayInput = document.getElementById('due_pay');
    duePayInput.disabled = true;
    duePayInput.style.backgroundColor = "#f5f5f5";
    duePayInput.placeholder = "Only available in Edit Mode";

    document.getElementById('form-title').innerText = "Create Quotation";
    document.getElementById('submit-btn-text').innerText = "Generate & Save Quotation ⬇️";
}
document.getElementById('quotation-form').addEventListener('submit', async function(e) {
    e.preventDefault();

    const firebaseDocId = document.getElementById('firebase_doc_id').value;
    const editId = document.getElementById('edit_id').value;
    
    const submitBtn = document.getElementById('submit-btn-text');
    const originalBtnText = submitBtn.innerText;
    submitBtn.innerText = "Saving to Database... ⏳";
    submitBtn.disabled = true;
    
    const currencyCode = document.getElementById('c_currency').value;
    const curSym = getCurrencySymbol(currencyCode);
    
    let includeExtraTime = document.getElementById('c_extra_time').checked;
    if (currencyCode === 'BDT') { includeExtraTime = true; }

    const showContact = document.getElementById('c_show_contact').checked;
    const showTerms = document.getElementById('c_show_terms').checked; 

    // Handle multiple dates correctly
    const rawDate = document.getElementById('c_date').value; 
    let dateStr = "";
    if (rawDate) {
        const datesArray = rawDate.split(', ');
        const formattedDates = datesArray.map(dStr => {
            const d = new Date(dStr);
            return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
        });
        dateStr = formattedDates.join(', ');
    }
    
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
        id: editId ? parseInt(editId) : Date.now(), 
        year: new Date().getFullYear(),
        
        currencyCode: currencyCode,
        currencySymbol: curSym,
        includeExtraTime: includeExtraTime, 
        showContact: showContact, 
        showTerms: showTerms,
        
        name: document.getElementById('c_name').value,
        phone: document.getElementById('c_phone').value,
        event: document.getElementById('c_event').value,
        numShifts: numShifts,
        shiftDetails: document.getElementById('c_shift_details').value,
        teamDetails: teamDetails, 
        
        photoCount: photoCount,
        cinemaCount: cinemaCount,
        rawDate: rawDate,
        pPriceOriginal: pPrice,

        dateStr: dateStr,
        venue: document.getElementById('c_venue').value,
        payment: document.getElementById('c_payment').value,
        
        prints: document.getElementById('c_prints').value || 'N/A',
        delivery: document.getElementById('c_delivery').value || 'N/A',
        
        deliveryTimeSelection: deliveryTimeSelection,
        deliveryTimeText: deliveryTimeText,
        
        pName: document.getElementById('p_name').value,
        totalPackagePrice: totalPackagePrice,
        
        eName: document.getElementById('e_name').value,
        ePrice: ePrice,
        tCharge: tCharge,
        
        discountPct: discountPct,
        discountAmount: discountAmount,
        vatPct: vatPct,
        vatAmount: vatAmount,
        
        grandTotal: grandTotal,
        advPay: advPay,        
        duePay: duePay,        
        totalPaid: totalPaid,  
        dueAmount: grandTotal - totalPaid, 

        signatureOption: signatureOption
    };
    try {
        if (firebaseDocId) {
            const docRef = db.collection("quotations").doc(firebaseDocId);
            const docSnap = await docRef.get();
            
            if (docSnap.exists) {
                quoteData.qNo = docSnap.data().qNo;
                quoteData.generateDateStr = docSnap.data().generateDateStr;
                quoteData.timestamp = docSnap.data().timestamp; 
            }
            
            await docRef.update(quoteData);
            quoteData.firebaseDocId = firebaseDocId; 
            
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

        submitBtn.innerText = originalBtnText;
        submitBtn.disabled = false;
        
        clearFormIfNew();
        renderQuotation(quoteData);

    } catch (error) {
        console.error("Error adding document: ", error);
        alert("Database Error! Check your internet connection.");
        submitBtn.innerText = originalBtnText;
        submitBtn.disabled = false;
    }
});

function renderQuotation(data) {
    currentQuoteData = data; 
    const sym = data.currencySymbol || '৳';
    
    if (data.dueAmount <= 0) {
        document.getElementById('paid_stamp').style.display = 'block';
    } else {
        document.getElementById('paid_stamp').style.display = 'none';
    }

    const sigImg = document.getElementById('out_sig_img');
    const sigName = document.getElementById('out_sig_name');
    if (data.signatureOption === 'Shovon') {
        sigImg.src = 'signature1.png';
        sigImg.style.display = 'inline-block';
        sigName.innerText = 'Shovon';
    } else if (data.signatureOption === 'Sazzid') {
        sigImg.src = 'signature2.png';
        sigImg.style.display = 'inline-block';
        sigName.innerText = 'Sazzid';
    } else {
        sigImg.style.display = 'none';
        sigName.innerText = '';
    }

    document.getElementById('company-details-block').style.display = data.showContact !== false ? 'block' : 'none';
    document.getElementById('terms-page').style.display = data.showTerms !== false ? 'block' : 'none';
    
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
    
    if (data.includeExtraTime || data.currencyCode === 'BDT') {
        document.getElementById('extra_time_label').style.display = 'block';
        document.getElementById('extra_time_value').style.display = 'block';
    } else {
        document.getElementById('extra_time_label').style.display = 'none';
        document.getElementById('extra_time_value').style.display = 'none';
    }

    document.getElementById('out_currency_txt').innerText = data.currencyCode || "BDT";
    document.getElementById('out_grand_currency').innerText = data.currencyCode || "BDT";

    document.getElementById('out_pname').innerText = data.numShifts > 1 ? `${data.pName} (x${data.numShifts} Shifts)` : data.pName;
    document.getElementById('out_pprice').innerText = sym + data.totalPackagePrice.toLocaleString();

    if (data.eName && data.ePrice > 0) {
        document.getElementById('extra-row').style.display = 'flex';
        document.getElementById('out_ename').innerText = data.eName;
        document.getElementById('out_eprice').innerText = sym + data.ePrice.toLocaleString();
    } else {
        document.getElementById('extra-row').style.display = 'none';
    }

    if (data.tCharge > 0) {
        document.getElementById('travel-row').style.display = 'flex';
        document.getElementById('out_tcharge').innerText = sym + data.tCharge.toLocaleString();
    } else {
        document.getElementById('travel-row').style.display = 'none';
    }

    if (data.discountAmount > 0) {
        document.getElementById('discount-row').style.display = 'flex';
        document.getElementById('out_discount_pct').innerText = data.discountPct;
        document.getElementById('out_discount_amt').innerText = "- " + sym + data.discountAmount.toLocaleString();
    } else {
        document.getElementById('discount-row').style.display = 'none';
    }

    if (data.vatAmount > 0) {
        document.getElementById('vat-row').style.display = 'flex';
        document.getElementById('out_vat_pct').innerText = data.vatPct;
        document.getElementById('out_vat_amt').innerText = "+ " + sym + data.vatAmount.toLocaleString();
    } else {
        document.getElementById('vat-row').style.display = 'none';
    }

    document.getElementById('out_total').innerText = sym + data.grandTotal.toLocaleString();
    document.getElementById('out_advance').innerText = sym + (data.totalPaid || data.advPay).toLocaleString();
    document.getElementById('out_due').innerText = sym + data.dueAmount.toLocaleString();

    showSection('output-section');
    applyZoom();
}
async function loadDashboard() {
    const tbody = document.getElementById('history-list');
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; font-weight:bold; color:#007bff;">Loading data from Database... ⏳</td></tr>';

    try {
        const snapshot = await db.collection("quotations").orderBy("timestamp", "desc").get();
        let history = [];
        snapshot.forEach(doc => {
            let data = doc.data();
            data.firebaseDocId = doc.id; 
            history.push(data);
        });

        const currentYear = new Date().getFullYear();
        let incBDT = 0, dueBDT = 0, incUSD = 0, incEUR = 0;
        let monthlyData = {};
        let yearlyData = {}; 

        tbody.innerHTML = '';

        if(history.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No history found in database. Create a quotation first!</td></tr>';
        } else {
            history.forEach((item) => {
                const currentTotalPaid = item.totalPaid || item.advPay;
                
                if (item.year && (!item.currencyCode || item.currencyCode === 'BDT')) {
                    if(!yearlyData[item.year]) {
                        yearlyData[item.year] = { events: 0, totalValue: 0, collected: 0 };
                    }
                    yearlyData[item.year].events += 1;
                    yearlyData[item.year].totalValue += item.grandTotal;
                    yearlyData[item.year].collected += currentTotalPaid;
                }

                if(item.year === currentYear) {
                    if (item.currencyCode === 'USD') incUSD += currentTotalPaid;
                    else if (item.currencyCode === 'EUR') incEUR += currentTotalPaid;
                    else if (item.currencyCode !== 'KRW') {
                        incBDT += currentTotalPaid; 
                        dueBDT += item.dueAmount;
                    }
                    
                    // Handle Multiple dates for Monthly calculations
                    let firstDateStr = item.rawDate;
                    if (item.rawDate && item.rawDate.includes(',')) {
                        firstDateStr = item.rawDate.split(',')[0].trim();
                    }

                    if (firstDateStr && (!item.currencyCode || item.currencyCode === 'BDT')) {
                        const d = new Date(firstDateStr);
                        const monthKey = d.toLocaleString('en-GB', { month: 'short', year: 'numeric' });
                        if(!monthlyData[monthKey]) {
                            monthlyData[monthKey] = { events: 0, totalValue: 0, collected: 0 };
                        }
                        monthlyData[monthKey].events += 1;
                        monthlyData[monthKey].totalValue += item.grandTotal;
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
                    <td>${sym}${item.grandTotal.toLocaleString()}</td>
                    <td style="color: ${item.dueAmount <= 0 ? '#28a745' : '#dc3545'}; font-weight: bold;">${statusLabel}</td>
                    <td>
                        <button class="btn-view" onclick="viewHistoryItem('${item.firebaseDocId}')">👁️</button>
                        <button class="btn-edit-item" onclick="editHistoryItem('${item.firebaseDocId}')">✏️</button>
                        <button class="btn-delete-item" onclick="deleteHistoryItem('${item.firebaseDocId}')">🗑️</button>
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
            if (yearsArray.length === 0) {
                yearlyList.innerHTML = '<tr><td colspan="4" style="text-align:center;">No BDT event data found yet.</td></tr>';
            } else {
                yearsArray.forEach(year => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td><b>${year}</b></td>
                        <td>${yearlyData[year].events} Event(s)</td>
                        <td>৳${yearlyData[year].totalValue.toLocaleString()}</td>
                        <td>৳${yearlyData[year].collected.toLocaleString()}</td>
                    `;
                    yearlyList.appendChild(tr);
                });
            }
        }

        const monthlyList = document.getElementById('monthly-list');
        monthlyList.innerHTML = '';
        const monthsArray = Object.keys(monthlyData);
        
        if (monthsArray.length === 0) {
            monthlyList.innerHTML = '<tr><td colspan="4" style="text-align:center;">No BDT event data found yet.</td></tr>';
        } else {
            monthsArray.forEach(month => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><b>${month}</b></td>
                    <td>${monthlyData[month].events} Event(s)</td>
                    <td>৳${monthlyData[month].totalValue.toLocaleString()}</td>
                    <td>৳${monthlyData[month].collected.toLocaleString()}</td>
                `;
                monthlyList.appendChild(tr);
            });
        }
    } catch (error) {
        console.error("Error loading dashboard:", error);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color: red;">Failed to load data. Check Firebase permissions.</td></tr>';
    }
}

async function viewHistoryItem(docId) {
    try {
        const doc = await db.collection("quotations").doc(docId).get();
        if(doc.exists) {
            let data = doc.data();
            data.firebaseDocId = doc.id;
            renderQuotation(data);
        }
    } catch (error) {
        console.error("Error fetching document:", error);
    }
}

async function editHistoryItem(docId) {
    try {
        const doc = await db.collection("quotations").doc(docId).get();
        if(doc.exists) {
            const item = doc.data();
            
            document.getElementById('firebase_doc_id').value = doc.id;
            document.getElementById('edit_id').value = item.id;
            
            document.getElementById('c_name').value = item.name;
            document.getElementById('c_phone').value = item.phone;
            document.getElementById('c_event').value = item.event;
            
            // Set multiple dates in calendar during edit
            const dateInput = document.getElementById('c_date');
            if (dateInput._flatpickr) {
                dateInput._flatpickr.setDate(item.rawDate ? item.rawDate.split(', ') : []);
            } else {
                dateInput.value = item.rawDate || ""; 
            }
            
            document.getElementById('c_num_shifts').value = item.numShifts;
            document.getElementById('c_shift_details').value = item.shiftDetails;
            
            document.getElementById('c_photo_count').value = item.photoCount || 0;
            document.getElementById('c_cinema_count').value = item.cinemaCount || 0;
            
            document.getElementById('c_venue').value = item.venue;
            document.getElementById('c_payment').value = item.payment;
            document.getElementById('c_prints').value = item.prints !== 'N/A' ? item.prints : '';
            document.getElementById('c_delivery').value = item.delivery !== 'N/A' ? item.delivery : '';
            
            if (item.deliveryTimeSelection) {
                document.getElementById('c_delivery_time').value = item.deliveryTimeSelection;
            } else {
                document.getElementById('c_delivery_time').value = 'On Season';
            }
            
            document.getElementById('c_currency').value = item.currencyCode || 'BDT';
            document.getElementById('c_extra_time').checked = item.includeExtraTime !== false;
            document.getElementById('c_show_contact').checked = item.showContact !== false; 
            document.getElementById('c_show_terms').checked = item.showTerms !== false; 
            document.getElementById('c_currency').dispatchEvent(new Event('change')); 
            
            document.getElementById('p_name').value = item.pName;
            document.getElementById('p_price').value = item.pPriceOriginal || item.totalPackagePrice; 
            
            document.getElementById('e_name').value = item.eName || '';
            document.getElementById('e_price').value = item.ePrice || '';
            document.getElementById('t_charge').value = item.tCharge || '';
            
            document.getElementById('discount_pct').value = item.discountPct || '';
            document.getElementById('vat_pct').value = item.vatPct || '';
            
            document.getElementById('adv_pay').value = item.advPay || 0;
            
            const duePayEl = document.getElementById('due_pay');
            duePayEl.disabled = false;
            duePayEl.style.backgroundColor = "white";
            duePayEl.placeholder = "Enter payment against due";
            duePayEl.value = item.duePay || '';
            
            document.getElementById('c_signature').value = item.signatureOption || 'Shovon';

            document.getElementById('form-title').innerText = "Edit Quotation: " + item.qNo;
            document.getElementById('submit-btn-text').innerText = "Update Quotation & Payment 🔄";

            showSection('form-section');
        }
    } catch (error) {
        console.error("Error loading for edit:", error);
    }
}

async function deleteHistoryItem(docId) {
    if(confirm("Are you sure you want to delete this quotation PERMANENTLY from the database?")) {
        try {
            await db.collection("quotations").doc(docId).delete();
            loadDashboard(); 
        } catch (error) {
            console.error("Error deleting document: ", error);
            alert("Failed to delete! Check internet connection.");
        }
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
    const oldScale = currentScale;
    currentScale = 1; 
    applyZoom(); 

    const pages = document.querySelectorAll('.a4-page');
    pages.forEach(page => {
        page.style.boxShadow = 'none';
        page.style.margin = '0';
        page.style.height = '296mm'; 
        page.style.overflow = 'hidden';
    });

    const qNo = document.getElementById('out_qno').innerText || "New";
    const opt = {
        margin:       0,
        filename:     `Quotation_${qNo}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, scrollY: 0 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak:    { mode: ['css', 'legacy'] }
    };

    const btn = document.querySelector('.btn-pdf');
    const oldText = btn.innerText;
    btn.innerText = "Downloading... ⏳";

    html2pdf().set(opt).from(element).save().then(() => {
        currentScale = oldScale;
        applyZoom();
        pages.forEach(page => {
            page.style.boxShadow = '';
            page.style.margin = '';
            page.style.height = '297mm';
        });
        btn.innerText = oldText;
    });
}

function sendWhatsApp() {
    if(!currentQuoteData) return;
    const sym = currentQuoteData.currencySymbol || '৳';
    const message = `Hello ${currentQuoteData.name},\n\nHere is your quotation from *DocuReel Photography & Cinematography*.\n\n*Quotation No:* ${currentQuoteData.qNo}\n*Total Due:* ${sym}${currentQuoteData.dueAmount.toLocaleString()}\n\nPlease check the attached document. Let us know if you have any questions!\n\nBest Regards,\nDocuReel`;
    
    const cleanPhone = currentQuoteData.phone.replace(/\D/g, ''); 
    const url = `https://wa.me/88${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
}
