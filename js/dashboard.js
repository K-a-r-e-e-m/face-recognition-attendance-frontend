const API_BASE = 'http://localhost:3000';

// ─── State ────────────────────────────────────────────────
let allRecords   = [];   // all records that come from the API
let filteredRecs = [];   // filtered records based on search/status
let currentPage  = 1;
const PAGE_SIZE  = 6;
// let activeTab    = 'all'; // 'my' or 'all'
let currentUserId = null; // TODO: tie it to the logged-in user

// ─── On Page Load ──────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  setTodayDate();
  loadAttendance();
});

// ─── Set Today's Date ──────────────────────────────────────
function setTodayDate() {
  const dp = document.getElementById('datePicker');
  if (!dp) return;
  const today = new Date().toISOString().split('T')[0];
  dp.value = today;
}

// ─── Load Attendance from API ──────────────────────────────
async function loadAttendance() {
  showSkeletonStats();
  showSkeletonTable();

try {
    const [studentsRes, attendanceRes] = await Promise.all([
      fetch(`${API_BASE}/api/v1/students?limit=1000`),
      fetch(`${API_BASE}/api/v1/attendances`)
    ]);

    const studentsData = await studentsRes.json();
    const attendanceData = await attendanceRes.json();

    const students = studentsData.data || [];
    const attendances = attendanceData.data || [];
    const selectedDate = document.getElementById('datePicker')?.value;

    const presentMap = new Map();

    // 1. Process Attendance Records
    attendances.forEach(att => {
      const dateObj = new Date(att.createdAt);
      const recordDate = dateObj.toISOString().split('T')[0];

      if (recordDate === selectedDate) {
        const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Smart Data Extraction: Handle both Object and String formats for the student field
        let sId = "";
        let sEmail = "";
        let sNo = "";

        if (att.student && typeof att.student === 'object') {
          sId = att.student._id ? String(att.student._id) : "";
          sEmail = att.student.email ? att.student.email.toLowerCase() : "";
          sNo = att.student.studentNo ? String(att.student.studentNo) : "";
        } else if (typeof att.student === 'string') {
          sId = att.student; // Case where only ID is returned as a string
        }

        // Store time in the Map using multiple keys to ensure successful matching
        if (sId) presentMap.set(sId, timeStr);
        if (sEmail) presentMap.set(sEmail, timeStr);
        if (sNo) presentMap.set(sNo, timeStr);
        
        console.log(`Success Link: ID(${sId}) | Email(${sEmail})`);
      }
    });

    // 2. Merge Students with Attendance (Building the actual table data)
    allRecords = students.map(student => {
      const attTime = presentMap.get(String(student.studentNo)) || 
                      presentMap.get(student.email?.toLowerCase()) || 
                      presentMap.get(String(student._id));

      return {
        id: student._id,
        name: student.fullName || "Unknown",
        email: student.email || "No Email",
        time: attTime || "--:--",
        status: attTime ? "Present" : "Absent"
      };
    });

    // Sort records: Present students appear at the top
    allRecords.sort((a, b) => (a.status === "Present" ? -1 : 1));

    // 3. Update Dashboard Stats with real data
    renderStats({
      total: students.length,
      present: allRecords.filter(r => r.status === "Present").length,
      absent: allRecords.filter(r => r.status === "Absent").length,
      lastUpdated: attendances.length > 0 ? new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : "--:--"
    });

    applyTabFilter();

  } catch (err) {
    console.error("Dashboard error:", err);
    showToast("Could not load backend data", "error");

  // Fallback to Demo Data in case of API failure
    const demo = getDemoData();
    allRecords = demo.records;
    renderStats(demo);
    applyTabFilter();
  }
}

// ─── Render Stats Cards ────────────────────────────────────
function renderStats(data) {
  setText('statTotal',   data.total       || 0);
  setText('statPresent', data.present     || 0);
  setText('statAbsent',  data.absent      || 0);
  setText('statTime',    data.lastUpdated || '--:--');
}

function showSkeletonStats() {
  ['statTotal','statPresent','statAbsent','statTime'].forEach(id => {
    setText(id, '...');
  });
}

// ─── Tab Switch ────────────────────────────────────────────
// function switchTab(tab) {
//   activeTab = tab;
//   currentPage = 1;
//   document.getElementById('tabMy').classList.toggle('active', tab === 'my');
//   document.getElementById('tabAll').classList.toggle('active', tab === 'all');
//   applyTabFilter();
// }

function applyTabFilter() {
  // if (activeTab === 'my' && currentUserId)
  if (currentUserId) {
    filteredRecs = allRecords.filter(r => r.userId === currentUserId);
  } else {
    filteredRecs = [...allRecords];
  }
  filterTable(); // apply search + status filter on top
}

// ─── Filter Table ──────────────────────────────────────────
function filterTable() {
  const search = document.getElementById('searchInput')?.value.toLowerCase() || '';
  const status = document.getElementById('statusFilter')?.value || '';

  // let base = activeTab === 'my' && currentUserId
  let base = currentUserId
    ? allRecords.filter(r => r.userId === currentUserId)
    : [...allRecords];

  filteredRecs = base.filter(r => {
    const matchName   = r.name.toLowerCase().includes(search);
    const matchEmail  = r.email.toLowerCase().includes(search);
    const matchStatus = status ? r.status === status : true;
    return (matchName || matchEmail) && matchStatus;
  });

  currentPage = 1;
  renderTable();
}

// ─── Render Table ──────────────────────────────────────────
function renderTable() {
  const tbody = document.getElementById('tableBody');
  if (!tbody) return;

  const start = (currentPage - 1) * PAGE_SIZE;
  const end   = start + PAGE_SIZE;
  const page  = filteredRecs.slice(start, end);

  if (page.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text-muted);">
        No records found
      </td></tr>`;
    renderPagination();
    return;
  }

  tbody.innerHTML = page.map((r, i) => `
    <tr>
      <td>${start + i + 1}</td>
      <td>
        <span class="row-avatar">
          <img src="assets/icons/user1.png" alt="User">
        </span>
        <span class="row-name">${escHtml(r.name)}</span>
      </td>
      <td>${escHtml(r.email)}</td>
      <td>${escHtml(r.time)}</td>
      <td>
        <span class="badge badge-${r.status.toLowerCase()}">${escHtml(r.status)}</span>
      </td>
    </tr>
  `).join('');
      // <td>
      //   <button class="menu-btn" onclick="rowMenu(${r.id})" title="Options">⋮</button>
      // </td>
  renderPagination();
}

function showSkeletonTable() {
  const tbody = document.getElementById('tableBody');
  if (!tbody) return;
  tbody.innerHTML = Array(4).fill(`
    <tr>
      ${Array(6).fill('<td><span class="skeleton" style="height:14px;width:80%;display:block;"></span></td>').join('')}
    </tr>
  `).join('');
}

// ─── Pagination ────────────────────────────────────────────
function renderPagination() {
  const container = document.getElementById('pagination');
  if (!container) return;

  const total     = filteredRecs.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const start = (currentPage - 1) * PAGE_SIZE + 1;
  const end   = Math.min(currentPage * PAGE_SIZE, total);

  let btns = '';

  // Prev
  btns += `<button class="page-btn" onclick="goPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>‹</button>`;

  // Page numbers
  const pages = getPageNums(currentPage, totalPages);
  pages.forEach(p => {
    if (p === '...') {
      btns += `<button class="page-btn" disabled>…</button>`;
    } else {
      btns += `<button class="page-btn ${p === currentPage ? 'active' : ''}" onclick="goPage(${p})">${p}</button>`;
    }
  });

  // Next
  btns += `<button class="page-btn" onclick="goPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>›</button>`;

  container.innerHTML = `
    <span class="page-info">Showing ${total === 0 ? 0 : start} to ${end} of ${total} results</span>
    <div class="page-btns">${btns}</div>
  `;
}

function getPageNums(current, total) {
  if (total <= 5) return Array.from({length: total}, (_, i) => i + 1);
  const pages = [1];
  if (current > 3) pages.push('...');
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) pages.push(p);
  if (current < total - 2) pages.push('...');
  pages.push(total);
  return pages;
}

function goPage(p) {
  const totalPages = Math.ceil(filteredRecs.length / PAGE_SIZE);
  if (p < 1 || p > totalPages) return;
  currentPage = p;
  renderTable();
  document.querySelector('.table-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ─── Row Menu ──────────────────────────────────────────────
function rowMenu(id) {
  // TODO: Implement dropdown menu (view details, edit, delete)
  const record = allRecords.find(r => r.id === id);
  if (record) showToast(`Options for ${record.name}`);
}

// ─── Export ────────────────────────────────────────────────
async function exportExcel() {
  const date = document.getElementById('datePicker')?.value || '';
  showToast('Preparing Excel export...');

  try {
    // TODO: Need API endpoint to generate and return Excel file for the selected date
    const res = await fetch(`${API_BASE}/api/attendance/export/excel?date=${date}`);
    if (!res.ok) throw new Error();
    const blob = await res.blob();
    downloadBlob(blob, `attendance_${date}.xlsx`);
    showToast('Excel downloaded!', 'success');
  } catch {
    showToast('Export failed. Try again.', 'error');
  }
}

async function exportPDF() {
  const date = document.getElementById('datePicker')?.value || '';
  showToast('Preparing PDF export...');

  try {
    // TODO: Need API endpoint to generate and return PDF file for the selected date
    const res = await fetch(`${API_BASE}/api/attendance/export/pdf?date=${date}`);
    if (!res.ok) throw new Error();
    const blob = await res.blob();
    downloadBlob(blob, `attendance_${date}.pdf`);
    showToast('PDF downloaded!', 'success');
  } catch {
    showToast('Export failed. Try again.', 'error');
  }
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Demo Data (for testing without backend) ─────────────────
function getDemoData() {
  return {
    total: 45, present: 38, absent: 7, lastUpdated: '10:30 AM',
    records: [
      { id:1, userId:1, name:'Ahmed Mohamed', email:'ahmed@gmail.com', time:'09:15 AM', status:'Present' },
      { id:2, userId:2, name:'Sara Ali',      email:'sara@gmail.com',  time:'09:18 AM', status:'Present' },
      { id:3, userId:3, name:'Omar Hassan',   email:'omar@gmail.com',  time:'09:21 AM', status:'Present' },
      { id:4, userId:4, name:'Maya Khaled',   email:'maya@gmail.com',  time:'09:25 AM', status:'Present' },
      { id:5, userId:5, name:'Youssef Ahmed', email:'youssef@gmail.com',time:'09:27 AM',status:'Absent'  },
      { id:6, userId:6, name:'Nourhan Samy',  email:'nourhan@gmail.com',time:'09:30 AM',status:'Present' },
      { id:7, userId:7, name:'Karim Tarek',   email:'karim@gmail.com', time:'09:35 AM', status:'Present' },
      { id:8, userId:8, name:'Hana Mahmoud',  email:'hana@gmail.com',  time:'09:40 AM', status:'Absent'  },
    ]
  };
}

// ─── Utils ─────────────────────────────────────────────────
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function showToast(msg, type = '') {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.className   = type ? `show ${type}` : 'show';
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => { toast.className = ''; }, 3200);
}
