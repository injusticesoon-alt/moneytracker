// State Management
let transactions = [];
let targets = [];

// API Endpoint for Netlify Function
const API_URL = '/.netlify/functions/tabungan';

// Default Initial Data
const DEFAULT_TARGETS = [
  { id: 't1', name: 'Dana Darurat', goal_amount: 5000000 },
  { id: 't2', name: 'Beli Laptop', goal_amount: 12000000 },
  { id: 't3', name: 'Liburan Akhir Tahun', goal_amount: 3000000 }
];

const DEFAULT_TRANSACTIONS = [
  { id: 'tx1', type: 'setor', amount: 1500000, note: 'Gaji Bulanan awal Agustus', date: '2026-08-01', target: 'Dana Darurat' },
  { id: 'tx2', type: 'setor', amount: 1000000, note: 'Tabungan Laptop', date: '2026-08-02', target: 'Beli Laptop' },
  { id: 'tx3', type: 'tarik', amount: 200000, note: 'Keperluan mendesak', date: '2026-08-03', target: 'Dana Darurat' }
];

// DOM Elements
const totalSaldoEl = document.getElementById('total-saldo');
const totalSetorEl = document.getElementById('total-setor');
const totalTarikEl = document.getElementById('total-tarik');
const financialInsightEl = document.getElementById('financial-insight');
const quoteTextEl = document.getElementById('quote-text');

const transactionForm = document.getElementById('transaction-form');
const txAmountInput = document.getElementById('tx-amount');
const txTargetSelect = document.getElementById('tx-target');
const txNoteInput = document.getElementById('tx-note');
const txDateInput = document.getElementById('tx-date');

const targetForm = document.getElementById('target-form');
const targetNameInput = document.getElementById('target-name');
const targetAmountInput = document.getElementById('target-amount');

const targetListContainer = document.getElementById('target-list-container');
const targetCountBadge = document.getElementById('target-count-badge');
const transactionRows = document.getElementById('transaction-rows');

const searchTxInput = document.getElementById('search-tx');
const filterTargetSelect = document.getElementById('filter-target');
const themeToggleBtn = document.getElementById('theme-toggle');
const resetAppBtn = document.getElementById('reset-app-btn');

// Initialize App
window.addEventListener('DOMContentLoaded', () => {
  // Set default date to today
  const today = new Date().toISOString().split('T')[0];
  txDateInput.value = today;

  // Load Theme
  loadTheme();

  // Load Data
  loadData();

  // Populate Targets Dropdowns
  updateTargetsDropdowns();

  // Perform initial calculation and rendering
  calculateAndRender();

  // Event Listeners
  transactionForm.addEventListener('submit', handleAddTransaction);
  targetForm.addEventListener('submit', handleAddTarget);
  searchTxInput.addEventListener('input', renderTransactionsTable);
  filterTargetSelect.addEventListener('change', renderTransactionsTable);
  themeToggleBtn.addEventListener('click', toggleTheme);
  resetAppBtn.addEventListener('click', confirmReset);

  // Fetch server config (GET method) to load default quotes if available
  fetchServerConfig();
});

// Load Theme from LocalStorage
function loadTheme() {
  const savedTheme = localStorage.getItem('theme') || 'theme-light';
  document.body.className = savedTheme;
}

// Toggle Dark/Light Theme
function toggleTheme() {
  if (document.body.classList.contains('theme-light')) {
    document.body.className = 'theme-dark';
    localStorage.setItem('theme', 'theme-dark');
  } else {
    document.body.className = 'theme-light';
    localStorage.setItem('theme', 'theme-light');
  }
}

// Load Data from LocalStorage (or set default if empty)
function loadData() {
  const savedTransactions = localStorage.getItem('transactions');
  const savedTargets = localStorage.getItem('targets');

  if (savedTransactions) {
    transactions = JSON.parse(savedTransactions);
  } else {
    transactions = [...DEFAULT_TRANSACTIONS];
    localStorage.setItem('transactions', JSON.stringify(transactions));
  }

  if (savedTargets) {
    targets = JSON.parse(savedTargets);
  } else {
    targets = [...DEFAULT_TARGETS];
    localStorage.setItem('targets', JSON.stringify(targets));
  }
}

// Fetch Initial Config from Netlify Function (GET)
async function fetchServerConfig() {
  try {
    const response = await fetch(API_URL);
    if (response.ok) {
      const result = await response.json();
      if (result.status === 'success' && result.quotes) {
        // Pick random quote from server
        const randomQuote = result.quotes[Math.floor(Math.random() * result.quotes.length)];
        quoteTextEl.textContent = `"${randomQuote}"`;
      }
    }
  } catch (error) {
    console.log("Tidak dapat memuat kutipan dari backend Netlify, menggunakan kutipan bawaan.");
  }
}

// Helper to Format Currency to Rupiah (IDR)
function formatRupiah(number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(number);
}

// Update Targets in form select lists
function updateTargetsDropdowns() {
  // Clear options except first/default
  txTargetSelect.innerHTML = '<option value="Lainnya">Lainnya / Umum</option>';
  filterTargetSelect.innerHTML = '<option value="all">Semua Target</option><option value="Lainnya">Lainnya / Umum</option>';

  targets.forEach(t => {
    // Add to transaction target select
    const optionTx = document.createElement('option');
    optionTx.value = t.name;
    optionTx.textContent = t.name;
    txTargetSelect.appendChild(optionTx);

    // Add to filter target select
    const optionFilter = document.createElement('option');
    optionFilter.value = t.name;
    optionFilter.textContent = t.name;
    filterTargetSelect.appendChild(optionFilter);
  });
}

// Main logic: Calculate financial stats and Render UI
async function calculateAndRender() {
  showLoadingState();

  try {
    // Attempt backend serverless call
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ transactions, targets })
    });

    if (!response.ok) {
      throw new Error('Respons backend tidak valid');
    }

    const result = await response.json();
    if (result.status === 'success') {
      renderDashboard(result.data);
    } else {
      throw new Error(result.message || 'Gagal menghitung di backend');
    }

  } catch (error) {
    console.warn("Menggunakan kalkulasi lokal (Backend Netlify Functions belum aktif):", error.message);
    calculateAndRenderLocally();
  }
}

// Render Dashboard based on API/Backend Response
function renderDashboard(data) {
  // Render Summary Stats
  totalSaldoEl.textContent = formatRupiah(data.summary.total_saldo);
  totalSetorEl.textContent = formatRupiah(data.summary.total_setor);
  totalTarikEl.textContent = formatRupiah(data.summary.total_tarik);
  
  // Set glow effect for negative/positive balance
  if (data.summary.total_saldo < 0) {
    totalSaldoEl.classList.add('tx-tarik');
    totalSaldoEl.classList.remove('text-glowing');
  } else {
    totalSaldoEl.classList.remove('tx-tarik');
    totalSaldoEl.classList.add('text-glowing');
  }

  financialInsightEl.textContent = data.financial_insight;

  if (data.motivation_quote) {
    quoteTextEl.textContent = `"${data.motivation_quote}"`;
  }

  // Render Target Lists
  renderTargetsProgress(data.targets_progress);
  
  // Render Transaction Table
  renderTransactionsTable();
}

// Local Fallback Calculation Engine
function calculateAndRenderLocally() {
  let totalSetor = 0;
  let totalTarik = 0;
  
  // Accumulate goals mapping
  const targetAccumulations = {};
  targets.forEach(t => {
    targetAccumulations[t.name] = 0;
  });

  transactions.forEach(tx => {
    const amount = parseFloat(tx.amount);
    if (tx.type === 'setor') {
      totalSetor += amount;
      if (targetAccumulations.hasOwnProperty(tx.target)) {
        targetAccumulations[tx.target] += amount;
      } else {
        targetAccumulations[tx.target] = amount;
      }
    } else if (tx.type === 'tarik') {
      totalTarik += amount;
      if (targetAccumulations.hasOwnProperty(tx.target)) {
        targetAccumulations[tx.target] -= amount;
      } else {
        targetAccumulations[tx.target] = -amount;
      }
    }
  });

  const totalSaldo = totalSetor - totalTarik;

  // Build target progress structure
  const targetsProgress = targets.map(t => {
    const current = Math.max(0, targetAccumulations[t.name] || 0);
    const progressPercent = t.goal_amount > 0 ? Math.min(100, Math.round((current / t.goal_amount) * 100 * 100) / 100) : 0;
    
    // Estimate days
    let daysRemaining = null;
    if (t.goal_amount > current && totalSetor > 0) {
      // Calculate daily savings average
      let daysDiff = 30; // default baseline
      if (transactions.length > 0) {
        const dates = transactions.map(tx => new Date(tx.date));
        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));
        const diffTime = Math.abs(maxDate - minDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 0) daysDiff = diffDays;
      }
      const avgSavingPerDay = totalSetor / daysDiff;
      if (avgSavingPerDay > 0) {
        daysRemaining = Math.ceil((t.goal_amount - current) / avgSavingPerDay);
      }
    }

    let status_message = '';
    if (progressPercent >= 100) {
      status_message = `Target '${t.name}' telah tercapai! 🎉`;
    } else if (progressPercent >= 50) {
      status_message = `${progressPercent}% terkumpul. Setengah jalan lagi!`;
    } else {
      status_message = `Terkumpul ${progressPercent}%. Terus menabung!`;
    }

    return {
      name: t.name,
      goal_amount: t.goal_amount,
      current_amount: current,
      progress_percent: progressPercent,
      days_remaining: daysRemaining,
      status_message: status_message
    };
  });

  let localInsight = "Kalkulasi Lokal (Offline Mode). ";
  if (totalSaldo < 0) {
    localInsight += "Bahaya: Pengeluaran tabungan Anda melampaui setoran!";
  } else if (totalSaldo === 0) {
    localInsight += "Tabungan Anda kosong. Silakan catat transaksi setor pertama Anda.";
  } else {
    localInsight += "Kondisi keuangan sehat. Tetap jaga kedisiplinan keuangan Anda!";
  }

  renderDashboard({
    summary: {
      total_saldo: totalSaldo,
      total_setor: totalSetor,
      total_tarik: totalTarik,
      transaction_count: transactions.length
    },
    targets_progress: targetsProgress,
    financial_insight: localInsight,
    motivation_quote: "Hemat pangkal kaya. Mulai tabungan hari ini untuk masa depan cerah."
  });
}

// Show local spinner or text while backend is loading
function showLoadingState() {
  financialInsightEl.innerHTML = '<span class="loading-dots">Memproses analisis keuangan...</span>';
}

// Render Targets list with progress bar
function renderTargetsProgress(targetsData) {
  targetCountBadge.textContent = `${targetsData.length} Target`;
  
  if (targetsData.length === 0) {
    targetListContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🎯</div>
        <p>Belum ada target finansial yang dibuat. Silakan tambahkan target pertama Anda di panel sebelah kiri.</p>
      </div>
    `;
    return;
  }

  targetListContainer.innerHTML = '';
  targetsData.forEach(t => {
    const targetItem = document.createElement('article');
    targetItem.className = 'target-item';

    const daysText = t.days_remaining !== null && t.days_remaining !== undefined
      ? `Est. ${t.days_remaining} hari lagi` 
      : 'Belum terproyeksi';

    targetItem.innerHTML = `
      <div class="target-meta">
        <div>
          <h3 class="target-title">${t.name}</h3>
        </div>
        <div class="target-values">
          <span class="target-current">${formatRupiah(t.current_amount)}</span>
          <span class="target-goal">dari ${formatRupiah(t.goal_amount)}</span>
        </div>
      </div>
      <div class="progress-container" aria-label="Progress Tabungan ${t.name}">
        <div class="progress-bar" style="width: ${t.progress_percent}%"></div>
      </div>
      <div class="target-footer">
        <span class="target-status">${t.status_message}</span>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="target-days">${daysText}</span>
          <button class="btn-delete-target" data-name="${t.name}" aria-label="Hapus target ${t.name}">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
          </button>
        </div>
      </div>
    `;

    targetListContainer.appendChild(targetItem);
  });

  // Bind delete event listeners for targets
  const deleteTargetButtons = targetListContainer.querySelectorAll('.btn-delete-target');
  deleteTargetButtons.forEach(btn => {
    btn.addEventListener('click', handleDeleteTarget);
  });
}

// Render Transactions Table with Filter & Search
function renderTransactionsTable() {
  const searchQuery = searchTxInput.value.toLowerCase().trim();
  const filterTarget = filterTargetSelect.value;

  // Filter transactions
  const filteredTransactions = transactions.filter(tx => {
    // Filter by target category
    const matchesTarget = filterTarget === 'all' || tx.target === filterTarget;
    
    // Filter by search query (checks description, amount, or date)
    const matchesSearch = tx.note.toLowerCase().includes(searchQuery) ||
                          tx.amount.toString().includes(searchQuery) ||
                          tx.date.includes(searchQuery) ||
                          tx.target.toLowerCase().includes(searchQuery);

    return matchesTarget && matchesSearch;
  });

  // Render rows
  if (filteredTransactions.length === 0) {
    transactionRows.innerHTML = `
      <tr>
        <td colspan="6" class="table-empty">
          <div class="empty-state">
            <div class="empty-icon">🔎</div>
            <p>Tidak ada riwayat transaksi yang cocok dengan kriteria pencarian.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  // Sort transactions by date (newest first)
  filteredTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

  transactionRows.innerHTML = '';
  filteredTransactions.forEach(tx => {
    const tr = document.createElement('tr');
    
    // Formatting date
    const formattedDate = formatDateIndo(tx.date);

    // Styling logic for positive/negative transaction amount
    const isSetor = tx.type === 'setor';
    const txSign = isSetor ? '+' : '-';
    const txClass = isSetor ? 'tx-setor' : 'tx-tarik';

    tr.innerHTML = `
      <td>${formattedDate}</td>
      <td>
        <span style="display: inline-flex; align-items: center; gap: 8px;">
          <span style="color: ${isSetor ? 'var(--color-success)' : 'var(--color-danger)'}">
            ${isSetor ? 'Setor' : 'Tarik'}
          </span>
        </span>
      </td>
      <td><strong>${escapeHtml(tx.note)}</strong></td>
      <td><span class="badge-target">${escapeHtml(tx.target)}</span></td>
      <td class="text-right tx-amount-col ${txClass}">${txSign} ${formatRupiah(tx.amount)}</td>
      <td class="text-center">
        <button class="btn-delete-tx" data-id="${tx.id}" aria-label="Hapus Transaksi">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
        </button>
      </td>
    `;

    transactionRows.appendChild(tr);
  });

  // Bind delete event listeners for transactions
  const deleteTxButtons = transactionRows.querySelectorAll('.btn-delete-tx');
  deleteTxButtons.forEach(btn => {
    btn.addEventListener('click', handleDeleteTransaction);
  });
}

// Add Transaction Form Handler
function handleAddTransaction(e) {
  e.preventDefault();

  const type = document.querySelector('input[name="tx-type"]:checked').value;
  const amount = parseFloat(txAmountInput.value);
  const target = txTargetSelect.value;
  const note = txNoteInput.value.trim();
  const date = txDateInput.value;

  if (isNaN(amount) || amount <= 0) {
    alert("Jumlah nominal tidak boleh kosong atau negatif!");
    return;
  }

  // Create new transaction object
  const newTx = {
    id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    type,
    amount,
    note,
    date,
    target
  };

  // Push, Save, and Calculate
  transactions.push(newTx);
  saveTransactions();
  calculateAndRender();

  // Reset form inputs (preserve date as today)
  txAmountInput.value = '';
  txNoteInput.value = '';
  txDateInput.value = new Date().toISOString().split('T')[0];
  
  // Quick micro-interaction animation
  triggerFormSuccess(transactionForm);
}

// Add Target Form Handler
function handleAddTarget(e) {
  e.preventDefault();

  const name = targetNameInput.value.trim();
  const goal_amount = parseFloat(targetAmountInput.value);

  if (!name) return;
  if (isNaN(goal_amount) || goal_amount <= 0) {
    alert("Jumlah target tidak boleh kosong atau negatif!");
    return;
  }

  // Check if target name already exists
  const isDuplicate = targets.some(t => t.name.toLowerCase() === name.toLowerCase());
  if (isDuplicate) {
    alert("Target tabungan dengan nama ini sudah ada! Silakan pilih nama lain.");
    return;
  }

  // Create new target object
  const newTarget = {
    id: 't_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    name,
    goal_amount
  };

  // Push, Save, Dropdowns, and Calculate
  targets.push(newTarget);
  saveTargets();
  updateTargetsDropdowns();
  calculateAndRender();

  // Reset inputs
  targetNameInput.value = '';
  targetAmountInput.value = '';

  // Quick animation success
  triggerFormSuccess(targetForm);
}

// Delete Transaction
function handleDeleteTransaction(e) {
  const btn = e.currentTarget;
  const txId = btn.getAttribute('data-id');
  
  if (confirm("Apakah Anda yakin ingin menghapus catatan transaksi ini?")) {
    transactions = transactions.filter(tx => tx.id !== txId);
    saveTransactions();
    calculateAndRender();
  }
}

// Delete Target
function handleDeleteTarget(e) {
  const btn = e.currentTarget;
  const targetName = btn.getAttribute('data-name');
  
  if (confirm(`Apakah Anda yakin ingin menghapus target '${targetName}'? Catatan transaksi yang mengarah ke target ini akan dikelompokkan ke kategori 'Lainnya'.`)) {
    // Filter target out
    targets = targets.filter(t => t.name !== targetName);
    
    // Update transactions linked to this target to "Lainnya"
    transactions = transactions.map(tx => {
      if (tx.target === targetName) {
        return { ...tx, target: 'Lainnya' };
      }
      return tx;
    });

    saveTargets();
    saveTransactions();
    updateTargetsDropdowns();
    calculateAndRender();
  }
}

// Save functions to LocalStorage
function saveTransactions() {
  localStorage.setItem('transactions', JSON.stringify(transactions));
}

function saveTargets() {
  localStorage.setItem('targets', JSON.stringify(targets));
}

// Reset confirmation and actions
function confirmReset() {
  if (confirm("🚨 Peringatan: Tindakan ini akan menghapus semua riwayat transaksi dan target tabungan Anda secara permanen. Apakah Anda ingin melanjutkan?")) {
    localStorage.removeItem('transactions');
    localStorage.removeItem('targets');
    
    // Reload state and DOM
    loadData();
    updateTargetsDropdowns();
    calculateAndRender();
    
    alert("Data berhasil direset ke pengaturan awal.");
  }
}

// Helper: Format Date string to Indonesia standard
function formatDateIndo(dateStr) {
  try {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString('id-ID', options);
  } catch (error) {
    return dateStr;
  }
}

// Helper: Escape HTML strings to prevent XSS
function escapeHtml(unsafeStr) {
  return unsafeStr
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Form success visual cue micro-interaction
function triggerFormSuccess(formElement) {
  formElement.style.transform = 'scale(0.99)';
  setTimeout(() => {
    formElement.style.transform = 'none';
  }, 100);
}
