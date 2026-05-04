/* 3-step registration flow */

const API_BASE = 'http://localhost:3000';

// ─── State ────────────────────────────────────────────────
let stream       = null;
let capturedB64  = null;   // base64 of captured photo

// ─── Panels & step indicators ─────────────────────────────
const panels = ['panelStep1','panelStep2','panelStep3','panelSuccess'];
const stepInds = ['step1Ind','step2Ind','step3Ind'];

function showPanel(id) {
  panels.forEach(p => {
    const el = document.getElementById(p);
    if (el) el.style.display = (p === id) ? 'block' : 'none';
  });
}

function setStep(n) {                       // n = 1-based
  stepInds.forEach((id, i) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('active','done');
    if (i + 1 === n) el.classList.add('active');
    if (i + 1  <  n) el.classList.add('done');
  });
}

// ─── Step 1 → 2  (validate form first) ────────────────────
function goStep2() {
  if (!capturedB64) { showToast('Please capture a photo first.','error'); return; }
  stopRegCamera();
  setStep(2);
  showPanel('panelStep2');
}

// ─── Step 2 → 1 ────────────────────────────────────────────
function goStep1() {
  stopRegCamera();
  setStep(1);
  showPanel('panelStep1');
}

// ─── Step 2 → 3  (must have photo) ─────────────────────────
function goStep3() {
  if (!validateStep1()) return;
  
    // Fill confirm screen
  document.getElementById('cName').textContent      = val('inputName');
  document.getElementById('cStudentId').textContent = val('inputStudentId');
  document.getElementById('cEmail').textContent     = val('inputEmail');
  document.getElementById('cPhone').textContent     = val('inputPhone')    || '—';
  document.getElementById('cDept').textContent      = val('inputDept')     || '—';
  document.getElementById('cDate').textContent      = new Date().toLocaleDateString('en-GB',
    {day:'2-digit', month:'short', year:'numeric'});
  document.getElementById('confirmPhoto').src        = capturedB64;

  setStep(3);
  showPanel('panelStep3');
}

// ─── Validate Step 1 ───────────────────────────────────────
function validateStep1() {
  let ok = true;

  const rules = [
    { id:'inputName',      err:'errName',      msg:'Full name is required.' },
    { id:'inputStudentId', err:'errStudentId',  msg:'Student ID is required.' },
    { id:'inputEmail',     err:'errEmail',      msg:'Email is required.',
      extra: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Enter a valid email.' },
    { id:'inputPhone',     err:'errPhone',      msg:'Phone number is required.' },
    { id:'inputDept',      err:'errDept',       msg:'Department is required.' }
  ];

  rules.forEach(r => {
    const input  = document.getElementById(r.id);
    const errEl  = document.getElementById(r.err);
    const v      = input?.value.trim() || '';

    if (!v) {
      setFieldError(input, errEl, r.msg);
      ok = false;
    } else if (r.extra) {
      const res = r.extra(v);
      if (res !== true) { setFieldError(input, errEl, res); ok = false; }
      else               clearFieldError(input, errEl);
    } else {
      clearFieldError(input, errEl);
    }
  });

  return ok;
}

function setFieldError(input, errEl, msg) {
  if (input)  input.classList.add('error');
  if (errEl)  errEl.textContent = msg;
}
function clearFieldError(input, errEl) {
  if (input)  input.classList.remove('error');
  if (errEl)  errEl.textContent = '';
}

// Clear error on type and hide error on focusout
['inputName','inputStudentId','inputEmail','inputPhone','inputDept'].forEach(id => {
  document.getElementById(id)?.addEventListener('input', function() {
    this.classList.remove('error');
    const errId = { inputName:'errName', inputStudentId:'errStudentId', inputEmail:'errEmail', inputPhone:'errPhone', inputDept:'errDept' }[id];
    const errEl = document.getElementById(errId);
    if (errEl) errEl.textContent = '';
  });
});

// ─── Camera ────────────────────────────────────────────────
async function startRegCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:'user', width:640, height:480 } });
    const vid = document.getElementById('regVideo');
    if (vid) vid.srcObject = stream;
  } catch(e) {
    showToast('Camera access denied.','error');
  }
}
function stopRegCamera() {
  stream?.getTracks().forEach(t => t.stop());
  stream = null;
}

// ─── Capture Photo ─────────────────────────────────────────
function capturePhoto() {
  const vid = document.getElementById('regVideo');
  const canvas = document.getElementById('regCanvas');
  if (!vid || !canvas) return;

  canvas.width  = vid.videoWidth  || 640;
  canvas.height = vid.videoHeight || 480;
  canvas.getContext('2d').drawImage(vid, 0, 0);
  capturedB64 = canvas.toDataURL('image/jpeg', 0.85);

  // Show preview
  const preview = document.getElementById('photoPreview');
  preview.innerHTML = `<img src="${capturedB64}" alt="captured"/>`;

  // Swap buttons
  document.getElementById('captureBtn').style.display = 'none';
  document.getElementById('retakeBtn').style.display  = 'block';

  // Start scan animation for fun
  const sl = document.getElementById('regScanLine');
  if (sl) { sl.classList.add('active'); setTimeout(() => sl.classList.remove('active'), 1800); }

  showToast('Photo captured! Click "Next: Confirm" to continue.','success');

  // Replace capture btn with Next btn
  const actions = document.querySelector('#panelStep2 .camera-actions');
  if (actions && !document.getElementById('nextToConfirmBtn')) {
    const nxt = document.createElement('button');
    nxt.id        = 'nextToConfirmBtn';
    nxt.className = 'btn btn-primary';
    nxt.innerHTML = 'Next: Confirm →';
    nxt.onclick   = goStep3;
    actions.appendChild(nxt);
  }
}

function retakePhoto() {
  capturedB64 = null;
  document.getElementById('photoPreview').innerHTML =
    `<span class="preview-placeholder">📷<br/>No photo yet</span>`;
  document.getElementById('captureBtn').style.display = 'block';
  document.getElementById('retakeBtn').style.display  = 'none';
  const nxt = document.getElementById('nextToConfirmBtn');
  if (nxt) nxt.remove();
  if (!stream) startRegCamera();
}

// ─── Submit Registration ───────────────────────────────────
async function submitRegistration() {
  const btn = document.getElementById('submitBtn');

  btn.disabled = true;
  btn.innerHTML = '<span class="btn-icon">◌</span> Registering...';

  try {
    /* STEP 1 — Upload Image → get upload_token */
    if (!capturedB64) {
      throw new Error("Please capture a photo first.");
    }

    // Convert base64 → File
    const file = dataURLtoFile(capturedB64, "student.jpg");

    const formData = new FormData();
    formData.append("student_image", file);

    const uploadRes = await fetch(`${API_BASE}/api/v1/images/upload`, {
      method: "POST",
      body: formData
    });

    const uploadData = await uploadRes.json();

    if (!uploadRes.ok || !uploadData.success) {
      throw new Error(uploadData.error || "Image upload failed");
    }

    const uploadToken = uploadData.data.upload_token;

    /* STEP 2 — Create Student using upload_token */
    const payload = {
      fullName: val("inputName"),
      studentNo: val("inputStudentId"),
      department: val("inputDept"),
      email: val("inputEmail"),
      phone: val("inputPhone"),
      upload_token: uploadToken
    };

    const studentRes = await fetch(`${API_BASE}/api/v1/students`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const studentData = await studentRes.json();

    if (!studentRes.ok || !studentData.success) {
      throw new Error(studentData.error || "Student registration failed");
    }

    /* SUCCESS */
    showToast("Student registered successfully!", "success");

    showSuccess(
      {
        name: payload.fullName,
        studentId: payload.studentNo
      },
      payload.studentNo
    );

  } catch (e) {
    console.error(e);

    showToast(e.message || "Registration failed", "error");

    btn.disabled = false;
    btn.innerHTML = '<span class="btn-icon">✔</span> Register Now';
  }
}

function showSuccess(payload, generatedId) {
  setStep(3); // keep step 3 highlighted (all done)
  document.getElementById('successDetail').innerHTML = `
    <div><span>Name &nbsp;</span><strong>${esc(payload.name)}</strong></div>
    <div><span>Student ID &nbsp;</span><strong>${esc(payload.studentId)}</strong></div>
    <div><span>System ID &nbsp;</span><strong>#${generatedId || '—'}</strong></div>
  `;
  showPanel('panelSuccess');
}

function registerAnother() {
  // reset everything
  ['inputName','inputStudentId','inputEmail','inputPhone'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('inputDept').value = '';
  capturedB64 = null;
  document.getElementById('photoPreview').innerHTML =
    `<span class="preview-placeholder">📷<br/>No photo yet</span>`;
  const nxt = document.getElementById('nextToConfirmBtn');
  if (nxt) nxt.remove();
  setStep(2);
  showPanel('panelStep2');
}

// ─── Utils ─────────────────────────────────────────────────
function dataURLtoFile(dataurl, filename) {
  const arr = dataurl.split(",");
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);

  let n = bstr.length;
  const u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  return new File([u8arr], filename, { type: mime });
}

function val(id) { return document.getElementById(id)?.value.trim() || ''; }
function esc(s)  { return String(s).replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function showToast(msg, type='') {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id='toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.className   = type ? `show ${type}` : 'show';
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => t.className='', 3500);
}

// ─── Init ──────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  showPanel('panelStep1');
  setStep(1);
  startRegCamera();
});
