const API_BASE = 'http://localhost:3000';

// ─── State ────────────────────────────────────────────────
let stream = null;
let isScanning = false;

// ─── DOM References ────────────────────────────────────────
const video       = document.getElementById('videoFeed');
const canvas      = document.getElementById('snapCanvas');
const scanLine    = document.getElementById('scanLine');
const resultAvatar  = document.getElementById('resultAvatar');
const resultStatus  = document.getElementById('resultStatus');
const resultHint    = document.getElementById('resultHint');
const resultInfo    = document.getElementById('resultInfo');
const recognizeBtn  = document.getElementById('recognizeBtn');
const retryBtn      = document.getElementById('retryBtn');

// ─── On Page Load ──────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  startCamera();
  setTodayDate();
});

// ─── Start Camera ──────────────────────────────────────────
async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: 640, height: 480 }
    });
    video.srcObject = stream;
  } catch (err) {
    showToast('Camera access denied. Please allow camera.', 'error');
    console.error('Camera error:', err);
  }
}

// ─── Stop Camera ───────────────────────────────────────────
function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
    stream = null;
  }
}

// ─── Capture Frame as Base64 ───────────────────────────────
function captureFrame() {
  canvas.width  = video.videoWidth  || 640;
  canvas.height = video.videoHeight || 480;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.85); // base64 image
}

// ─── Start Recognition ─────────────────────────────────────
async function startRecognition() {
  if (isScanning) return;
  isScanning = true;

  // UI: scanning state
  recognizeBtn.disabled = true;
  recognizeBtn.innerHTML = '<span class="btn-icon"></span> Scanning...';

  scanLine.classList.add('active');
  resultStatus.textContent = 'Scanning...';
  resultHint.textContent = 'Please hold still';
  resultInfo.style.display = 'none';
  resultAvatar.className = 'result-avatar';

  try {
    // Covert current frame to Blob for upload because API expects multipart/form-data
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    const imageBlob = await new Promise(resolve => {
      canvas.toBlob(resolve, 'image/jpeg', 0.85);
    });

    if (!imageBlob) {
      throw new Error('Could not capture image');
    }

    // FormData for multipart upload
    const formData = new FormData();
    formData.append('student_image', imageBlob, 'attendance.jpg');

    // API call
    const response = await fetch(`${API_BASE}/api/v1/attendances`, {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Recognition failed');
    }

    if (result.data && result.data.length > 0) {
      const attendance = result.data[0];
      console.log('Attendance record:', attendance);
      handleRecognitionResult({
        found: true,
        name: attendance.student.fullName || "—",
        id: attendance.student.studentNo || "—",
        time: new Date(attendance.createdAt).toLocaleTimeString(),
        status: attendance.status || "Present"
      });
    } else {
      handleRecognitionResult({
        found: false,
        message: "Face not recognized"
      });
    }

  } catch (err) {
    console.error('Recognition error:', err);

    showNoFace(err.message || 'Recognition failed');
    showToast('Could not connect to server.', 'error');
  }
}

// ─── Handle Result ─────────────────────────────────────────
function handleRecognitionResult(data) {
  scanLine.classList.remove('active');
  isScanning = false;

  if (data.found) {
    // Face recognized
    resultAvatar.className = 'result-avatar found';
    resultStatus.textContent = '✔ Recognized Student';
    resultHint.textContent   = 'Attendance marked successfully';

    document.getElementById('rName').textContent   = data.name   || '—';
    document.getElementById('rId').textContent     = data.id     || '—';
    document.getElementById('rTime').textContent   = data.time   || '—';
    const badge = document.getElementById('rStatus');
    badge.textContent  = data.status || 'Present';
    badge.className    = 'badge badge-' + (data.status || 'present').toLowerCase();

    resultInfo.style.display = 'flex';
    recognizeBtn.style.display = 'none';
    retryBtn.style.display = 'block';
    showToast(`Welcome, ${data.name}!`, 'success');

  } else {
    // No face / Unknown
    showNoFace(data.message || 'Face not recognized');
  }
}

// ─── No Face Helper ────────────────────────────────────────
function showNoFace(msg = 'No face detected') {
  scanLine.classList.remove('active');
  isScanning = false;
  resultAvatar.className    = 'result-avatar notfound';
  resultStatus.textContent  = msg;
  resultHint.textContent    = 'Click Try Again to retry';
  resultInfo.style.display  = 'none';
  recognizeBtn.style.display = 'none';
  retryBtn.style.display = 'block';
}

// ─── Reset ─────────────────────────────────────────────────
function resetRecognition() {
  resultAvatar.className    = 'result-avatar';
  resultStatus.textContent  = 'No face detected';
  resultHint.textContent    = 'Click the button below to start recognition';
  resultInfo.style.display  = 'none';
  recognizeBtn.disabled = false;
  recognizeBtn.innerHTML = '<span class="btn-icon"></span> Start Recognition';
  recognizeBtn.style.display = 'block';
  retryBtn.style.display = 'none';
}

// ─── Go To Register ────────────────────────────────────────
function goToRegister() {
  window.location.href = 'register.html';
}

// ─── Utils ─────────────────────────────────────────────────
function setTodayDate() {
  const dp = document.getElementById('datePicker');
  if (dp) dp.valueAsDate = new Date();
}

// ─── Toast ─────────────────────────────────────────────────
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
