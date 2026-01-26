/* ================== GLOBAL SETTINGS ================== */
let students = {}
let answers = {}

// *** URL ของ Google Apps Script ***
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbypocB-XC7vjRAd75cw_p2lC7KJQdwXpjou7mPjVZ3OVZngrYMnIqtuqwbh8vo8FWmR/exec"; 

const correctAnswers = {
  1: "ก", 2: "ข", 3: "ก", 4: "ค", 5: "ง", 6: "ก", 7: "ก", 8: "ค", 9: "ก", 10: "ก",
  11: "ข", 12: "ข", 13: "ง", 14: "ก", 15: "ข", 16: "ก", 17: "ง", 18: "ก", 19: "ง", 20: "ข",
  21: "ข", 22: "ข", 23: "ง", 24: "ค", 25: "ก", 26: "ค", 27: "ข", 28: "ข", 29: "ง", 30: "ค",
  31: "ข", 32: "ค", 33: "ง", 34: "ก", 35: "ข", 36: "ค", 37: "ก", 38: "ค", 39: "ข", 40: "ก",
  41: "ง", 42: "ข", 43: "ข", 44: "ก", 45: "ง", 46: "ก", 47: "ข", 48: "ข", 49: "ง", 50: "ค"
}

const TOTAL_QUESTIONS = 50 
const PASS_SCORE = 25      
let timeLeft = 60 * 60     
let timerInterval

const EXAM_START_TIME = new Date(2026, 0, 26, 19, 45, 0);

/* ================== CUSTOM POPUP SYSTEM ================== */
function showModal(title, message, icon = '⚠️', callback = null) {
  let modal = document.getElementById('customModal');
  if (!modal) {
    const modalHTML = `
      <div id="customModal" class="modal-overlay">
        <div class="modal-content">
          <div class="modal-icon" id="modalIcon"></div>
          <h2 id="modalTitle" style="margin:0 0 10px 0;"></h2>
          <p id="modalMsg" style="margin-bottom:25px; line-height:1.6;"></p>
          <button class="btn-login" id="modalBtn">ตกลง</button>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    modal = document.getElementById('customModal');
  }
  document.getElementById('modalTitle').innerText = title;
  document.getElementById('modalMsg').innerText = message;
  document.getElementById('modalIcon').innerText = icon;
  modal.classList.add('active');
  document.getElementById('modalBtn').onclick = () => {
    modal.classList.remove('active');
    if (callback) callback();
  };
}

/* ================== DATABASE SENDING ================== */
function sendDataToSheet(score, total, status) {
    const studentId = localStorage.getItem("sid");
    const studentName = localStorage.getItem("sname");
    const userAnswers = JSON.parse(localStorage.getItem("userAnswers") || "{}");

    const payload = {
        studentId: studentId,
        studentName: studentName,
        score: score,
        total: total,
        status: status,
        answers: userAnswers
    };

    fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    })
    .then(() => console.log("ส่งข้อมูลสำเร็จ"))
    .catch(err => console.error("เกิดข้อผิดพลาด:", err));
}

/* ================== LOAD STUDENTS ================== */
if (document.getElementById("sid") || location.pathname.includes("exam.html")) {
  fetch("students.json")
    .then(res => res.json())
    .then(data => students = data)
    .catch(err => console.log("รอโหลดไฟล์นักศึกษา..."))
}

/* ================== LOGIN PAGE ================== */
function checkStudent(){
  const id = document.getElementById("sid").value.trim()
  if(!students[id]) return showModal("ไม่พบข้อมูล", "ไม่พบข้อมูลนักศึกษานี้ในระบบ", "❌");

  localStorage.clear(); 
  localStorage.setItem("sid", id)
  localStorage.setItem("sname", students[id])
  
  // บังคับเต็มจอก่อนเข้าหน้าสอบ
  const elem = document.documentElement;
  if (elem.requestFullscreen) {
    elem.requestFullscreen().then(() => location.href = "exam.html");
  } else {
    location.href = "exam.html";
  }
}

/* ================== EXAM PAGE ================== */
if(location.pathname.includes("exam.html")){
  const sname = localStorage.getItem("sname")
  if(!sname) {
      location.href = "index.html";
  } else {
      document.getElementById("studentName").innerText = "ผู้รับการทดสอบ : " + sname
      initSecurity()
      checkExamTimeStatus() 
  }
}

function checkExamTimeStatus() {
  const examContainer = document.getElementById("examContainer");
  const timerLoop = setInterval(() => {
    const now = new Date();
    if (now < EXAM_START_TIME) {
      if(examContainer) examContainer.style.display = "none";
      if (!document.getElementById("waitMessage")) {
        const waitHTML = `
          <div id="waitMessage" style="text-align:center; margin-top:100px; padding:40px;">
            <div style="font-size: 5rem; margin-bottom: 20px;">⏳</div>
            <h2 style="color:#f39c12; font-size: 2rem;">ยังไม่ถึงเวลาเริ่มการทดสอบ</h2>
            <div id="countdownDisplay" style="font-weight:bold; font-size:2.5rem; color:#2c3e50; margin-top:20px;"></div>
          </div>`;
        document.body.insertAdjacentHTML('beforeend', waitHTML);
      }
      const diff = EXAM_START_TIME - now;
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      const countdown = document.getElementById("countdownDisplay");
      if(countdown) countdown.innerText = `เริ่มสอบในอีก ${mins} นาที ${secs} วินาที`;
    } else {
      clearInterval(timerLoop);
      const wm = document.getElementById("waitMessage");
      if(wm) wm.remove();
      if(examContainer) {
        examContainer.style.display = "flex";
        startTimer();
      }
    }
  }, 1000);
}

/* ================== TIMER ================== */
function startTimer(){
  updateTimer()
  timerInterval = setInterval(()=>{
    timeLeft--
    updateTimer()
    if(timeLeft <= 0){
      clearInterval(timerInterval)
      submitExam(true)
    }
  },1000)
}

function updateTimer(){
  let m = Math.floor(timeLeft/60)
  let s = timeLeft % 60
  const t = document.getElementById("timer")
  if(t) {
    t.innerText = `${m}:${s.toString().padStart(2,"0")}`
    if(timeLeft <= 300) t.style.color = "#ff4444";
  }
}

/* ================== ANSWER ================== */
function mark(q, a, btn){
  answers[q] = a
  const parent = btn.parentElement;
  parent.querySelectorAll("button").forEach(b => b.classList.remove("active"))
  btn.classList.add("active")
}

/* ================== SUBMIT ================== */
function submitExam(auto){
  if(!auto && Object.keys(answers).length < TOTAL_QUESTIONS){
    return showModal("ทำข้อสอบยังไม่ครบ!", `กรุณาทำให้ครบทั้ง ${TOTAL_QUESTIONS} ข้อ`, "📝");
  }
  window.onbeforeunload = null
  localStorage.setItem("userAnswers", JSON.stringify(answers))
  location.href = "processing.html"
}

function submitExam(auto){
  // 1. ถ้าไม่ได้ทำครบทุกข้อ และไม่ใช่การส่งแบบ Auto (หมดเวลา/ทุจริต) ให้เตือนก่อน
  if(!auto && Object.keys(answers).length < TOTAL_QUESTIONS){
    return showModal("ทำข้อสอบยังไม่ครบ!", `กรุณาทำให้ครบทั้ง ${TOTAL_QUESTIONS} ข้อ`, "📝");
  }

  // 2. ถ้าเป็นการส่งแบบปกติ (กดปุ่มส่งเอง) ให้ขึ้น Popup ยืนยัน
  if(!auto) {
    showModal("ยืนยันการส่ง", "คุณมั่นใจหรือไม่ที่จะส่งข้อสอบ เมื่อส่งแล้วจะไม่สามารถกลับมาแก้ไขได้", "❓", () => {
      executeSubmit();
    });
  } else {
    // 3. ถ้าเป็นแบบ Auto (ทุจริต/หมดเวลา) ให้ส่งทันที
    executeSubmit();
  }
}

// ฟังก์ชันภายในสำหรับจัดการเรื่องย้ายหน้าและล้างค่าป้องกันการกดย้อนกลับ
function executeSubmit() {
  window.onbeforeunload = null; // ปิดตัวเตือนตอนปิด Browser
  localStorage.setItem("userAnswers", JSON.stringify(answers));
  location.href = "processing.html";
}
/* ================== SECURITY ================== */
function initSecurity(){
  window.onbeforeunload = () => "คุณกำลังทำข้อสอบอยู่"
  
  // 1. ตรวจจับการสลับแท็บ/พับจอ
  document.addEventListener("visibilitychange",()=>{
    if(document.hidden) submitExam(true);
  })

  // 2. ตรวจจับการย่อขนาดหน้าจอ (Restore Down)
  window.addEventListener('resize', () => {
    if (window.outerWidth < (screen.width - 50) || window.outerHeight < (screen.height - 50)) {
       submitExam(true);
    }
  });

  // 3. ตรวจจับการออกจาก Fullscreen
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) {
       submitExam(true);
    }
  });

  document.addEventListener("contextmenu", e => e.preventDefault())
  document.addEventListener("keydown", (e) => {
      if(e.ctrlKey || e.metaKey || e.altKey || e.key.startsWith('F')) {
          e.preventDefault();
      }
  }, true);
}

/* ================== RESULT PAGE (LOCKED) ================== */
if(location.pathname.includes("result.html")){
  const userAns = JSON.parse(localStorage.getItem("userAnswers") || "{}")
  let score = 0
  for(let i=1; i<=TOTAL_QUESTIONS; i++){
    if(userAns[i]?.toString() === correctAnswers[i]) score++
  }
  const isPass = score >= PASS_SCORE
  const statusText = isPass ? "ผ่านการทดสอบ" : "ไม่ผ่านการทดสอบ"

  if(!localStorage.getItem("dataSent")){
      sendDataToSheet(score, TOTAL_QUESTIONS, statusText);
      localStorage.setItem("dataSent", "true");
  }

  // เปลี่ยนสีพื้นหลังเป็นสีเขียวอ่อนเพื่อให้ครูเห็นว่าส่งแล้ว
  document.body.style.background = "#e8f5e9";

  const resultBox = document.getElementById("resultBox");
  if(resultBox) {
    resultBox.innerHTML = `
      <div style="text-align:center; padding: 20px;">
        <div style="font-size: 5rem; margin-bottom: 20px;">✅</div>
        <h2 style="color:var(--primary); font-size: 2.2rem;">ส่งคำตอบสำเร็จ!</h2>
        <hr style="border:1px solid #ddd; margin:20px 0;">
        <p style="font-size:1.3rem;">นักศึกษา: <b>${localStorage.getItem("sname")}</b></p>
        <p style="color: #d32f2f; font-weight: bold; font-size: 1.2rem; margin: 20px 0;">
          ระบบได้บันทึกคำตอบและผลคะแนนสอบแล้ว
        </p>
        <div style="background: #fff; border: 2px dashed #388e3c; padding: 20px; border-radius: 15px; display: inline-block;">
           <p style="margin: 0; font-size: 1.1rem; color: #2e7d32;">
             <b>กรุณานั่งรอในความสงบ</b><br>
             รอคำสั่งจากอาจารย์เพื่ออนุญาตให้เลิกแถวหรือกลับบ้าน
           </p>
        </div>
      </div>`
  }

  // ป้องกันการกดย้อนกลับ (Anti-Back)
  history.pushState(null, null, location.href);
  window.onpopstate = function () {
      history.go(1);
  };
}