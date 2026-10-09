/* ════════════════════════════════════════════════
   Russell Home Roasting — Order Now experience
   order.js

   Every bag is 12 oz. Click a card to add a bag; each bag
   gets its own roast level in the order drawer.
   ════════════════════════════════════════════════ */

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxhDB09P3VYo0R1IPdegYWHsNbUBK-uTA6sd69qra-_XMGHEQY4faE7Ph5krgxreT49/exec";

(function () {
  const MAX_BAGS = 20;
  const ROASTS = ["Light", "Medium", "Medium-Dark", "Dark"];
  const DEFAULT_ROAST = "Medium";

  const grid = document.getElementById("origins-grid");
  const fab = document.getElementById("order-fab");
  const overlay = document.getElementById("order-overlay");
  const drawer = document.getElementById("order-drawer");
  const closeBtn = document.getElementById("order-drawer-close");
  const form = document.getElementById("order-form");
  const statusBox = document.getElementById("order-status");
  const phoneField = document.getElementById("phone-field");
  const contactOptions = document.querySelectorAll("#contact-pref-group .toggle-option");
  const itemsEl = document.getElementById("order-items");
  const priceValueEl = document.getElementById("order-price-value");

  let contactPref = "email";

  /* Cart: one entry per 12 oz bag, kept grouped by coffee.
     { coffee: "Ethiopia — Kayon Mountain", price: 15, roast: "Medium" } */
  let cart = [];

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
    ));
  }
  const money = (n) => "$" + n.toFixed(2);

  /* ── Card helpers ── */
  function cardKey(card) {
    const country = (card.querySelector(".card-country")?.textContent || "").trim();
    const city = (card.querySelector(".card-city")?.textContent || "").trim();
    return city ? `${country} — ${city}` : country;
  }

  function countFor(key) {
    return cart.filter((i) => i.coffee === key).length;
  }

  /* Cards are (re)rendered asynchronously from the gist, so add the
     quantity control to each card whenever the grid changes. */
  function decorateCards() {
    if (!grid) return;
    grid.querySelectorAll(".origin-card").forEach((card) => {
      if (!card.querySelector(".card-qty")) {
        const qty = document.createElement("div");
        qty.className = "card-qty";
        qty.innerHTML =
          '<button type="button" data-qty="-1" aria-label="Remove one bag">−</button>' +
          '<span class="card-qty-count"></span>' +
          '<button type="button" data-qty="1" aria-label="Add one bag">+</button>';
        card.appendChild(qty);
      }
      syncCard(card);
    });
  }

  function syncCard(card) {
    const n = countFor(cardKey(card));
    card.classList.toggle("selected", n > 0);
    const label = card.querySelector(".card-qty-count");
    if (label) label.textContent = n + (n === 1 ? " bag" : " bags");
  }

  function syncAllCards() {
    if (grid) grid.querySelectorAll(".origin-card").forEach(syncCard);
  }

  /* ── Cart operations ── */
  function addBag(card) {
    if (cart.length >= MAX_BAGS) return;
    const key = cardKey(card);
    const item = {
      coffee: key,
      price: parseFloat(card.dataset.price) || 0,
      roast: DEFAULT_ROAST
    };
    // Insert after the last bag of the same coffee so they stay grouped
    let idx = -1;
    cart.forEach((i, n) => { if (i.coffee === key) idx = n; });
    if (idx === -1) cart.push(item);
    else cart.splice(idx + 1, 0, item);
    cartChanged();
  }

  function removeBagFromCoffee(key) {
    for (let n = cart.length - 1; n >= 0; n--) {
      if (cart[n].coffee === key) { cart.splice(n, 1); break; }
    }
    cartChanged();
  }

  function removeBagAt(index) {
    cart.splice(index, 1);
    cartChanged();
  }

  function cartChanged() {
    syncAllCards();
    renderItems();
    updateFab();
    if (cart.length === 0) closeDrawer();
  }

  function total() {
    return cart.reduce((sum, i) => sum + i.price, 0);
  }

  /* ── Card clicks ── */
  if (grid) {
    grid.addEventListener("click", function (e) {
      const card = e.target.closest(".origin-card");
      if (!card) return;
      const qtyBtn = e.target.closest(".card-qty button");
      if (qtyBtn) {
        e.stopPropagation();
        if (qtyBtn.dataset.qty === "1") addBag(card);
        else removeBagFromCoffee(cardKey(card));
        return;
      }
      if (e.target.closest(".card-qty")) return;
      addBag(card);
    });

    new MutationObserver(decorateCards).observe(grid, { childList: true });
    decorateCards();
  }

  /* ── Floating order bar ── */
  function updateFab() {
    const n = cart.length;
    if (n === 0) {
      fab.classList.remove("show");
      return;
    }
    fab.textContent = `Order Now · ${n} ${n === 1 ? "bag" : "bags"} · ${money(total())}`;
    fab.setAttribute("aria-label", `Order ${n} ${n === 1 ? "bag" : "bags"}`);
    fab.classList.add("show");
  }

  /* ── Drawer line items ── */
  const ROAST_LABELS = { "Light": "Light", "Medium": "Medium", "Medium-Dark": "Med-Dark", "Dark": "Dark" };

  function renderItems() {
    priceValueEl.textContent = money(total());
    itemsEl.innerHTML = cart.map((item, i) => {
      const roastButtons = ROASTS.map((r) =>
        `<button type="button" class="roast-opt${r === item.roast ? " active" : ""}" ` +
        `data-roast="${r}" aria-pressed="${r === item.roast}">${ROAST_LABELS[r]}</button>`
      ).join("");
      return (
        `<div class="order-item" data-index="${i}">` +
          `<div class="order-item-head">` +
            `<div class="order-item-info">` +
              `<div class="order-item-name">${esc(item.coffee)}</div>` +
              `<div class="order-item-meta">12 oz · whole bean</div>` +
            `</div>` +
            `<span class="order-item-price">${money(item.price)}</span>` +
            `<button type="button" class="order-item-remove" aria-label="Remove bag ${i + 1}">×</button>` +
          `</div>` +
          `<div class="order-item-roast">` +
            `<div class="order-item-roast-label">Roast level</div>` +
            `<div class="roast-group" role="group" aria-label="Roast level for bag ${i + 1}">${roastButtons}</div>` +
          `</div>` +
        `</div>`
      );
    }).join("");
  }

  itemsEl.addEventListener("click", (e) => {
    const row = e.target.closest(".order-item");
    if (!row) return;
    const index = parseInt(row.dataset.index, 10);

    const roastBtn = e.target.closest(".roast-opt");
    if (roastBtn) {
      cart[index].roast = roastBtn.dataset.roast;
      row.querySelectorAll(".roast-opt").forEach((b) => {
        const on = b === roastBtn;
        b.classList.toggle("active", on);
        b.setAttribute("aria-pressed", on);
      });
      return;
    }

    if (e.target.closest(".order-item-remove")) removeBagAt(index);
  });

  /* ── Drawer open/close ── */
  function openDrawer() {
    if (cart.length === 0) return;
    statusBox.className = "order-status";
    prefillFromCookies();
    renderItems();
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

  /* ── Contact preference toggle ── */
  contactOptions.forEach((opt) => {
    opt.addEventListener("click", () => {
      contactOptions.forEach((o) => o.classList.remove("active"));
      opt.classList.add("active");
      contactPref = opt.dataset.contactPref;
      phoneField.classList.toggle("hidden", contactPref !== "text");
    });
  });

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
        o.classList.toggle("active", o.dataset.contactPref === pref);
      });
      contactPref = pref;
      phoneField.classList.toggle("hidden", contactPref !== "text");
    }
  }

  /* ── Build the order summary sent to the sheet ──
     Bags are grouped by coffee + roast, e.g.
     "2 × Ethiopia — Kayon Mountain (Medium); 1 × Org. Honduras — COMSA (Dark)" */
  function groupCart() {
    const groups = [];
    cart.forEach((item) => {
      const g = groups.find((x) => x.coffee === item.coffee && x.roast === item.roast);
      if (g) g.count++;
      else groups.push({ coffee: item.coffee, roast: item.roast, price: item.price, count: 1 });
    });
    return groups;
  }

  function summarizeCart() {
    return groupCart().map((g) => `${g.count} × ${g.coffee} (${g.roast})`).join("; ");
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
    const notes = form.elements["orderNotes"].value.trim();

    if (cart.length === 0) {
      showStatus("Add at least one bag before ordering.", "error");
      return;
    }
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

    const roasts = Array.from(new Set(cart.map((i) => i.roast)));

    const payload = new URLSearchParams({
      timestamp: new Date().toISOString(),
      coffee: summarizeCart(),
      customerName: name,
      customerEmail: email,
      contactPreference: contactPref,
      customerPhone: phone,
      roastLevel: roasts.length === 1 ? roasts[0] : "Mixed (see coffee)",
      bagSize: "12oz",
      quantity: String(cart.length),
      price: total().toFixed(2),
      items: JSON.stringify(groupCart()),
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

        // Clear the cart without auto-closing yet, so the success message shows
        cart = [];
        syncAllCards();
        updateFab();
        setTimeout(() => { closeDrawer(); renderItems(); }, 1800);
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

  updateFab();
})();
