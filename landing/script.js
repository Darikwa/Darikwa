// ÉLAN landing page interactions
(function () {
  "use strict";

  // --- Scroll-reveal ---
  const revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-in"));
  }

  // --- Nav shadow on scroll + sticky mobile CTA ---
  const nav = document.getElementById("nav");
  const stickyCta = document.getElementById("stickyCta");
  let ticking = false;
  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      nav.classList.toggle("is-scrolled", y > 10);
      stickyCta.classList.toggle("is-visible", y > 700);
      ticking = false;
    });
  });

  // --- Cart (demo) ---
  const cartCount = document.getElementById("cartCount");
  const toast = document.getElementById("toast");
  let count = 0;
  let toastTimer;

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2600);
  }

  document.querySelectorAll(".add-to-cart").forEach((btn) => {
    btn.addEventListener("click", () => {
      const card = btn.closest("[data-name]");
      const name = card ? card.dataset.name : "Candle";
      count += 1;
      cartCount.textContent = count;
      cartCount.classList.remove("bump");
      void cartCount.offsetWidth; // restart animation
      cartCount.classList.add("bump");
      showToast(`${name} added to cart ✦`);
    });
  });

  // --- Email capture (demo) ---
  const form = document.getElementById("captureForm");
  const msg = document.getElementById("captureMsg");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = form.email.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      msg.textContent = "Please enter a valid email address.";
      msg.classList.remove("is-success");
      return;
    }
    form.reset();
    msg.textContent = "Welcome to the ritual — your 10% code is on its way. ✦";
    msg.classList.add("is-success");
    showToast("10% off claimed — check your inbox ✦");
  });
})();
