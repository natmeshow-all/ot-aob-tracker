// Global State
let currentUser = null;
let currentUserSettings = { cutoffDate: 0 };
let currentView = 'monthly';
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth() + 1;
let currentTab = 'dashboard';
let currentEditTransactionId = null;
let _dashCache = null; // cached dashboard computed data for popups

window.showAlert = function(title, message, type = 'error') {
    document.getElementById('alertTitle').textContent = title;
    document.getElementById('alertMessage').textContent = message;
    document.getElementById('alertIcon').textContent = type === 'success' ? '✅' : (type === 'warning' ? '⚠️' : '❌');
    document.getElementById('customAlertModal').classList.add('active');
};

window.showConfirm = function(title, message, onConfirmCallback) {
    document.getElementById('customConfirmModal').querySelector('h3').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    const btn = document.getElementById('confirmActionBtn');
    
    // Remove old listeners by cloning the button
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    
    newBtn.addEventListener('click', () => {
        closeModal('customConfirmModal');
        onConfirmCallback();
    });
    
    document.getElementById('customConfirmModal').classList.add('active');
};

// Thai month names
const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

// Currency Format
function formatCurrency(amount) {
    return '฿' + Number(amount).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Date Format
function formatDate(dateString) {
    const date = dateString instanceof Date ? dateString : new Date(dateString);
    const day = date.getDate();
    const month = thaiMonths[date.getMonth()];
    const year = date.getFullYear() + 543; // Buddhist year
    return `${day} ${month} ${year}`;
}

// Check Authentication on Load
window.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (token) {
        try {
            const res = await fetch('/api/auth/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                currentUser = data.user;
                await loadUserSettings();
                showApp();
                loadDashboard();
            } else {
                showLogin();
            }
        } catch (e) {
            showLogin();
        }
    } else {
        showLogin();
    }
});

// API Helper
async function apiFetch(url, options = {}) {
    const token = localStorage.getItem('token');
    if (!options.headers) options.headers = {};
    if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
    }
    options.headers['Content-Type'] = 'application/json';
    
    const res = await fetch(url, options);
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'API Error');
    }
    return res.json();
}

async function loadUserSettings() {
    try {
        const fund = await apiFetch('/api/fund');
        if (fund) {
            currentUserSettings = fund;
        }
    } catch(e) {}
}

function getDateRangeQuery() {
    if (currentView === 'yearly') {
        return `?year=${currentYear}`;
    }
    
    let cutoff = currentUserSettings.cutoffDate || 0;
    
    if (cutoff === 0 || cutoff >= 31) {
        return `?year=${currentYear}&month=${currentMonth}`;
    }
    
    let startYear = currentYear;
    let startMonth = currentMonth - 1;
    if (startMonth === 0) {
        startMonth = 12;
        startYear--;
    }
    
    const startStr = `${startYear}-${String(startMonth).padStart(2, '0')}-${String(cutoff + 1).padStart(2, '0')}`;
    const endStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(cutoff).padStart(2, '0')}`;
    
    return `?startDate=${startStr}&endDate=${endStr}`;
}

// --- Auth Functions ---
window.toggleRegister = function() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    if (loginForm.style.display === 'none') {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
    } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
    }
};

window.handleLogin = async function(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    try {
        const data = await apiFetch('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        localStorage.setItem('token', data.token);
        currentUser = data.user;
        await loadUserSettings();
        showApp();
        loadDashboard();
    } catch (err) {
        showAlert('ผิดพลาด', 'เข้าสู่ระบบไม่สำเร็จ: ' + err.message, 'error');
    }
};

window.handleRegister = async function(e) {
    e.preventDefault();
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    try {
        const data = await apiFetch('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name, email, password })
        });
        localStorage.setItem('token', data.token);
        currentUser = data.user;
        await loadUserSettings();
        showApp();
        loadDashboard();
    } catch (err) {
        showAlert('ผิดพลาด', 'สมัครสมาชิกไม่สำเร็จ: ' + err.message, 'error');
    }
};

window.logout = function() {
    localStorage.removeItem('token');
    currentUser = null;
    showLogin();
};

function showLogin() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
}

function showApp() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('app').style.display = 'block';

    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('userAvatar').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=random`;

    updateDateDisplay();
}

// --- View Management ---
window.switchView = function(view) {
    currentView = view;
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });
    updateDateDisplay();
    loadCurrentTab();
};

function updateDateDisplay() {
    const display = document.getElementById('currentDate');
    const periodDisplay = document.getElementById('currentDatePeriod');
    
    if (currentView === 'monthly') {
        display.textContent = `${thaiMonths[currentMonth - 1]} ${currentYear + 543}`;
        
        if (periodDisplay) {
            let cutoff = currentUserSettings?.cutoffDate || 0;
            if (cutoff > 0 && cutoff < 31) {
                let startYear = currentYear;
                let startMonth = currentMonth - 1;
                if (startMonth === 0) {
                    startMonth = 12;
                    startYear--;
                }
                
                const startStr = `${cutoff + 1} ${thaiMonths[startMonth - 1]} ${startYear === currentYear ? '' : (startYear + 543)}`;
                const endStr = `${cutoff} ${thaiMonths[currentMonth - 1]} ${currentYear + 543}`;
                periodDisplay.textContent = `( ${startStr} - ${endStr} )`;
                periodDisplay.classList.remove('hidden');
            } else {
                periodDisplay.textContent = `( 1 - สิ้นเดือน )`;
                periodDisplay.classList.remove('hidden');
            }
        }
    } else {
        display.textContent = `ปี ${currentYear + 543}`;
        if (periodDisplay) periodDisplay.classList.add('hidden');
    }
}

window.navigateDate = function(direction) {
    if (currentView === 'monthly') {
        currentMonth += direction;
        if (currentMonth > 12) {
            currentMonth = 1;
            currentYear++;
        } else if (currentMonth < 1) {
            currentMonth = 12;
            currentYear--;
        }
    } else {
        currentYear += direction;
    }
    updateDateDisplay();
    loadCurrentTab();
};

// --- Tab Management ---
window.switchTab = function(tab) {
    currentTab = tab;
    document.querySelectorAll('.nav-tab, .nav-tab-premium').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    document.getElementById(`${tab}Tab`).classList.add('active');

    loadCurrentTab();
};

function loadCurrentTab() {
    switch (currentTab) {
        case 'dashboard': loadDashboard(); break;
        case 'ot': loadOTRecords(); break;
        case 'fund': loadProvidentFund(); break;
        case 'income': loadTransactions('income'); break;
        case 'expense': loadTransactions('expense'); break;
    }
}

// --- Dashboard ---
async function loadDashboard() {
    if (!currentUser) return;

    try {
        const [otRecords, fundData, transactions] = await Promise.all([
            apiFetch(`/api/ot${getDateRangeQuery()}`),
            getFundSummary(),
            apiFetch(`/api/transactions${getDateRangeQuery()}`)
        ]);

        // Compute OT
        let otTotalHours = 0, otTotalAmount = 0, otCount = 0;
        let otNormal = { hours: 0, amount: 0, count: 0 };
        let otHoliday = { hours: 0, amount: 0, count: 0 };
        otRecords.forEach(r => {
            otTotalHours += r.hours || 0;
            otTotalAmount += r.total || 0;
            otCount++;
            if ((r.multiplier || 1) >= 1.5) {
                otHoliday.hours += r.hours || 0; otHoliday.amount += r.total || 0; otHoliday.count++;
            } else {
                otNormal.hours += r.hours || 0; otNormal.amount += r.total || 0; otNormal.count++;
            }
        });

        // Compute Transactions
        let income = 0, expenses = 0, incomeCount = 0, expenseCount = 0;
        const incomeByCategory = {}, expenseByCategory = {};
        transactions.forEach(t => {
            if (t.type === 'income') {
                income += t.amount || 0; incomeCount++;
                if (!incomeByCategory[t.category]) incomeByCategory[t.category] = { total: 0, count: 0 };
                incomeByCategory[t.category].total += t.amount || 0;
                incomeByCategory[t.category].count++;
            } else {
                expenses += t.amount || 0; expenseCount++;
                if (!expenseByCategory[t.category]) expenseByCategory[t.category] = { total: 0, count: 0 };
                expenseByCategory[t.category].total += t.amount || 0;
                expenseByCategory[t.category].count++;
            }
        });

        // Auto-include provident fund employee contribution as expense
        const fundExpense = fundData.periodEmployeeAmount || 0;
        if (fundExpense > 0 && !expenseByCategory['หักกองทุนเลี้ยงชีพ']) {
            // Only auto-add if user hasn't already manually recorded it as a transaction
            expenseByCategory['หักกองทุนเลี้ยงชีพ'] = { total: fundExpense, count: 1 };
            expenses += fundExpense;
            expenseCount++;
        } else if (fundExpense > 0 && expenseByCategory['หักกองทุนเลี้ยงชีพ']) {
            // Already recorded manually — just display existing, don't double-count
        }

        const balance = income - expenses;

        // รวม OT เข้ารายรับ
        if (otTotalAmount > 0) {
            incomeByCategory['OT'] = { total: otTotalAmount, count: otCount };
        }
        const totalIncome = income + otTotalAmount;
        const totalIncomeCount = incomeCount + otCount;
        const totalBalance = totalIncome - expenses;

        // Cache for popup use
        _dashCache = {
            income: totalIncome, expenses, balance: totalBalance,
            incomeCount: totalIncomeCount, expenseCount,
            incomeByCategory, expenseByCategory,
            otTotalHours, otTotalAmount, otCount, otNormal, otHoliday,
            fundData, transactions, otRecords
        };

        // Fill Quick Stats
        animateValue('dashBalance', 0, totalBalance, 1000, true);
        const dashBalEl = document.getElementById('dashBalance');
        if (dashBalEl) dashBalEl.style.color = '#06b6d4'; // รายรับสุทธิ์ = สีฟ้า (accent-cyan)

        animateValue('dashIncome', 0, totalIncome, 1000, true);
        animateValue('dashExpense', 0, expenses, 1000, true);
        animateValue('dashOtAmount', 0, otTotalAmount, 1000, true);
        animateValue('dashFundAmount', 0, fundData.total || 0, 1000, true);

        const elSet = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        elSet('dashIncomeCount', totalIncomeCount);
        elSet('dashExpenseCount', expenseCount);
        elSet('dashOtHours', otTotalHours.toFixed(1));
        elSet('dashOtCount', otCount);
        elSet('dashFundDuration', fundData.duration || '-');
        elSet('dashIncomeSmall', formatCurrency(totalIncome));
        elSet('dashExpenseSmall', formatCurrency(expenses));

        const totalBudget = totalIncome || 1;
        elSet('dashBalanceIncomePct', Math.round((totalIncome / totalBudget) * 100) + '%');
        elSet('dashBalanceExpensePct', Math.round((expenses / totalBudget) * 100) + '%');

        const allItems = [
            ...transactions.map(t => ({ ...t })),
            ...otRecords.map(r => ({ ...r, type: 'income', category: 'OT', amount: r.total }))
        ];
        elSet('dashRecentCount', allItems.length);

        const balanceBar = document.getElementById('balanceBar');
        if (balanceBar) setTimeout(() => balanceBar.style.width = `${Math.max(0, Math.min(100, (totalBalance / totalBudget) * 100))}%`, 500);

    } catch (error) {
        console.error('Failed to load dashboard:', error);
    }
}

// --- Dashboard Popup ---
const CAT_EMOJI = {
    'เงินเดือน':'💰','ค่าอาหาร':'🍱','ค่ากะกลางคืน':'🌙','เบี้ยขยัน':'⭐','ค่าโบนัส':'🎁','อื่นๆ (รายรับ)':'📥',
    'หักประกันสังคม':'🏥','หักกองทุนเลี้ยงชีพ':'🏦','หัก กยศ.':'📚','อื่นๆ (รายจ่าย)':'📤','OT':'⏱️'
};

function buildCategoryRows(byCategory, total, colorClass) {
    const isIncome = colorClass === 'text-income';
    const color = isIncome ? '#10b981' : '#f43f5e';
    const barColor = isIncome ? '#10b981' : '#f43f5e';

    const cats = Object.entries(byCategory).sort((a, b) => b[1].total - a[1].total);
    if (cats.length === 0) return '<div class="text-slate-500 text-sm text-center py-4">ยังไม่มีข้อมูล</div>';
    return cats.map(([cat, data]) => {
        const pct = total > 0 ? Math.round((data.total / total) * 100) : 0;
        const emoji = CAT_EMOJI[cat] || '📌';
        return `<div class="mb-3">
            <div class="flex justify-between items-center mb-1">
                <span class="text-sm text-slate-300">${emoji} ${cat} <span class="text-slate-500 text-xs">(${data.count} รายการ)</span></span>
                <span class="font-prompt font-bold text-sm" style="color:${color}">${formatCurrency(data.total)}</span>
            </div>
            <div class="bg-white/5 h-1.5 rounded-full overflow-hidden">
                <div class="h-full rounded-full" style="width:${pct}%; background-color:${barColor}"></div>
            </div>
            <div class="text-right text-xs text-slate-500 mt-0.5">${pct}%</div>
        </div>`;
    }).join('') + `<div class="border-t border-white/10 pt-3 flex justify-between mt-1">
        <span class="text-slate-400 text-sm font-medium">รวมทั้งหมด</span>
        <span class="font-prompt font-bold" style="color:${color}">${formatCurrency(total)}</span>
    </div>`;
}

window.openDashPopup = function(type) {
    if (!_dashCache) return;
    const d = _dashCache;
    const popup = document.getElementById('dashDetailPopup');
    const icon = document.getElementById('dashDetailPopupIcon');
    const title = document.getElementById('dashDetailPopupTitle');
    const subtitle = document.getElementById('dashDetailPopupSubtitle');
    const body = document.getElementById('dashDetailPopupBody');

    let iconVal = '📊', titleVal = '', subtitleVal = '', bodyHTML = '';

    if (type === 'income') {
        iconVal = '📈'; titleVal = 'สรุปรายรับ'; subtitleVal = `รวม ${d.incomeCount} รายการ · ${formatCurrency(d.income)}`;
        bodyHTML = buildCategoryRows(d.incomeByCategory, d.income, 'text-income');
    } else if (type === 'expense') {
        iconVal = '📉'; titleVal = 'สรุปรายจ่าย'; subtitleVal = `รวม ${d.expenseCount} รายการ · ${formatCurrency(d.expenses)}`;
        bodyHTML = buildCategoryRows(d.expenseByCategory, d.expenses, 'text-expense');
    } else if (type === 'ot') {
        iconVal = '⏱️'; titleVal = 'สรุปรายได้ OT'; subtitleVal = `${d.otCount} รอบ · ${d.otTotalHours.toFixed(1)} ชั่วโมง`;
        const avgRate = d.otTotalHours > 0 ? d.otTotalAmount / d.otTotalHours : 0;
        bodyHTML = d.otCount === 0 ? '<div class="text-slate-500 text-sm text-center py-4">ยังไม่มีข้อมูล OT</div>' : `
        <div class="grid grid-cols-2 gap-3 mb-4">
            <div class="bg-white/5 rounded-lg p-3 border border-white/10">
                <div class="text-xs text-slate-400 mb-1">OT ×1 (ปกติ)</div>
                <div class="font-prompt font-bold text-white">${formatCurrency(d.otNormal.amount)}</div>
                <div class="text-xs text-slate-500 mt-1">${d.otNormal.hours.toFixed(1)} ชม. · ${d.otNormal.count} รอบ</div>
            </div>
            <div class="bg-white/5 rounded-lg p-3 border border-accent-cyan/30">
                <div class="text-xs text-accent-cyan mb-1">OT ×1.5 (วันหยุด)</div>
                <div class="font-prompt font-bold text-accent-cyan">${formatCurrency(d.otHoliday.amount)}</div>
                <div class="text-xs text-slate-500 mt-1">${d.otHoliday.hours.toFixed(1)} ชม. · ${d.otHoliday.count} รอบ</div>
            </div>
        </div>
        <div class="space-y-2 border-t border-white/10 pt-3">
            <div class="flex justify-between text-sm"><span class="text-slate-400">รวมชั่วโมง OT</span><span class="text-white font-semibold">${d.otTotalHours.toFixed(1)} ชม.</span></div>
            <div class="flex justify-between text-sm"><span class="text-slate-400">เรทเฉลี่ย/ชั่วโมง</span><span class="text-accent-indigo font-semibold">${formatCurrency(avgRate)}</span></div>
            <div class="flex justify-between text-sm"><span class="text-slate-400">รวมเงิน OT</span><span class="font-prompt font-bold text-income">${formatCurrency(d.otTotalAmount)}</span></div>
        </div>`;
    } else if (type === 'fund') {
        const fd = d.fundData;
        iconVal = '🏦'; titleVal = 'กองทุนสำรองเลี้ยงชีพ'; subtitleVal = fd.duration || '-';
        bodyHTML = (!fd || fd.total === 0) ? '<div class="text-slate-500 text-sm text-center py-4">ยังไม่มีข้อมูลกองทุน</div>' : `
        <div class="space-y-3">
            <div class="flex justify-between text-sm"><span class="text-slate-400">ส่วนพนักงานสะสม</span><span class="text-accent-cyan font-semibold">${formatCurrency(fd.employeeTotal || 0)}</span></div>
            <div class="flex justify-between text-sm"><span class="text-slate-400">ส่วนนายจ้างสมทบ</span><span class="text-income font-semibold">${formatCurrency(fd.employerTotal || 0)}</span></div>
            <div class="border-t border-white/10 pt-2 flex justify-between text-sm"><span class="text-slate-300 font-medium">รวมสะสมทั้งหมด</span><span class="font-prompt font-bold text-accent-violet">${formatCurrency(fd.total || 0)}</span></div>
            <div class="flex justify-between text-sm"><span class="text-slate-400">ระยะเวลาสะสม</span><span class="text-slate-300">${fd.duration || '-'}</span></div>
            <div class="flex justify-between text-sm"><span class="text-slate-400">จำนวนเดือนที่ส่ง</span><span class="text-slate-300">${fd.totalMonths || 0} เดือน</span></div>
        </div>`;
    } else if (type === 'recent') {
        iconVal = '🕐'; titleVal = 'รายการทั้งหมด'; subtitleVal = 'เรียงตามวันที่ล่าสุด';
        const allItems = [
            ...d.transactions.map(t => ({ ...t })),
            ...d.otRecords.map(r => ({ ...r, type: 'income', category: 'OT', amount: r.total }))
        ].sort((a, b) => new Date(b.date) - new Date(a.date));
        bodyHTML = allItems.length === 0 ? '<div class="text-slate-500 text-sm text-center py-4">ยังไม่มีรายการ</div>' :
            allItems.map(item => {
                const isIncome = item.type === 'income';
                const emoji = CAT_EMOJI[item.category] || (isIncome ? '📥' : '📤');
                const d2 = new Date(item.date);
                const dateStr = `${d2.getDate()} ${thaiMonths[d2.getMonth()]} ${d2.getFullYear() + 543}`;
                return `<div class="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <div class="flex items-center gap-2">
                        <span>${emoji}</span>
                        <div><div class="text-sm text-white">${item.category}</div><div class="text-xs text-slate-500">${dateStr}</div></div>
                    </div>
                    <span class="font-prompt font-bold text-sm ${isIncome ? 'text-income' : 'text-expense'}">${isIncome ? '+' : '-'}${formatCurrency(item.amount)}</span>
                </div>`;
            }).join('');
    }

    icon.textContent = iconVal;
    title.textContent = titleVal;
    subtitle.textContent = subtitleVal;
    body.innerHTML = bodyHTML;
    popup.style.display = 'block';
    document.body.style.overflow = 'hidden';
};

window.closeDashPopup = function(event) {
    if (event && event.target !== document.getElementById('dashDetailPopup') && event.type !== 'click') return;
    if (event && event.target !== document.getElementById('dashDetailPopup')) return;
    document.getElementById('dashDetailPopup').style.display = 'none';
    document.body.style.overflow = '';
};

window.closeDashPopupDirect = function() {
    document.getElementById('dashDetailPopup').style.display = 'none';
    document.body.style.overflow = '';
};

function animateValue(elementId, start, end, duration, isCurrency = false) {

    const element = document.getElementById(elementId);
    if (!element) return;
    const startTime = performance.now();
    const range = end - start;

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const current = start + (range * easeOutQuart);

        element.textContent = isCurrency ? formatCurrency(current) : Math.round(current);

        if (progress < 1) requestAnimationFrame(update);
        else element.textContent = isCurrency ? formatCurrency(end) : end;
    }
    requestAnimationFrame(update);
}

// --- OT Records ---
async function getOTSummary() {
    const records = await apiFetch(`/api/ot${getDateRangeQuery()}`);
    let totalHours = 0, totalAmount = 0, count = 0;

    records.forEach(data => {
        totalHours += data.hours || 0;
        totalAmount += data.total || 0;
        count++;
    });

    const avgRate = count > 0 ? totalAmount / totalHours : 0;
    return { totalHours, totalAmount, count, avgRate };
}

async function getOTRecordsForCalendar() {
    return await apiFetch(`/api/ot${getDateRangeQuery()}`);
}

function renderOTCalendar(otRecords) {
    const calendarEl = document.getElementById('otCalendar');
    if (!calendarEl) return;

    let cutoff = currentUserSettings.cutoffDate || 0;
    
    let startYear = currentYear;
    let startMonth = currentMonth;
    let firstDay, lastDay;

    if (cutoff > 0 && cutoff < 31) {
        startMonth = currentMonth - 1;
        if (startMonth === 0) {
            startMonth = 12;
            startYear--;
        }
        firstDay = new Date(startYear, startMonth - 1, cutoff + 1);
        lastDay = new Date(currentYear, currentMonth - 1, cutoff);
    } else {
        firstDay = new Date(currentYear, currentMonth - 1, 1);
        lastDay = new Date(currentYear, currentMonth, 0);
    }

    const startingDayOfWeek = firstDay.getDay();

    const otByDateString = {};
    otRecords.forEach(record => {
        // use local date parts to prevent timezone shifts
        const date = new Date(record.date);
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        if (!otByDateString[dateStr]) otByDateString[dateStr] = { hours: 0, amount: 0, count: 0 };
        otByDateString[dateStr].hours += record.hours || 0;
        otByDateString[dateStr].amount += record.total || 0;
        otByDateString[dateStr].count++;
    });

    let calendarHTML = '<div class="calendar-header">';
    const dayLabels = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
    dayLabels.forEach(label => calendarHTML += `<div class="calendar-day-label">${label}</div>`);
    calendarHTML += '</div>';

    for (let i = 0; i < startingDayOfWeek; i++) {
        calendarHTML += '<div class="calendar-day empty"></div>';
    }

    let currentDatePtr = new Date(firstDay);
    while (currentDatePtr <= lastDay) {
        const dateStr = `${currentDatePtr.getFullYear()}-${String(currentDatePtr.getMonth() + 1).padStart(2, '0')}-${String(currentDatePtr.getDate()).padStart(2, '0')}`;
        const dayNum = currentDatePtr.getDate();
        const m = currentDatePtr.getMonth();
        
        const otData = otByDateString[dateStr];
        let dayClass = 'calendar-day';
        let hoursText = '', tooltip = '';

        if (otData) {
            const hours = otData.hours;
            if (hours < 4) dayClass += ' has-ot has-ot-light';
            else if (hours < 8) dayClass += ' has-ot has-ot-medium';
            else dayClass += ' has-ot has-ot-intense';
            hoursText = `<div class="calendar-day-hours">${hours}ชม.</div>`;
            tooltip = `<div class="calendar-tooltip">${dayNum} ${thaiMonths[m]}<br/>${hours} ชั่วโมง - ${formatCurrency(otData.amount)}</div>`;
        }
        calendarHTML += `<div class="${dayClass}"><div class="calendar-day-number">${dayNum}</div>${hoursText}${tooltip}</div>`;
        
        currentDatePtr.setDate(currentDatePtr.getDate() + 1);
    }
    calendarEl.innerHTML = calendarHTML;
}

async function loadOTRecords() {
    if (!currentUser) return;
    try {
        const records = await apiFetch(`/api/ot${getDateRangeQuery()}`);
        let totalHours = 0, totalAmount = 0;

        records.forEach(data => {
            totalHours += data.hours || 0;
            totalAmount += data.total || 0;
        });

        const list = document.getElementById('otList');
        const summary = document.getElementById('otSummary');

        if (records.length > 0) {
            list.innerHTML = records.map(record => {
                const mult = record.multiplier || 1;
                let badgeClass = 'multiplier-badge multiplier-badge-1';
                let badgeText = '×1 ปกติ';
                if (mult >= 3) {
                    badgeClass = 'multiplier-badge multiplier-badge-3';
                    badgeText = '×3 วันหยุดพิเศษ';
                } else if (mult >= 1.5) {
                    badgeClass = 'multiplier-badge multiplier-badge-15';
                    badgeText = '×1.5 ล่วงเวลา';
                }
                return `
                <div class="record-item">
                    <div class="record-info">
                        <div class="record-date">${formatDate(record.date)}</div>
                        <div class="record-title flex items-center gap-2">
                            ${record.hours} ชั่วโมง × ${formatCurrency(record.hourlyRate)}/ชม.
                            <span class="${badgeClass}">${badgeText}</span>
                        </div>
                        ${record.baseSalary ? `<div class="text-xs text-slate-400 mt-1">ฐานเงินเดือน: ${formatCurrency(record.baseSalary)}</div>` : ''}
                        ${record.description ? `<div class="record-subtitle">${record.description}</div>` : ''}
                        <div class="record-actions">
                            <button class="record-btn delete" onclick="deleteOTRecord('${record.id}')">ลบ</button>
                        </div>
                    </div>
                    <div class="record-amount">${formatCurrency(record.total)}</div>
                </div>
            `}).join('');

            summary.innerHTML = `
                <div class="summary-row">
                    <span class="summary-label">จำนวนรายการ</span>
                    <span class="summary-value">${records.length} รายการ</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">รวมชั่วโมง</span>
                    <span class="summary-value">${totalHours} ชม.</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">รวมเงิน OT</span>
                    <span class="summary-value large">${formatCurrency(totalAmount)}</span>
                </div>
            `;
        } else {
            list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-text">ยังไม่มีข้อมูล OT</div></div>';
            summary.innerHTML = '';
        }
    } catch (error) {
        console.error('Failed to load OT records:', error);
    }
}

window.openModal = function(modalId, type) {
    document.getElementById(modalId).classList.add('active');

    // Helper: get default date for the currently selected month/year
    const getDefaultDate = () => {
        const now = new Date();
        const isCurrentPeriod = (now.getFullYear() === currentYear && now.getMonth() + 1 === currentMonth);
        if (isCurrentPeriod) {
            // Local timezone date format
            return new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        }
        // Use 1st day of selected month
        const m = String(currentMonth).padStart(2, '0');
        return `${currentYear}-${m}-01`;
    };

    // Auto-fill dates
    if (modalId === 'otModal') {
        document.getElementById('otDate').value = getDefaultDate();
        
        let savedOt = {};
        if (currentUser) {
            savedOt = JSON.parse(localStorage.getItem('ot_prefs_' + currentUser.id) || '{}');
        }
        document.getElementById('otHours').value = savedOt.hours || '';
        document.getElementById('otDescription').value = savedOt.description || '';
        if (savedOt.multiplier) {
            const r = document.querySelector(`input[name="otMultiplier"][value="${savedOt.multiplier}"]`);
            if (r) r.checked = true;
        } else {
            document.getElementById('otMult1').checked = true;
        }
        
        onOtDateChange();
    } else if (modalId === 'transactionModal') {
        currentEditTransactionId = null;
        const modalTitle = document.getElementById('transactionModal').querySelector('h3');
        if (modalTitle) modalTitle.textContent = type === 'income' ? 'เพิ่มรายรับ' : 'เพิ่มรายจ่าย';
        document.getElementById('transactionDate').value = getDefaultDate();
        document.getElementById('transactionType').value = type || 'income';
        document.getElementById('transactionAmount').value = '';
        document.getElementById('transactionDescription').value = '';
        updateTransactionCategories();
    }
};

const TRANSACTION_CATEGORIES = {
    income: [
        { value: 'เงินเดือน', label: '💰 เงินเดือน' },
        { value: 'ค่าอาหาร', label: '🍱 ค่าอาหาร' },
        { value: 'ค่ากะกลางคืน', label: '🌙 ค่ากะกลางคืน' },
        { value: 'เบี้ยขยัน', label: '⭐ เบี้ยขยัน' },
        { value: 'ค่าโบนัส', label: '🎁 ค่าโบนัส' },
        { value: 'อื่นๆ (รายรับ)', label: '📥 อื่นๆ' }
    ],
    expense: [
        { value: '\u0e2b\u0e31\u0e01\u0e1b\u0e23\u0e30\u0e01\u0e31\u0e19\u0e2a\u0e31\u0e07\u0e04\u0e21', label: '🏥 หักประกันสังคม' },
        { value: '\u0e2b\u0e31\u0e01 \u0e01\u0e22\u0e28.', label: '📚 หัก กยศ.' },
        { value: '\u0e2d\u0e37\u0e48\u0e19\u0e46 (\u0e23\u0e32\u0e22\u0e08\u0e48\u0e32\u0e22)', label: '📤 อื่นๆ' }
    ]
};

window.updateTransactionCategories = function() {
    const type = document.getElementById('transactionType').value;
    const select = document.getElementById('transactionCategory');
    const cats = TRANSACTION_CATEGORIES[type] || TRANSACTION_CATEGORIES.income;
    select.innerHTML = cats.map(c => `<option value="${c.value}">${c.label}</option>`).join('');
    onCategoryChange();
};

// Show/hide food allowance fields based on selected category
window.onCategoryChange = function() {
    const category = document.getElementById('transactionCategory')?.value;
    const isFood = category === 'ค่าอาหาร';
    const isNightShift = category === 'ค่ากะกลางคืน';
    const foodFields = document.getElementById('foodAllowanceFields');
    const nightShiftFields = document.getElementById('nightShiftFields');
    const amountField = document.getElementById('amountField');
    const amountInput = document.getElementById('transactionAmount');
    if (!foodFields || !nightShiftFields || !amountField || !amountInput) return;

    let savedPref = {};
    if (!currentEditTransactionId && currentUser) {
        const prefs = JSON.parse(localStorage.getItem('txn_prefs_' + currentUser.id) || '{}');
        savedPref = prefs[category] || {};
    }

    if (isFood) {
        foodFields.style.display = 'block';
        nightShiftFields.style.display = 'none';
        amountField.style.display = 'none';
        amountInput.removeAttribute('required');
        
        if (!currentEditTransactionId) {
            document.getElementById('foodDays').value = savedPref.foodDays || '';
            document.getElementById('foodRate').value = savedPref.foodRate || '';
            document.getElementById('transactionDescription').value = savedPref.description || '';
            if (savedPref.foodDays && savedPref.foodRate) {
                calculateFoodAmount();
            } else {
                document.getElementById('foodAmountDisplay').textContent = '฿0.00';
            }
        }
    } else if (isNightShift) {
        foodFields.style.display = 'none';
        nightShiftFields.style.display = 'block';
        amountField.style.display = 'none';
        amountInput.removeAttribute('required');
        
        if (!currentEditTransactionId) {
            document.getElementById('nightShiftDays').value = savedPref.nightShiftDays || '';
            document.getElementById('nightShiftRate').value = savedPref.nightShiftRate || '';
            document.getElementById('transactionDescription').value = savedPref.description || '';
            if (savedPref.nightShiftDays && savedPref.nightShiftRate) {
                calculateNightShiftAmount();
            } else {
                document.getElementById('nightShiftAmountDisplay').textContent = '฿0.00';
            }
        }
    } else {
        foodFields.style.display = 'none';
        nightShiftFields.style.display = 'none';
        amountField.style.display = 'block';
        amountInput.setAttribute('required', '');
        
        if (!currentEditTransactionId) {
            document.getElementById('transactionAmount').value = savedPref.amount || '';
            document.getElementById('transactionDescription').value = savedPref.description || '';
        }
    }
};

// Calculate food allowance total from days × daily rate
window.calculateFoodAmount = function() {
    const days = parseFloat(document.getElementById('foodDays').value) || 0;
    const rate = parseFloat(document.getElementById('foodRate').value) || 0;
    const total = days * rate;
    document.getElementById('foodAmountDisplay').textContent = formatCurrency(total);
};

window.calculateNightShiftAmount = function() {
    const days = parseFloat(document.getElementById('nightShiftDays').value) || 0;
    const rate = parseFloat(document.getElementById('nightShiftRate').value) || 0;
    const total = days * rate;
    document.getElementById('nightShiftAmountDisplay').textContent = formatCurrency(total);
};

window.closeModal = function(modalId) {
    document.getElementById(modalId).classList.remove('active');
};

window.onOtDateChange = async function() {
    const dateVal = document.getElementById('otDate').value;
    if (!dateVal) return;
    const d = new Date(dateVal);
    const month = d.getMonth();
    const year = d.getFullYear();
    
    const hint = document.getElementById('otSalaryHint');
    try {
        const fund = await apiFetch('/api/fund');
        if (fund && fund.contributions && fund.contributions.length > 0) {
            const contrib = fund.contributions.find(c => {
                const cd = new Date(c.date);
                return cd.getMonth() === month && cd.getFullYear() === year;
            });
            if (contrib) {
                document.getElementById('otBaseSalary').value = contrib.baseSalary;
                hint.textContent = `✅ ดึงจากบันทึกกองทุนเดือนนี้`;
                hint.style.color = '#4ade80';
            } else if (fund.baseSalary) {
                document.getElementById('otBaseSalary').value = fund.baseSalary;
                hint.textContent = `⚠️ ยังไม่มีบันทึกกองทุนเดือนนี้ — ใช้ค่าตั้งต้นแทน`;
                hint.style.color = '#f59e0b';
            }
        } else if (currentUserSettings && currentUserSettings.baseSalary) {
            document.getElementById('otBaseSalary').value = currentUserSettings.baseSalary;
            hint.textContent = '⚠️ ใช้ค่าเงินเดือนตั้งต้น';
            hint.style.color = '#f59e0b';
        }
    } catch (e) {}
    calculateOTAmount();
};

window.calculateOTAmount = function() {
    const base = parseFloat(document.getElementById('otBaseSalary').value) || 0;
    const hours = parseFloat(document.getElementById('otHours').value) || 0;
    const mult = parseFloat(document.querySelector('input[name="otMultiplier"]:checked')?.value || 1);
    
    const hourlyRate = base / 30 / 8 * mult;
    const total = hourlyRate * hours;
    
    document.getElementById('otRateDisplay').textContent = formatCurrency(hourlyRate);
    document.getElementById('otTotalDisplay').textContent = formatCurrency(total);
};

window.saveOtRecord = async function(event) {
    event.preventDefault();
    if (!currentUser) return;

    const dateValue = document.getElementById('otDate').value;
    const date = new Date(dateValue);
    const baseSalary = parseFloat(document.getElementById('otBaseSalary').value) || 0;
    const hours = parseFloat(document.getElementById('otHours').value);
    const multiplier = parseFloat(document.querySelector('input[name="otMultiplier"]:checked')?.value || 1);
    const hourlyRate = baseSalary / 30 / 8 * multiplier;

    const data = {
        date: date.toISOString(),
        baseSalary,
        multiplier,
        hours,
        hourlyRate,
        total: hours * hourlyRate,
        description: document.getElementById('otDescription').value,
        month: date.getMonth() + 1,
        year: date.getFullYear()
    };

    try {
        await apiFetch('/api/ot', { method: 'POST', body: JSON.stringify(data) });
        
        // Save OT prefs
        if (currentUser) {
            const otPrefs = { hours, multiplier, description: data.description };
            localStorage.setItem('ot_prefs_' + currentUser.id, JSON.stringify(otPrefs));
        }

        closeModal('otModal');
        loadOTRecords();
        loadDashboard();
    } catch (error) {
        showAlert('ผิดพลาด', 'บันทึกไม่สำเร็จ: ' + error.message, 'error');
    }
};

window.deleteOTRecord = function(id) {
    showConfirm('ยืนยันการลบ', 'ต้องการลบรายการนี้ใช่หรือไม่?', async () => {
        try {
            await apiFetch(`/api/ot/${id}`, { method: 'DELETE' });
            loadOTRecords();
            loadDashboard();
        } catch (error) {
            showAlert('ผิดพลาด', 'ลบไม่สำเร็จ: ' + error.message, 'error');
        }
    });
};

// --- Provident Fund ---
async function getFundSummary() {
    try {
        const fund = await apiFetch('/api/fund');
        if (!fund) return { total: 0, duration: '-', years: 0, periodEmployeeAmount: 0 };

        const allContributions = fund.contributions || [];

        // Filter contributions up to and including the selected month/year
        const filtered = allContributions.filter(c => {
            const d = new Date(c.date);
            const cYear = d.getFullYear();
            const cMonth = d.getMonth() + 1;
            if (currentView === 'yearly') {
                return cYear <= currentYear;
            }
            return cYear < currentYear || (cYear === currentYear && cMonth <= currentMonth);
        });

        const employeeTotal = filtered.reduce((sum, c) => sum + (c.employeeAmount || 0), 0);
        const employerTotal = filtered.reduce((sum, c) => sum + (c.employerAmount || 0), 0);
        const cumulativeTotal = employeeTotal + employerTotal;

        // Current period employee contribution (for expense auto-inclusion)
        let periodEmployeeAmount = 0;
        if (currentView === 'yearly') {
            // Sum all employee contributions for the current year
            periodEmployeeAmount = allContributions
                .filter(c => new Date(c.date).getFullYear() === currentYear)
                .reduce((sum, c) => sum + (c.employeeAmount || 0), 0);
        } else {
            // Find contribution for current month/year
            const monthContrib = allContributions.find(c => {
                const d = new Date(c.date);
                return d.getFullYear() === currentYear && d.getMonth() + 1 === currentMonth;
            });
            periodEmployeeAmount = monthContrib ? (monthContrib.employeeAmount || 0) : 0;
        }

        const totalMonths = filtered.length;
        const years = Math.floor(totalMonths / 12);
        const remainingMonths = totalMonths % 12;

        let duration = '';
        if (years > 0 && remainingMonths > 0) duration = `${years} ปี ${remainingMonths} เดือน`;
        else if (years > 0) duration = `${years} ปี`;
        else duration = `${totalMonths} เดือน`;

        return {
            total: cumulativeTotal,
            employeeTotal,
            employerTotal,
            totalMonths,
            duration,
            years,
            periodEmployeeAmount
        };
    } catch (error) {
        return { total: 0, employeeTotal: 0, employerTotal: 0, totalMonths: 0, duration: '-', years: 0, periodEmployeeAmount: 0 };
    }
}

async function loadProvidentFund() {
    if (!currentUser) return;
    try {
        const fund = await apiFetch('/api/fund');
        const infoDiv = document.getElementById('fundInfo');
        const summaryDiv = document.getElementById('fundSummary');
        const listDiv = document.getElementById('fundContributionsList');

        if (fund) {
            const contributions = fund.contributions || [];
            
            const totalMonths = contributions.length;
            const years = Math.floor(totalMonths / 12);
            const remainingMonths = totalMonths % 12;

            let duration = '';
            if (years > 0 && remainingMonths > 0) duration = `${years} ปี ${remainingMonths} เดือน`;
            else if (years > 0) duration = `${years} ปี`;
            else duration = `${totalMonths} เดือน`;

            const employeeTotal = contributions.reduce((sum, c) => sum + (c.employeeAmount || 0), 0);
            const employerTotal = contributions.reduce((sum, c) => sum + (c.employerAmount || 0), 0);
            const cumulativeTotal = employeeTotal + employerTotal;

            infoDiv.innerHTML = `
                <div class="fund-detail">
                    <div class="fund-detail-label">เงินเดือนตั้งต้น</div>
                    <div class="fund-detail-value">${formatCurrency(fund.baseSalary)}</div>
                </div>
                <div class="fund-detail">
                    <div class="fund-detail-label">หักส่วนพนักงานตามตั้งค่า</div>
                    <div class="fund-detail-value">${fund.employeePercentage}%</div>
                </div>
                <div class="fund-detail">
                    <div class="fund-detail-label">วันที่เริ่มสะสมในระบบ</div>
                    <div class="fund-detail-value">${formatDate(fund.startDate)}</div>
                    <div class="fund-duration-badge">${duration}</div>
                </div>
            `;

            summaryDiv.innerHTML = `
                <div class="summary-row">
                    <span class="summary-label">จำนวนเดือนที่ส่ง</span>
                    <span class="summary-value">${totalMonths} เดือน</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">ยอดหักส่วนพนักงานรวม</span>
                    <span class="summary-value" style="color: var(--color-accent-cyan)">${formatCurrency(employeeTotal)}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">ยอดสมทบส่วนนายจ้างรวม</span>
                    <span class="summary-value" style="color: var(--color-income)">${formatCurrency(employerTotal)}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">ยอดสะสมรวมทั้งหมด</span>
                    <span class="summary-value large" style="color: var(--color-accent-violet)">${formatCurrency(cumulativeTotal)}</span>
                </div>
            `;

            let displayContributions = contributions;
            if (currentView === 'monthly') {
                displayContributions = contributions.filter(c => {
                    const d = new Date(c.date);
                    return d.getFullYear() === currentYear && d.getMonth() + 1 === currentMonth;
                });
            } else if (currentView === 'yearly') {
                displayContributions = contributions.filter(c => {
                    const d = new Date(c.date);
                    return d.getFullYear() === currentYear;
                });
            }

            if (displayContributions.length > 0) {
                // Sort by date descending
                displayContributions.sort((a, b) => new Date(b.date) - new Date(a.date));
                listDiv.innerHTML = displayContributions.map(c => `
                    <div class="record-item">
                        <div class="record-info">
                            <div class="record-date">${formatDate(c.date)}</div>
                            <div class="record-title">
                                พนักงาน ${c.employeePercent}% (${formatCurrency(c.employeeAmount || 0)}) / 
                                นายจ้าง ${c.employerPercent}% (${formatCurrency(c.employerAmount || 0)})
                            </div>
                            <div class="text-sm text-slate-400 mt-1">ฐานเงินเดือน: ${formatCurrency(c.baseSalary || 0)}</div>
                            ${c.description ? `<div class="record-subtitle mt-1">${c.description}</div>` : ''}
                            <div class="record-actions mt-2">
                                <button class="record-btn text-accent-cyan hover:text-white" onclick="editFundContribution('${c._id || c.id}')">แก้ไข</button>
                                <button class="record-btn delete" onclick="deleteFundContribution('${c._id || c.id}')">ลบ</button>
                            </div>
                        </div>
                        <div class="record-amount text-accent-violet">+${formatCurrency((c.employeeAmount || 0) + (c.employerAmount || 0))}</div>
                    </div>
                `).join('');
            } else {
                listDiv.innerHTML = '<div class="empty-state"><div class="empty-state-icon">💰</div><div class="empty-state-text">ไม่มีข้อมูลยอดสะสมในช่วงเวลานี้</div></div>';
            }
        } else {
            infoDiv.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🏦</div><div class="empty-state-text">กรุณาตั้งค่าบัญชี & รอบตัดบิลก่อน</div></div>';
            summaryDiv.innerHTML = '';
            listDiv.innerHTML = '';
        }
    } catch (error) {}
}

window.openCombinedFundModal = async function() {
    document.getElementById('combinedFundModal').classList.add('active');
    
    // Checkbox default checked
    const check = document.getElementById('saveContribCheck');
    check.checked = true;
    toggleContribFields({ target: check });

    // Load existing fund data
    try {
        const fund = await apiFetch('/api/fund');
        let latestContribution = null;
        if (fund && fund.contributions && fund.contributions.length > 0) {
            const sorted = [...fund.contributions].sort((a, b) => new Date(b.date) - new Date(a.date));
            latestContribution = sorted[0];
        }

        // Set Date to today
        document.getElementById('combDate').value = new Date().toISOString().split('T')[0];
        
        if (fund) {
            document.getElementById('combStartDate').value = fund.startDate ? new Date(fund.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
            document.getElementById('combCutoffDate').value = fund.cutoffDate || 0;
            
            // For salary/percents, prefer latest contribution, else fund settings
            document.getElementById('combBaseSalary').value = latestContribution ? latestContribution.baseSalary : (fund.baseSalary || 0);
            document.getElementById('combEmpPercent').value = latestContribution ? latestContribution.employeePercent : (fund.employeePercentage || 5);
            document.getElementById('combEmpRPercent').value = latestContribution ? latestContribution.employerPercent : (fund.employerPercentage || 5);
        } else {
            document.getElementById('combStartDate').value = new Date().toISOString().split('T')[0];
            document.getElementById('combCutoffDate').value = 0;
            document.getElementById('combBaseSalary').value = 0;
            document.getElementById('combEmpPercent').value = 5;
            document.getElementById('combEmpRPercent').value = 5;
        }
        
        document.getElementById('combDescription').value = '';
        calcCombFund();
    } catch(e) {}
}

window.toggleContribFields = function(e) {
    const isChecked = e.target ? e.target.checked : e.checked;
    document.getElementById('contribFieldsWrapper').style.display = isChecked ? 'block' : 'none';
    
    // Toggle required fields
    if (isChecked) {
        document.getElementById('combDate').setAttribute('required', 'true');
    } else {
        document.getElementById('combDate').removeAttribute('required');
    }
}

window.calcCombFund = function() {
    const base = parseFloat(document.getElementById('combBaseSalary').value) || 0;
    const empP = parseFloat(document.getElementById('combEmpPercent').value) || 0;
    const empRP = parseFloat(document.getElementById('combEmpRPercent').value) || 0;

    const empAmt = base * (empP / 100);
    const empRAmt = base * (empRP / 100);

    document.getElementById('combEmpAmountDisplay').textContent = formatCurrency(empAmt);
    document.getElementById('combEmpRAmountDisplay').textContent = formatCurrency(empRAmt);
}

window.saveCombinedFund = async function(event) {
    event.preventDefault();
    if (!currentUser) return;

    const baseSalary = parseFloat(document.getElementById('combBaseSalary').value) || 0;
    const employeePercentage = parseFloat(document.getElementById('combEmpPercent').value) || 0;
    const employerPercentage = parseFloat(document.getElementById('combEmpRPercent').value) || 0;
    const startDate = new Date(document.getElementById('combStartDate').value).toISOString();
    const cutoffDate = parseInt(document.getElementById('combCutoffDate').value) || 0;
    const saveContrib = document.getElementById('saveContribCheck').checked;

    try {
        // 1. Save Settings
        await apiFetch('/api/fund', {
            method: 'POST',
            body: JSON.stringify({ baseSalary, employeePercentage, employerPercentage, startDate, cutoffDate })
        });

        // 2. Save Contribution if checked
        if (saveContrib) {
            const date = new Date(document.getElementById('combDate').value).toISOString();
            const description = document.getElementById('combDescription').value;
            
            await apiFetch('/api/fund/contributions', {
                method: 'POST',
                body: JSON.stringify({
                    date,
                    baseSalary,
                    employeePercent: employeePercentage,
                    employerPercent: employerPercentage,
                    employeeAmount: baseSalary * (employeePercentage / 100),
                    employerAmount: baseSalary * (employerPercentage / 100),
                    description
                })
            });
        }
        
        await loadUserSettings();
        updateDateDisplay();
        closeModal('combinedFundModal');
        loadProvidentFund();
        loadDashboard();
        loadOTRecords(); // Refresh to apply new cutoff
        if (currentTab === 'income' || currentTab === 'expense') {
            loadTransactions(currentTab);
        }
    } catch (error) {
        showAlert('ผิดพลาด', 'บันทึกไม่สำเร็จ: ' + error.message, 'error');
    }
};

let currentEditFundContribId = null;

window.editFundContribution = async function(id) {
    try {
        const fund = await apiFetch('/api/fund');
        if (!fund || !fund.contributions) return;
        const c = fund.contributions.find(x => x._id === id || x.id === id);
        if (!c) return;

        currentEditFundContribId = id;
        document.getElementById('editFundDate').value = new Date(c.date).toISOString().split('T')[0];
        document.getElementById('editFundBaseSalary').value = c.baseSalary;
        document.getElementById('editFundEmpPercent').value = c.employeePercent;
        document.getElementById('editFundEmpRPercent').value = c.employerPercent;
        document.getElementById('editFundDescription').value = c.description || '';
        calcEditFund();

        document.getElementById('editFundContribModal').classList.add('active');
    } catch (e) {
        showAlert('ผิดพลาด', 'ดึงข้อมูลไม่สำเร็จ', 'error');
    }
};

window.calcEditFund = function() {
    const base = parseFloat(document.getElementById('editFundBaseSalary').value) || 0;
    const empP = parseFloat(document.getElementById('editFundEmpPercent').value) || 0;
    const empRP = parseFloat(document.getElementById('editFundEmpRPercent').value) || 0;
    const empAmt = base * (empP / 100);
    const empRAmt = base * (empRP / 100);
    document.getElementById('editFundEmpAmountDisplay').textContent = formatCurrency(empAmt);
    document.getElementById('editFundEmpRAmountDisplay').textContent = formatCurrency(empRAmt);
};

window.saveEditFundContrib = async function(e) {
    e.preventDefault();
    const baseSalary = parseFloat(document.getElementById('editFundBaseSalary').value) || 0;
    const employeePercent = parseFloat(document.getElementById('editFundEmpPercent').value) || 0;
    const employerPercent = parseFloat(document.getElementById('editFundEmpRPercent').value) || 0;
    const date = new Date(document.getElementById('editFundDate').value).toISOString();
    const description = document.getElementById('editFundDescription').value;

    const employeeAmount = baseSalary * (employeePercent / 100);
    const employerAmount = baseSalary * (employerPercent / 100);

    try {
        await apiFetch(`/api/fund/contributions/${currentEditFundContribId}`, {
            method: 'PUT',
            body: JSON.stringify({
                date, baseSalary, employeePercent, employerPercent, employeeAmount, employerAmount, description
            })
        });
        closeModal('editFundContribModal');
        loadProvidentFund();
        loadDashboard();
    } catch (err) {
        showAlert('ผิดพลาด', 'บันทึกไม่สำเร็จ: ' + err.message, 'error');
    }
};

window.deleteFundContribution = function(id) {
    showConfirm('ยืนยันการลบ', 'ต้องการลบรายการสะสมกองทุนนี้ใช่หรือไม่?', async () => {
        try {
            await apiFetch(`/api/fund/contributions/${id}`, { method: 'DELETE' });
            loadProvidentFund();
            loadDashboard();
        } catch (error) {
            showAlert('ผิดพลาด', 'ลบไม่สำเร็จ: ' + error.message, 'error');
        }
    });
};

// --- Transactions ---
async function getTransactionSummary() {
    const records = await apiFetch(`/api/transactions${getDateRangeQuery()}`);
    let income = 0, expenses = 0;
    records.forEach(data => {
        if (data.type === 'income') income += data.amount || 0;
        else expenses += data.amount || 0;
    });
    return { income, expenses, balance: income - expenses };
}

async function loadTransactions(filterType) {
    if (!currentUser) return;
    try {
        const transactions = await apiFetch(`/api/transactions${getDateRangeQuery()}`);
        let total = 0;

        const filtered = transactions.filter(t => t.type === filterType);

        filtered.forEach(data => {
            total += data.amount || 0;
        });

        const list = document.getElementById(filterType + 'List');
        const summary = document.getElementById(filterType + 'Summary');

        if (filtered.length > 0) {
            list.innerHTML = filtered.map(trans => `
                <div class="record-item">
                    <div class="record-info">
                        <div class="record-date">${formatDate(trans.date)}</div>
                        <div class="record-title">${trans.category}</div>
                        ${trans.category === 'ค่าอาหาร' && trans.foodDays != null
                            ? `<div class="text-xs text-slate-400 mt-1">🍱 ${trans.foodDays} วัน × ${formatCurrency(trans.foodRate)}/วัน</div>`
                            : ''}
                        ${trans.category === 'ค่ากะกลางคืน' && trans.nightShiftDays != null
                            ? `<div class="text-xs text-slate-400 mt-1">🌙 ${trans.nightShiftDays} วัน × ${formatCurrency(trans.nightShiftRate)}/วัน</div>`
                            : ''}
                        ${trans.description ? `<div class="record-subtitle">${trans.description}</div>` : ''}
                        <div class="record-actions">
                            <button class="record-btn text-accent-cyan hover:text-white" onclick="editTransaction('${trans.id}')">แก้ไข</button>
                            <button class="record-btn delete" onclick="deleteTransaction('${trans.id}')">ลบ</button>
                        </div>
                    </div>
                    <div class="record-amount ${trans.type}">${trans.type === 'income' ? '+' : '-'}${formatCurrency(trans.amount)}</div>
                </div>
            `).join('');

            summary.innerHTML = `
                <div class="summary-row">
                    <span class="summary-label">จำนวนรายการ</span>
                    <span class="summary-value">${filtered.length} รายการ</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">รวม${filterType === 'income' ? 'รายรับ' : 'รายจ่าย'}</span>
                    <span class="summary-value large" style="color: var(--color-${filterType})">${formatCurrency(total)}</span>
                </div>
            `;
        } else {
            list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-text">ยังไม่มีข้อมูล</div></div>';
            summary.innerHTML = '';
        }
    } catch (error) {}
}

window.saveTransaction = async function(event) {
    event.preventDefault();
    const category = document.getElementById('transactionCategory').value;
    const dateValue = document.getElementById('transactionDate').value;
    const date = new Date(dateValue);

    let amount;
    let foodDays = null;
    let foodRate = null;
    let nightShiftDays = null;
    let nightShiftRate = null;

    if (category === 'ค่าอาหาร') {
        foodDays = parseFloat(document.getElementById('foodDays').value) || 0;
        foodRate = parseFloat(document.getElementById('foodRate').value) || 0;
        amount = foodDays * foodRate;
        if (foodDays <= 0 || foodRate <= 0) {
            showAlert('ข้อมูลไม่ครบ', 'กรุณากรอกจำนวนวันและราคาต่อวันให้ถูกต้อง', 'error');
            return;
        }
    } else if (category === 'ค่ากะกลางคืน') {
        nightShiftDays = parseFloat(document.getElementById('nightShiftDays').value) || 0;
        nightShiftRate = parseFloat(document.getElementById('nightShiftRate').value) || 0;
        amount = nightShiftDays * nightShiftRate;
        if (nightShiftDays <= 0 || nightShiftRate <= 0) {
            showAlert('ข้อมูลไม่ครบ', 'กรุณากรอกจำนวนวันและค่ากะต่อวันให้ถูกต้อง', 'error');
            return;
        }
    } else {
        amount = parseFloat(document.getElementById('transactionAmount').value);
    }

    const data = {
        type: document.getElementById('transactionType').value,
        date: date.toISOString(),
        category,
        amount,
        foodDays,
        foodRate,
        nightShiftDays,
        nightShiftRate,
        description: document.getElementById('transactionDescription').value,
        month: date.getMonth() + 1,
        year: date.getFullYear()
    };

    try {
        if (currentEditTransactionId) {
            await apiFetch(`/api/transactions/${currentEditTransactionId}`, { method: 'PUT', body: JSON.stringify(data) });
        } else {
            await apiFetch('/api/transactions', { method: 'POST', body: JSON.stringify(data) });
            
            // Save transaction prefs per category
            if (currentUser) {
                const prefs = JSON.parse(localStorage.getItem('txn_prefs_' + currentUser.id) || '{}');
                prefs[category] = { amount, foodDays, foodRate, nightShiftDays, nightShiftRate, description: data.description };
                localStorage.setItem('txn_prefs_' + currentUser.id, JSON.stringify(prefs));
            }
        }
        closeModal('transactionModal');
        if (currentTab === 'income' || currentTab === 'expense') {
            loadTransactions(currentTab);
        }
        loadDashboard();
    } catch (error) {
        showAlert('ผิดพลาด', 'บันทึกไม่สำเร็จ: ' + error.message, 'error');
    }
};

window.editTransaction = async function(id) {
    try {
        const transactions = await apiFetch(`/api/transactions${getDateRangeQuery()}`);
        const trans = transactions.find(t => t.id === id);
        if (trans) {
            currentEditTransactionId = id;
            document.getElementById('transactionType').value = trans.type;
            updateTransactionCategories();
            document.getElementById('transactionCategory').value = trans.category;
            onCategoryChange(); // show/hide food fields based on restored category

            const d = new Date(trans.date);
            const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            document.getElementById('transactionDate').value = dateStr;

            if (trans.category === 'ค่าอาหาร' && trans.foodDays != null) {
                document.getElementById('foodDays').value = trans.foodDays;
                document.getElementById('foodRate').value = trans.foodRate;
                calculateFoodAmount();
            } else if (trans.category === 'ค่ากะกลางคืน' && trans.nightShiftDays != null) {
                document.getElementById('nightShiftDays').value = trans.nightShiftDays;
                document.getElementById('nightShiftRate').value = trans.nightShiftRate;
                calculateNightShiftAmount();
            } else {
                document.getElementById('transactionAmount').value = trans.amount;
            }
            document.getElementById('transactionDescription').value = trans.description || '';

            const modalTitle = document.getElementById('transactionModal').querySelector('h3');
            if (modalTitle) modalTitle.textContent = trans.type === 'income' ? 'แก้ไขรายรับ' : 'แก้ไขรายจ่าย';
            document.getElementById('transactionModal').classList.add('active');
        }
    } catch (error) {
        showAlert('ผิดพลาด', 'ดึงข้อมูลไม่สำเร็จ: ' + error.message, 'error');
    }
};

window.deleteTransaction = function(id) {
    showConfirm('ยืนยันการลบ', 'ต้องการลบรายการนี้ใช่หรือไม่?', async () => {
        try {
            await apiFetch(`/api/transactions/${id}`, { method: 'DELETE' });
            if (currentTab === 'income' || currentTab === 'expense') {
                loadTransactions(currentTab);
            }
            loadDashboard();
        } catch (error) {
            showAlert('ผิดพลาด', 'ลบไม่สำเร็จ: ' + error.message, 'error');
        }
    });
};
