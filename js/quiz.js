/* ═══════════════════════════════════════════
   Capstone Quiz Engine — Refined
   ═══════════════════════════════════════════ */
(function () {
  "use strict";

  let questions = [];
  let currentIndex = 0;
  let score = 0;
  let answered = [];
  let mode = "practice";
  let timer = null;
  let timeLeft = 0;
  let totalTime = 0;
  let questionCount = 25;
  let timerMinutes = 30;

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* ── Setup Page ── */
  function initSetup() {
    const page = $("#quiz-setup-page");
    if (!page) return;

    // Build category pills
    const cats = [...new Set(QUIZ_DATA.map((q) => q.category))];
    const catWrap = $("#category-pills");
    if (catWrap) {
      cats.forEach((c) => {
        const btn = document.createElement("button");
        btn.className = "pill active";
        btn.textContent = c;
        btn.dataset.value = c;
        btn.addEventListener("click", () => {
          btn.classList.toggle("active");
          syncCount();
        });
        catWrap.appendChild(btn);
      });
    }

    // Difficulty pills
    $$(".diff-pill").forEach((btn) => {
      btn.addEventListener("click", () => {
        btn.classList.toggle("active");
        syncCount();
      });
    });

    // Mode radios
    $$('input[name="mode"]').forEach((r) =>
      r.addEventListener("change", () => {
        const timerRow = $("#timer-row");
        if (timerRow) timerRow.style.display = r.value === "exam" ? "" : "none";
      })
    );

    // Question count stepper
    const countVal = $("#count-value");
    $("#count-minus").addEventListener("click", () => {
      questionCount = Math.max(5, questionCount - 5);
      countVal.textContent = questionCount;
    });
    $("#count-plus").addEventListener("click", () => {
      const max = getFilteredQuestions().length;
      questionCount = Math.min(max, questionCount + 5);
      countVal.textContent = questionCount;
    });

    // Timer stepper
    const timeVal = $("#time-value");
    $("#time-minus").addEventListener("click", () => {
      timerMinutes = Math.max(5, timerMinutes - 5);
      timeVal.textContent = timerMinutes;
    });
    $("#time-plus").addEventListener("click", () => {
      timerMinutes = Math.min(120, timerMinutes + 5);
      timeVal.textContent = timerMinutes;
    });

    syncCount();

    $("#start-quiz").addEventListener("click", startQuiz);
  }

  function getFilteredQuestions() {
    const activeCats = [...$$("#category-pills .pill.active")].map(
      (b) => b.dataset.value
    );
    const activeDiffs = [...$$(".diff-pill.active")].map((b) =>
      b.dataset.value.toLowerCase()
    );
    return QUIZ_DATA.filter(
      (q) =>
        activeCats.includes(q.category) && activeDiffs.includes(q.difficulty)
    );
  }

  function syncCount() {
    const filtered = getFilteredQuestions();
    const el = $("#available-count");
    if (el) el.textContent = filtered.length;
    if (questionCount > filtered.length) {
      questionCount = filtered.length || 5;
      const cv = $("#count-value");
      if (cv) cv.textContent = questionCount;
    }
  }

  function startQuiz() {
    const modeInput = $('input[name="mode"]:checked');
    mode = modeInput ? modeInput.value : "practice";

    const filtered = getFilteredQuestions();
    if (filtered.length === 0) {
      alert("No questions match your filters.");
      return;
    }

    const count = Math.min(questionCount, filtered.length);
    questions = shuffle(filtered).slice(0, count);

    // Shuffle options per question
    questions = questions.map((q) => {
      const indices = q.options.map((_, i) => i);
      const shuffled = shuffle(indices);
      return {
        ...q,
        options: shuffled.map((i) => q.options[i]),
        correct: q.correct.map((c) => shuffled.indexOf(c)),
      };
    });

    currentIndex = 0;
    score = 0;
    answered = new Array(questions.length).fill(null);

    if (mode === "exam") {
      timeLeft = timerMinutes * 60;
      totalTime = timeLeft;
    } else {
      timeLeft = 0;
      totalTime = 0;
    }

    sessionStorage.setItem(
      "quizState",
      JSON.stringify({ questions, mode, timeLeft, totalTime, currentIndex, score, answered })
    );
    window.location.href = "quiz.html";
  }

  /* ── Quiz Page ── */
  function initQuiz() {
    if (!$("#quiz-page")) return;

    const state = JSON.parse(sessionStorage.getItem("quizState"));
    if (!state) { window.location.href = "quiz-setup.html"; return; }

    questions = state.questions;
    mode = state.mode;
    timeLeft = state.timeLeft;
    totalTime = state.totalTime;
    currentIndex = state.currentIndex;
    score = state.score;
    answered = state.answered;

    if (mode === "exam" && timeLeft > 0) startCountdown();

    renderQuestion();
    updateProgress();

    $("#prev-btn").addEventListener("click", prevQuestion);
    $("#next-btn").addEventListener("click", nextQuestion);
    $("#finish-btn").addEventListener("click", finishQuiz);
  }

  function renderQuestion() {
    const q = questions[currentIndex];
    if (!q) return;

    $("#q-number").textContent = `${currentIndex + 1} / ${questions.length}`;
    $("#q-category").textContent = q.category;

    const diffTag = $("#q-difficulty");
    diffTag.textContent = q.difficulty;
    diffTag.className = `tag tag-${q.difficulty}`;

    $("#q-text").textContent = q.question;

    // Type badge + True/False detection
    const typeEl = $("#q-type");
    const qText = $("#q-text");
    const tfPrefix = /^True or False:\s*/i;
    if (tfPrefix.test(q.question)) {
      typeEl.textContent = "True or False";
      qText.textContent = q.question.replace(tfPrefix, '');
    } else if (q.type === "multi") {
      const count = q.selectCount || q.correct.length;
      typeEl.textContent = `Select ${count}`;
    } else {
      typeEl.textContent = "Select 1";
    }
    typeEl.style.display = "";

    // Options
    const wrap = $("#options");
    wrap.innerHTML = "";
    const isAnswered = answered[currentIndex] !== null;

    q.options.forEach((opt, i) => {
      const btn = document.createElement("button");
      btn.className = "quiz-option";
      btn.dataset.index = i;

      const indicator = document.createElement("span");
      indicator.className = "option-indicator";
      indicator.setAttribute("data-type", q.type);
      indicator.innerHTML = q.type === "multi"
        ? `<svg width="16" height="16" viewBox="0 0 16 16"><rect class="cb-box" x="1.5" y="1.5" width="13" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><path class="cb-check" d="M4.5 8.5l2.5 2.5 4.5-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" opacity="0"/></svg>`
        : `<svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" stroke-width="1.5"/><circle class="rb-dot" cx="8" cy="8" r="0" fill="currentColor"/></svg>`;

      const text = document.createElement("span");
      text.className = "option-text";
      text.textContent = opt;

      btn.appendChild(indicator);
      btn.appendChild(text);

      if (isAnswered) {
        const ua = answered[currentIndex];
        if (q.correct.includes(i)) btn.classList.add("correct");
        if (ua.includes(i) && !q.correct.includes(i)) btn.classList.add("incorrect");
        if (ua.includes(i)) btn.classList.add("selected");
        btn.disabled = true;
      } else {
        btn.addEventListener("click", () => selectOption(btn, i, q));
      }

      wrap.appendChild(btn);
    });

    // Hint — ONLY in practice mode, NEVER in exam
    const hintWrap = $("#hint-wrap");
    const hintText = $("#hint-text");
    const hintBtn = $("#hint-btn");
    if (mode === "practice" && !isAnswered) {
      hintWrap.style.display = "";
      if (q.hint) {
        hintBtn.style.display = "";
        hintText.style.display = "none";
        hintText.textContent = q.hint;
        // Clone to remove old listeners
        const newBtn = hintBtn.cloneNode(true);
        newBtn.id = "hint-btn";
        hintBtn.parentNode.replaceChild(newBtn, hintBtn);
        newBtn.addEventListener("click", () => {
          hintText.style.display = "";
          newBtn.style.display = "none";
        });
      } else {
        hintBtn.style.display = "none";
        hintText.style.display = "";
        hintText.textContent = "No hint available for this question.";
      }
    } else {
      hintWrap.style.display = "none";
    }

    // Explanation — ONLY in practice mode after answering
    const explWrap = $("#explanation-wrap");
    if (mode === "practice" && isAnswered && q.explanation) {
      explWrap.style.display = "";
      $("#explanation-text").textContent = q.explanation;
    } else {
      explWrap.style.display = "none";
    }

    // Nav
    $("#prev-btn").disabled = currentIndex === 0;
    $("#next-btn").style.display = currentIndex < questions.length - 1 ? "" : "none";
    const allDone = answered.every((a) => a !== null);
    $("#finish-btn").style.display =
      currentIndex === questions.length - 1 || allDone ? "" : "none";
  }

  let selectedOptions = [];

  function selectOption(btn, index, q) {
    if (q.type === "single") {
      answered[currentIndex] = [index];
      if (q.correct.length === 1 && q.correct[0] === index) score++;
      selectedOptions = [];
      saveState();
      renderQuestion();
      updateProgress();
    } else {
      const needed = q.selectCount || q.correct.length;
      if (btn.classList.contains("selected")) {
        btn.classList.remove("selected");
        selectedOptions = selectedOptions.filter((i) => i !== index);
      } else if (selectedOptions.length < needed) {
        btn.classList.add("selected");
        selectedOptions.push(index);
      }
      if (selectedOptions.length === needed) {
        answered[currentIndex] = [...selectedOptions];
        const correct =
          selectedOptions.length === q.correct.length &&
          selectedOptions.every((s) => q.correct.includes(s));
        if (correct) score++;
        selectedOptions = [];
        saveState();
        renderQuestion();
        updateProgress();
      }
    }
  }

  function prevQuestion() {
    if (currentIndex > 0) { currentIndex--; selectedOptions = []; saveState(); renderQuestion(); updateProgress(); }
  }
  function nextQuestion() {
    if (currentIndex < questions.length - 1) { currentIndex++; selectedOptions = []; saveState(); renderQuestion(); updateProgress(); }
  }

  function updateProgress() {
    const bar = $("#progress-fill");
    if (bar) bar.style.width = `${((currentIndex + 1) / questions.length) * 100}%`;
    const cnt = answered.filter((a) => a !== null).length;
    const el = $("#answered-count");
    if (el) el.textContent = `${cnt}/${questions.length}`;
  }

  function startCountdown() {
    const el = $("#timer");
    if (!el) return;
    el.style.display = "";
    function tick() {
      if (timeLeft <= 0) { clearInterval(timer); finishQuiz(); return; }
      timeLeft--;
      const m = Math.floor(timeLeft / 60);
      const s = timeLeft % 60;
      el.textContent = `${m}:${s.toString().padStart(2, "0")}`;
      if (timeLeft < 60) el.classList.add("timer-warning");
      saveState();
    }
    tick();
    timer = setInterval(tick, 1000);
  }

  function saveState() {
    sessionStorage.setItem(
      "quizState",
      JSON.stringify({ questions, mode, timeLeft, totalTime, currentIndex, score, answered })
    );
  }

  function finishQuiz() {
    if (timer) clearInterval(timer);
    const total = questions.length;
    const pct = total > 0 ? Math.round((score / total) * 100) : 0;
    const catStats = {};
    questions.forEach((q, i) => {
      if (!catStats[q.category]) catStats[q.category] = { total: 0, correct: 0 };
      catStats[q.category].total++;
      if (answered[i] !== null) {
        const ok = answered[i].length === q.correct.length && answered[i].every((s) => q.correct.includes(s));
        if (ok) catStats[q.category].correct++;
      }
    });
    const resultObj = { score, total, pct, mode, catStats, timeUsed: totalTime - timeLeft };
    sessionStorage.setItem("quizResult", JSON.stringify(resultObj));

    // Persist to localStorage for home page summary
    const history = JSON.parse(localStorage.getItem("quizHistory") || "[]");
    history.push({ pct, mode, date: new Date().toISOString().slice(0, 10) });
    // Keep last 100 entries
    if (history.length > 100) history.splice(0, history.length - 100);
    localStorage.setItem("quizHistory", JSON.stringify(history));

    window.location.href = "quiz-result.html";
  }

  /* ── Result Page ── */
  function initResult() {
    if (!$("#result-page")) return;
    const result = JSON.parse(sessionStorage.getItem("quizResult"));
    if (!result) { window.location.href = "quiz-setup.html"; return; }

    $("#result-pct").textContent = `${result.pct}%`;
    $("#result-label").textContent = `${result.score} / ${result.total}`;

    const color = result.pct >= 80 ? "var(--green)" : result.pct >= 50 ? "var(--yellow)" : "var(--red)";
    $("#result-pct").style.color = color;
    const block = $("#result-score-block");
    if (block) block.style.setProperty("--accent-bar", color);

    // Stats
    const sg = $("#result-stats");
    if (sg) {
      let h = "";
      if (result.mode === "exam" && result.timeUsed) {
        const m = Math.floor(result.timeUsed / 60);
        const s = result.timeUsed % 60;
        h += `<div class="stat-card"><div class="stat-value">${m}:${s.toString().padStart(2,"0")}</div><div class="stat-label">Time</div></div>`;
      }
      h += `<div class="stat-card"><div class="stat-value">${result.score}</div><div class="stat-label">Correct</div></div>`;
      h += `<div class="stat-card"><div class="stat-value">${result.total - result.score}</div><div class="stat-label">Wrong</div></div>`;
      h += `<div class="stat-card"><div class="stat-value">${result.mode}</div><div class="stat-label">Mode</div></div>`;
      sg.innerHTML = h;
    }

    // Breakdown
    const bd = $("#category-breakdown");
    if (bd && result.catStats) {
      let h = "";
      for (const [cat, s] of Object.entries(result.catStats)) {
        const p = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
        h += `<div class="breakdown-row"><span class="breakdown-cat">${cat}</span><div class="breakdown-bar-wrap"><div class="breakdown-bar" style="width:${p}%"></div></div><span class="breakdown-pct">${s.correct}/${s.total}</span></div>`;
      }
      bd.innerHTML = h;
    }

    $("#retry-btn").addEventListener("click", () => (window.location.href = "quiz-setup.html"));
    $("#home-btn").addEventListener("click", () => (window.location.href = "index.html"));
  }

  /* ── Init ── */
  document.addEventListener("DOMContentLoaded", () => {
    if ($("#quiz-setup-page")) initSetup();
    if ($("#quiz-page")) initQuiz();
    if ($("#result-page")) initResult();
  });
})();
