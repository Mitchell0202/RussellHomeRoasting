/* ════════════════════════════════════════════════
   Russell Home Roasting — Order Now experience
   order.js

   SETUP: paste your deployed Google Apps Script
   web app URL below (ends in /exec). See the
   accompanying Code.gs + setup notes.
   ════════════════════════════════════════════════ */

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxhDB09P3VYo0R1IPdegYWHsNbUBK-uTA6sd69qra-_XMGHEQY4faE7Ph5krgxreT49/exec";

(function () {
  const grid = document.getElementById("origins-grid");
  const fab = document.getElementById("order-fab");
  const overlay = document.getElementById("order-overlay");
  const drawer = document.getElementById("order-drawer");
  const drawerTitle = document.getElementById("order-drawer-title");
  const closeBtn = document.getElementById("order-drawer-close");
  const form = document.getElementById("order-form");
  const statusBox = document.getElementById("order-status");
  const phoneField = document.getElementById("phone-field");
  const contactOptions = document.querySelectorAll("#contact-pref-group .toggle-option");
  const bagOptions = document.querySelectorAll("#bag-size-group .toggle-option");
  const quantityInput = document.getElementById("quantity");
  const quantityDecrease = document.getElementById("quantity-decrease");
  const quantityIncrease = document.getElementById("quantity-increase");

  let selectedCard = null;
  let selectedCoffee = "";
  let basePrice = 0; // price per 12oz bag, read from the card's data-price
  let contactPref = "email";
  let bagSize = "12oz";
  let quantity = 1;

  /* ── Card selection ── */
  function selectCard(card) {
    if (selectedCard === card) {
      card.classList.remove("selected");
      selectedCard = null;
      selectedCoffee = "";
      basePrice = 0;
      fab.classList.remove("show");
      closeDrawer();
      return;
    }
    if (selectedCard) selectedCard.classList.remove("selected");
    card.classList.add("selected");
    selectedCard = card;

    const country = (card.querySelector(".card-country")?.textContent || "").trim();
    const city = (card.querySelector(".card-city")?.textContent || "").trim();
    selectedCoffee = city ? `${country} — ${city}` : country;
    basePrice = parseFloat(card.dataset.price) || 0;

    fab.setAttribute("aria-label", `Order ${selectedCoffee}`);
    fab.title = selectedCoffee;
    fab.classList.add("show");
  }

  if (grid) {
    grid.addEventListener("click", function (e) {
      const card = e.target.closest(".origin-card");
      if (!card) return;
      selectCard(card);
    });
  }

  const priceValueEl = document.getElementById("order-price-value");

  function currentPrice() {
    // 6oz is priced at half a 12oz bag; adjust here if pricing
    // logic ever gets more complex.
    const perBag = bagSize === "6oz" ? basePrice / 2 : basePrice;
    return perBag * quantity;
  }

  function updatePriceDisplay() {
    priceValueEl.textContent = "$" + currentPrice().toFixed(2);
  }

  /* ── Drawer open/close ── */
  function openDrawer() {
    if (!selectedCoffee) return;
    drawerTitle.textContent = selectedCoffee;
    statusBox.className = "order-status";
    prefillFromCookies();
    setQuantity(1);
    overlay.classList.add("open");
    drawer.classList.add("open");
    drawer.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeDrawer() {
    overlay.classList.remove("open");
    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  fab.addEventListener("click", openDrawer);
  fab.addEventListener("keypress", (e) => {
    if (e.key === "Enter" || e.key === " ") openDrawer();
  });
  overlay.addEventListener("click", closeDrawer);
  closeBtn.addEventListener("click", closeDrawer);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDrawer();
  });

  /* ── Toggle groups ── */
  contactOptions.forEach((opt) => {
    opt.addEventListener("click", () => {
      contactOptions.forEach((o) => o.classList.remove("active"));
      opt.classList.add("active");
      contactPref = opt.dataset.contactPref;
      phoneField.classList.toggle("hidden", contactPref !== "text");
    });
  });

  bagOptions.forEach((opt) => {
    opt.addEventListener("click", () => {
      bagOptions.forEach((o) => o.classList.remove("active"));
      opt.classList.add("active");
      bagSize = opt.dataset.bagSize;
      updatePriceDisplay();
    });
  });

  function clampQuantity(value) {
    const n = parseInt(value, 10);
    if (isNaN(n)) return 1;
    return Math.min(20, Math.max(1, n));
  }

  function setQuantity(value) {
    quantity = clampQuantity(value);
    quantityInput.value = quantity;
    updatePriceDisplay();
  }

  quantityInput.addEventListener("input", () => setQuantity(quantityInput.value));
  quantityInput.addEventListener("blur", () => setQuantity(quantityInput.value));
  quantityDecrease.addEventListener("click", () => setQuantity(quantity - 1));
  quantityIncrease.addEventListener("click", () => setQuantity(quantity + 1));

  /* ── Cookies (remember contact info) ── */
  function setCookie(name, value, days) {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
  }

  function getCookie(name) {
    const match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
    return match ? decodeURIComponent(match[1]) : "";
  }

  function prefillFromCookies() {
    const name = getCookie("rhr_name");
    const email = getCookie("rhr_email");
    const pref = getCookie("rhr_contact_pref");
    const phone = getCookie("rhr_phone");

    if (name) form.elements["customerName"].value = name;
    if (email) form.elements["customerEmail"].value = email;
    if (phone) form.elements["customerPhone"].value = phone;

    if (pref) {
      contactOptions.forEach((o) => {
        const isMatch = o.dataset.contactPref === pref;
        o.classList.toggle("active", isMatch);
      });
      contactPref = pref;
      phoneField.classList.toggle("hidden", contactPref !== "text");
    }
  }

  /* ── JSONP submission (works around Apps Script's lack of CORS headers) ── */
  function sendOrderJSONP(payload) {
    return new Promise((resolve, reject) => {
      const callbackName = "rhrOrderCallback_" + Date.now() + "_" + Math.floor(Math.random() * 1e6);

      const timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error("timeout"));
      }, 15000);

      function cleanup() {
        clearTimeout(timeoutId);
        delete window[callbackName];
        if (script.parentNode) script.parentNode.removeChild(script);
      }

      window[callbackName] = function (response) {
        cleanup();
        resolve(response);
      };

      payload.set("action", "order");
      payload.set("callback", callbackName);

      const script = document.createElement("script");
      script.src = SCRIPT_URL + "?" + payload.toString();
      script.onerror = () => {
        cleanup();
        reject(new Error("script load failed"));
      };
      document.body.appendChild(script);
    });
  }

  /* ── Submit ── */
  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const name = form.elements["customerName"].value.trim();
    const email = form.elements["customerEmail"].value.trim();
    const phone = form.elements["customerPhone"].value.trim();
    const roast = form.elements["roastLevel"].value;
    const notes = form.elements["orderNotes"].value.trim();

    if (!name || !email) {
      showStatus("Please fill in your name and email.", "error");
      return;
    }
    if (contactPref === "text" && !phone) {
      showStatus("Please add a phone number for text updates.", "error");
      return;
    }
    if (!SCRIPT_URL || SCRIPT_URL.indexOf("PASTE_YOUR") === 0) {
      showStatus("Order form isn't connected yet — add the Apps Script URL in order.js.", "error");
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = "Sending…";

    const payload = new URLSearchParams({
      timestamp: new Date().toISOString(),
      coffee: selectedCoffee,
      customerName: name,
      customerEmail: email,
      contactPreference: contactPref,
      customerPhone: phone,
      roastLevel: roast,
      bagSize: bagSize,
      quantity: String(quantity),
      price: currentPrice().toFixed(2),
      orderNotes: notes
    });

    sendOrderJSONP(payload)
      .then((response) => {
        if (!response || response.ok !== true) {
          showStatus(
            "Your order didn't go through: " + (response && response.error ? response.error : "please try again."),
            "error"
          );
          submitBtn.disabled = false;
          submitBtn.textContent = "Order Now";
          return;
        }

        setCookie("rhr_name", name, 180);
        setCookie("rhr_email", email, 180);
        setCookie("rhr_contact_pref", contactPref, 180);
        if (phone) setCookie("rhr_phone", phone, 180);

        showStatus("Order sent! Check your email for a copy.", "success");
        submitBtn.disabled = false;
        submitBtn.textContent = "Order Now";
        form.reset();
        prefillFromCookies();

        setTimeout(closeDrawer, 1800);
      })
      .catch(() => {
        showStatus("Something went wrong sending your order. Please try again.", "error");
        submitBtn.disabled = false;
        submitBtn.textContent = "Order Now";
      });
  });

  function showStatus(message, type) {
    statusBox.textContent = message;
    statusBox.className = `order-status show ${type}`;
  }
})();
