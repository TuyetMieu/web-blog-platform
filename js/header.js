/**
 * header.js — makes the shared header (duplicated markup on every page)
 * actually interactive. Loaded on both journal-feed.html and
 * whisper-box.html, independent of api.js/journal-feed.js/whisper-box.js.
 *
 * "The Dual Journal" and "The Whisper Box" nav links are real <a href>
 * elements — the browser navigates on its own, no JS needed for those.
 * Everything else that's clickable but has no real destination yet (the
 * other 3 nav items, the avatar, the theme toggle) is a real <button>
 * carrying a data-header-toast message; clicking it shows a small toast
 * instead of silently doing nothing.
 */
(function () {
  function showToast(message) {
    const toast = document.createElement("div");
    toast.className = "kj-header-toast";
    toast.setAttribute("role", "status");
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add("kj-header-toast-visible"));

    setTimeout(() => {
      toast.classList.remove("kj-header-toast-visible");
      setTimeout(() => toast.remove(), 200);
    }, 2200);
  }

  document.querySelectorAll("[data-header-toast]").forEach((el) => {
    el.addEventListener("click", () => showToast(el.dataset.headerToast));
  });

  // Clicking the magnifying-glass icon next to the header search box
  // focuses it, like a normal search box would.
  const headerSearchIcon = document.getElementById("header-search-icon");
  const headerSearchInput = document.getElementById("header-search-input");
  if (headerSearchIcon && headerSearchInput) {
    headerSearchIcon.style.cursor = "pointer";
    headerSearchIcon.addEventListener("click", () => headerSearchInput.focus());
  }
})();
