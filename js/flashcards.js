/* ═══════════════════════════════════════════
   Capstone Flashcard Engine
   ═══════════════════════════════════════════ */

(function () {
  "use strict";

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  let cards = [];
  let currentIndex = 0;
  let seen = new Set();
  let selectedCategory = "all";
  let isFlipped = false;

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function init() {
    const page = $("#flashcard-page");
    if (!page) return;

    // Build category pills
    const cats = [...new Set(FLASHCARD_DATA.map((c) => c.category))];
    const pillWrap = $("#fc-category-pills");
    if (pillWrap) {
      const allPill = document.createElement("button");
      allPill.className = "pill active";
      allPill.textContent = "All";
      allPill.dataset.value = "all";
      allPill.addEventListener("click", () => selectCategory("all"));
      pillWrap.appendChild(allPill);

      cats.forEach((c) => {
        const btn = document.createElement("button");
        btn.className = "pill";
        btn.textContent = c;
        btn.dataset.value = c;
        btn.addEventListener("click", () => selectCategory(c));
        pillWrap.appendChild(btn);
      });
    }

    // Shuffle button
    const shuffleBtn = $("#fc-shuffle");
    if (shuffleBtn) shuffleBtn.addEventListener("click", reshuffleCards);

    // Nav
    const prevBtn = $("#fc-prev");
    const nextBtn = $("#fc-next");
    if (prevBtn) prevBtn.addEventListener("click", prevCard);
    if (nextBtn) nextBtn.addEventListener("click", nextCard);

    // Flip
    const card = $("#flashcard");
    if (card) card.addEventListener("click", flipCard);

    // Keyboard
    document.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") prevCard();
      if (e.key === "ArrowRight") nextCard();
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        flipCard();
      }
    });

    loadCards();
  }

  function selectCategory(cat) {
    selectedCategory = cat;
    $$("#fc-category-pills .pill").forEach((p) => {
      p.classList.toggle("active", p.dataset.value === cat);
    });
    loadCards();
  }

  function loadCards() {
    let pool =
      selectedCategory === "all"
        ? [...FLASHCARD_DATA]
        : FLASHCARD_DATA.filter((c) => c.category === selectedCategory);
    cards = shuffle(pool);
    currentIndex = 0;
    seen = new Set();
    isFlipped = false;
    renderCard();
  }

  function reshuffleCards() {
    cards = shuffle(cards);
    currentIndex = 0;
    seen = new Set();
    isFlipped = false;
    renderCard();
  }

  function renderCard() {
    if (cards.length === 0) {
      $("#fc-front-text").textContent = "No cards available";
      $("#fc-back-text").textContent = "";
      $("#fc-counter").textContent = "0 / 0";
      return;
    }

    const card = cards[currentIndex];
    seen.add(card.id);

    // Reset flip instantly (no transition) to avoid visible flip-back
    const el = $("#flashcard");
    if (el) {
      el.style.transition = "none";
      el.classList.remove("flipped");
      // Force reflow so the instant reset takes effect
      void el.offsetHeight;
      el.style.transition = "";
      isFlipped = false;
    }

    $("#fc-front-text").textContent = card.q;
    $("#fc-back-text").textContent = card.a;
    $("#fc-counter").textContent = `${currentIndex + 1} / ${cards.length}`;
    $("#fc-category-label").textContent = card.category;

    // Progress
    const bar = $("#fc-progress-fill");
    if (bar)
      bar.style.width = `${((currentIndex + 1) / cards.length) * 100}%`;

    // Nav state
    const prevBtn = $("#fc-prev");
    const nextBtn = $("#fc-next");
    if (prevBtn) prevBtn.disabled = currentIndex === 0;
    if (nextBtn) nextBtn.disabled = currentIndex >= cards.length - 1;
  }

  function flipCard() {
    const el = $("#flashcard");
    if (!el || cards.length === 0) return;
    isFlipped = !isFlipped;
    el.classList.toggle("flipped", isFlipped);
  }

  function prevCard() {
    if (currentIndex > 0) {
      currentIndex--;
      isFlipped = false;
      renderCard();
    }
  }

  function nextCard() {
    if (currentIndex < cards.length - 1) {
      currentIndex++;
      isFlipped = false;
      renderCard();
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
