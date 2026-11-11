(() => {
        "use strict";

        /* ---------- CONFIG ---------- */
        const WHATSAPP_NUMBER = "2349139656964";
        // Web3Forms access key (safe to be public; emails go to bydistrict09@gmail.com)
        const WEB3FORMS_KEY = "c60d97de-2611-4065-aa6f-3b7049940cad";
        const FORM_ENDPOINT = "https://api.web3forms.com/submit";
        const STORAGE_KEY = "d09_bag_v1";
        const MAX_QTY = 10;
        const LAST_ORDER_KEY = "d09_last_order_v1";
        const PAGE = document.body.dataset.page || "home";

        // Delivery fee per destination (naira). Shown to the customer before they pay.
        // The server holds its own copy and charges from that one, so keep both lists identical.
        const DELIVERY_FEES = {
            "Abia": 4500, "Adamawa": 7000, "Akwa Ibom": 6000, "Anambra": 4000, "Bauchi": 5500,
            "Bayelsa": 6000, "Benue": 5000, "Borno": 8000, "Cross River": 6000, "Delta": 4500,
            "Ebonyi": 4500, "Edo": 3500, "Ekiti": 5000, "Enugu": 4000, "FCT Abuja": 3500,
            "Gombe": 6000, "Imo": 4500, "Jigawa": 6500, "Kaduna": 4500, "Kano": 6000,
            "Katsina": 6500, "Kebbi": 7000, "Kogi": 2000, "Kwara": 5000, "Lagos": 5500,
            "Nasarawa": 4000, "Niger": 4500, "Ogun": 5500, "Ondo": 4500, "Osun": 5000,
            "Oyo": 5000, "Plateau": 5500, "Rivers": 5500, "Sokoto": 7500, "Taraba": 7000,
            "Yobe": 7000, "Zamfara": 7000
        };
        const DELIVERY_STATES = Object.keys(DELIVERY_FEES);

        const PLACEHOLDER_IMG =
            "data:image/svg+xml;utf8," + encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400"><rect width="300" height="400" fill="#ebe7de"/><text x="150" y="205" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="700" letter-spacing="3" fill="#9c9992">DISTRICT 09</text></svg>');

        /* ---------- CATALOG (single source of truth) ---------- */
        const SHADES = [
            { name: "Black",    cls: "black",   key: "black" },
            { name: "White",    cls: "white",   key: "white" },
            { name: "Sky Blue", cls: "skyblue", key: "skyblue" },
            { name: "Brown",    cls: "brown",   key: "brown" },
            { name: "Dark Grey", cls: "grey",    key: "grey" }
        ];
        const SWATCH_HEX = { black: "#171717", white: "#ffffff", skyblue: "#8dafc0", brown: "#694a38", grey: "#4a4a4a", navy: "#172b4d" };

        const shadesFor = prefix => SHADES.map(s => ({ name: s.name, hex: SWATCH_HEX[s.key], img: `${prefix}_${s.key}.jpg` }));
        const signatureColors = [
            { name: "Brown", hex: SWATCH_HEX.brown, img: "special_henley1.jpg" },
            { name: "Navy Blue", hex: SWATCH_HEX.navy, img: "special_henley2.jpg" }
        ];
        const signatureShortColors = [
            { name: "Brown", hex: SWATCH_HEX.brown, img: "special_short1.jpg" },
            { name: "Navy Blue", hex: SWATCH_HEX.navy, img: "special_short2.jpg", status: "soon" }
        ];
        const plainTrouserColors = [
            { name: "Black", hex: SWATCH_HEX.black, img: "plain_blackpants.jpg", fit: "contain" },
            { name: "Grey", hex: SWATCH_HEX.grey, img: "plain_greypants.jpg", fit: "contain" },
            { name: "Navy Blue", hex: SWATCH_HEX.navy, img: "plain_navybluepants.jpg", fit: "contain" },
            { name: "White", hex: SWATCH_HEX.white, img: "plain_whitepants.jpg", fit: "contain" }
        ];
        const stripedTrouserColors = [
            { name: "Black", hex: SWATCH_HEX.black, img: "stripped_pants.jpg", fit: "contain" },
            { name: "Grey", hex: SWATCH_HEX.grey, img: "striped_greypants.jpg", fit: "contain" },
            { name: "Navy Blue", hex: SWATCH_HEX.navy, img: "striped_navybluepants.jpg", fit: "contain" },
            { name: "White", hex: SWATCH_HEX.white, img: "striped_whitepants.jpg", fit: "contain" }
        ];
        const trouserSizes = ["30", "32", "34", "36"];

        const PRODUCTS = [
            { id: "classic-henley", category: "henley", group: "classic", status: "available", name: "D09 Classic Henley — Long Sleeve",
              tag: "CLASSIC / LONG SLEEVE", price: 25000, sizes: ["M", "L"], colors: shadesFor("plain") },
            { id: "short-sleeve-henley", category: "henley", group: "classic", status: "available", name: "D09 Classic Henley — Short Sleeve",
              tag: "CLASSIC / SHORT SLEEVE", price: 25000, sizes: ["M", "L"], colors: shadesFor("short_sleeve") },
            { id: "striped-henley", category: "henley", group: "classic", status: "soon", name: "D09 Striped Henley",
              tag: "COMING SOON", image: "stripped_henley.jpg", note: "A new striped Henley is on the way.", waitlist: "GET DROP UPDATES" },
            { id: "d09-signature-henley", category: "henley", group: "signature", status: "soon", name: "D09 Signature Henley — Long Sleeve",
              tag: "COMING SOON", image: "special_henley1.jpg", note: "The Signature Long Sleeve Henley is on the way.", waitlist: "GET DROP UPDATES" },
            { id: "d09-signature-henley-short-sleeve", category: "henley", group: "signature", status: "soon", name: "D09 Signature Henley — Short Sleeve",
              tag: "COMING SOON", image: "special_short2.jpg", note: "The Signature Short Sleeve Henley is on the way.", waitlist: "GET DROP UPDATES" },
            { id: "plain-trouser", category: "trousers", group: "trousers", status: "available", name: "D09 Plain Trouser",
              tag: "PLAIN TROUSER", price: 30000, sizes: trouserSizes, colors: plainTrouserColors,
              note: "Available in waist sizes 30, 32, 34 and 36." },
            { id: "pinstripe-trouser", category: "trousers", group: "trousers", status: "available", name: "D09 Pinstripe Trouser",
              tag: "PINSTRIPE TROUSER", price: 30000, sizes: trouserSizes, colors: stripedTrouserColors,
              note: "Available in waist sizes 30, 32, 34 and 36." },
            { id: "d09-collar-tees", category: "collar-tees", group: "collar-tees", status: "soon", name: "D09 Collar Tees",
              tag: "COMING SOON", image: "collar_tee.jpg", note: "A new Collar Tee collection is on the way.", waitlist: "GET DROP UPDATES" },
            { id: "d09-corporate-shirts", category: "corporate-shirts", group: "corporate-shirts", status: "soon", name: "D09 Corporate Shirts",
              tag: "COMING SOON", image: "cooprate_shirt.jpg", note: "The new Corporate Shirt collection is on the way.", waitlist: "GET DROP UPDATES" }
        ];
        const byId = Object.fromEntries(PRODUCTS.map(p => [p.id, p]));

        /* ---------- HELPERS ---------- */
        const $ = (sel, root = document) => root.querySelector(sel);
        const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

        const money = n => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n);
        const esc = v => String(v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

        function openWhatsAppUrl(message) {
            return "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(message);
        }
        function openWhatsApp(message) {
            window.open(openWhatsAppUrl(message), "_blank", "noopener,noreferrer");
        }

        /* ---------- STATE ---------- */
        let bag = loadBag();
        const selection = {}; // productId -> { color: index, size: 'M' }
        PRODUCTS.forEach(p => { if (p.status === "available" || p.status === "price-pending") selection[p.id] = { color: 0, size: p.sizes[0] }; });

        function loadBag() {
            try {
                const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
                if (!Array.isArray(raw)) return [];
                // Re-validate against catalog: never trust stored prices.
                return raw.filter(i => {
                    const p = byId[i.id];
                    return p && p.status === "available" &&
                        p.colors.some(c => c.name === i.color && c.status !== "soon") &&
                        p.sizes.includes(i.size) &&
                        Number.isInteger(i.quantity) && i.quantity > 0;
                }).map(i => ({ id: i.id, color: i.color, size: i.size, quantity: Math.min(i.quantity, MAX_QTY) }));
            } catch { return []; }
        }
        function saveBag() {
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(bag)); } catch { /* private mode */ }
        }

        const lineTotal = i => byId[i.id].price * i.quantity;
        const bagTotal = () => bag.reduce((s, i) => s + lineTotal(i), 0);
        const bagCount = () => bag.reduce((s, i) => s + i.quantity, 0);

        function orderLines() {
            return bag.map(i => `${byId[i.id].name} | Color: ${i.color} | Size: ${i.size} | Qty: ${i.quantity} | ${money(lineTotal(i))}`);
        }

        /* ---------- PRODUCT RENDERING ---------- */
        function imgTag(src, alt, fit = "cover") {
            return `<img src="${esc(src)}" alt="${esc(alt)}" class="product-image" style="object-fit:${fit}" loading="lazy" width="600" height="800" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}'">`;
        }

        function renderProduct(p) {
            if (p.status === "soldout") {
                return `
                <article class="product-card sold-out" data-category="${p.category}">
                    <div class="image-container">${imgTag(p.image, p.name + " (sold out)")}<div class="sold-out-badge">SOLD OUT</div></div>
                    <span class="tag tag-sold-out">${esc(p.tag)}</span>
                    <div class="product-meta-header">
                        <h3 class="product-title">${esc(p.name)}</h3>
                        <span class="price price-struck">${money(p.price)}</span>
                    </div>
                    <button type="button" class="notify-button" data-action="notify" data-name="${esc(p.name)}">${esc(p.waitlist)}</button>
                </article>`;
            }

            if (p.status === "price-pending") {
                const sel = selection[p.id];
                const single = p.colors.length === 1;
                return `
                <article class="product-card price-pending-card coming-soon-card" data-category="${p.category}" data-id="${p.id}">
                    <div class="image-container">${imgTag(p.colors[0].img, `${p.name} in ${p.colors[0].name}`)}<div class="coming-soon-badge">PRICE TBC</div></div>
                    <span class="tag tag-soon">${esc(p.tag)}</span>
                    <div class="product-meta-header">
                        <h3 class="product-title">${esc(p.name)}</h3>
                        <span class="price price-muted">PRICE TBC</span>
                    </div>
                    <p class="product-note">${esc(p.note)}</p>
                    <div class="selection-panel">
                        <div class="option-row">
                            <span class="option-label">Color: <b class="current-color">${esc(p.colors[0].name)}</b></span>
                            <div class="color-swatches" role="group" aria-label="${esc(p.name)} color">
                                ${p.colors.map((c, idx) => `<button type="button" class="swatch" data-action="color" data-index="${idx}" style="background:${c.hex}" aria-label="${esc(c.name)}" title="${esc(c.name)}" aria-pressed="${idx === sel.color}" ${single ? "disabled" : ""}></button>`).join("")}
                            </div>
                        </div>
                        <div class="option-row">
                            <span class="option-label">Waist: <b class="current-size">${esc(sel.size)}</b></span>
                            <div class="size-pills" role="group" aria-label="Waist size">
                                ${p.sizes.map(size => `<button type="button" class="size-pill" data-action="size" data-size="${size}" aria-pressed="${size === sel.size}">${size}</button>`).join("")}
                            </div>
                        </div>
                    </div>
                    <button type="button" class="notify-button" data-action="notify" data-name="${esc(p.name)}">${esc(p.waitlist)}</button>
                </article>`;
            }

            if (p.status === "soon") {
                return `
                <article class="product-card coming-soon-card is-preview-blurred" data-category="${p.category}">
                    <div class="image-container${p.images ? " has-image-pair" : ""}">${p.images
                        ? `<div class="coming-soon-image-pair">${p.images.map((image, index) => imgTag(image, `${p.name} preview ${index + 1} — coming soon`)).join("")}</div>`
                        : imgTag(p.image, p.name + " — coming soon")}<div class="coming-soon-badge">COMING SOON</div></div>
                    <span class="tag tag-soon">${esc(p.tag)}</span>
                    <div class="product-meta-header">
                        <h3 class="product-title">${esc(p.name)}</h3>
                        <span class="price price-muted">PREVIEW</span>
                    </div>
                    <p class="product-note">${esc(p.note)}</p>
                    <button type="button" class="notify-button" data-action="notify" data-name="${esc(p.notifyName || p.name)}">${esc(p.waitlist)}</button>
                </article>`;
            }

            const sel = selection[p.id];
            const single = p.colors.length === 1;
            return `
            <article class="product-card is-available" data-category="${p.category}" data-id="${p.id}">
                <div class="image-container${p.colors[0].status === "soon" ? " color-preview-coming-soon" : ""}">${imgTag(p.colors[0].img, `${p.name} in ${p.colors[0].name}${p.colors[0].status === "soon" ? " — coming soon" : ""}`, p.colors[0].fit || "cover")}</div>
                <span class="tag">${esc(p.tag)}</span>
                <div class="product-meta-header">
                    <h3 class="product-title">${esc(p.name)}</h3>
                    <span class="price">${money(p.price)}</span>
                </div>

                <div class="selection-panel">
                    <div class="option-row">
                        <span class="option-label">Color: <b class="current-color">${esc(p.colors[0].name)}</b></span>
                        <div class="color-swatches" role="group" aria-label="Color">
                            ${p.colors.map((c, idx) => `
                                <button type="button" class="swatch" data-action="color" data-index="${idx}"
                                    style="background:${c.hex}" aria-label="${esc(c.name)}${c.status === "soon" ? " — coming soon" : ""}" title="${esc(c.name)}${c.status === "soon" ? " — coming soon" : ""}"
                                    aria-pressed="${idx === sel.color}" ${single ? "disabled" : ""}></button>`).join("")}
                        </div>
                    </div>
                    <div class="option-row">
                        <span class="option-label">Size: <b class="current-size">${esc(sel.size)}</b></span>
                        <div class="size-pills" role="group" aria-label="Size">
                            ${p.sizes.map(s => `<button type="button" class="size-pill" data-action="size" data-size="${s}" aria-pressed="${s === sel.size}">${s}</button>`).join("")}
                        </div>
                    </div>
                </div>

                <button type="button" class="add-to-bag-btn" data-action="add">ADD TO BAG</button>
            </article>`;
        }

        // Hold preloaded images and decode them before a shopper picks another color.
        const preloadedColorImages = new Map();
        function preloadAvailableColorImages() {
            const sources = [...new Set(PRODUCTS
                .filter(product => product.status === "available")
                .flatMap(product => product.colors.map(color => color.img))
                .filter(Boolean))];
            const preload = () => {
                for (const src of sources) {
                    if (preloadedColorImages.has(src)) continue;
                    const image = new Image();
                    image.decoding = "async";
                    image.fetchPriority = "auto";
                    preloadedColorImages.set(src, image);
                    image.src = src;
                    if (typeof image.decode === "function") image.decode().catch(() => {});
                }
            };
            if ("requestIdleCallback" in window) window.requestIdleCallback(preload, { timeout: 1800 });
            else window.setTimeout(preload, 250);
        }

        function renderProducts() {
            const groups = [
                { id: "classic", category: "henley", title: "CLASSIC HENLEYS", note: "Choose long sleeve or short sleeve. Each style has the same easy-to-shop color and size options." },
                { id: "signature", category: "henley", title: "SIGNATURE HENLEYS", note: "The signature fit is available in long sleeve and short sleeve, in Brown or Navy Blue." },
                { id: "trousers", category: "trousers", title: "CORPORATE TROUSERS", note: "Plain and pinstripe styles from ₦30,000. Plain colors: Black, Grey, Navy Blue, and White. Pinstripe colors: Navy Blue, Grey, and White. Waist sizes 30, 32, 34 and 36." },
                { id: "collar-tees", category: "collar-tees", title: "COLLAR TEES", note: "A new Collar Tee collection is on the way. Sign up for updates when it arrives." },
                { id: "corporate-shirts", category: "corporate-shirts", title: "CORPORATE SHIRTS", note: "A new Corporate Shirt collection is on the way. Sign up for updates when it arrives." }
            ];
            $("#productSections").innerHTML = groups.map(group => `
                <section class="product-group" data-group="${group.id}" data-category="${group.category}" aria-label="${group.title}">
                    <div class="product-group-heading"><h3>${group.title}</h3><p>${group.note}</p></div>
                    <div class="product-grid">${PRODUCTS.filter(p => p.group === group.id).map(renderProduct).join("")}</div>
                </section>`).join("");
        }

        function setColor(card, p, index) {
            const color = p.colors[index];
            if (!color) return;
            selection[p.id].color = index;
            $$(".swatch", card).forEach((b, i) => b.setAttribute("aria-pressed", String(i === index)));
            $(".current-color", card).textContent = color.name;

            const image = $(".product-image", card);
            const imageContainer = image.closest(".image-container");
            const addButton = $(".add-to-bag-btn", card);
            const comingSoon = color.status === "soon";
            imageContainer.classList.toggle("color-preview-coming-soon", comingSoon);
            image.style.objectFit = color.fit || "cover";
            image.style.objectPosition = color.position || "center center";
            image.alt = `${p.name} in ${color.name}${comingSoon ? " — coming soon" : ""}`;
            if (addButton) {
                addButton.disabled = comingSoon;
                addButton.textContent = comingSoon ? "COMING SOON" : "ADD TO BAG";
            }
            // Swap immediately; browser cache is warmed for available variants during idle time.
            image.src = color.img;
        }

        function setSize(card, p, size) {
            selection[p.id].size = size;
            $$(".size-pill", card).forEach(b => b.setAttribute("aria-pressed", String(b.dataset.size === size)));
            $(".current-size", card).textContent = size;
        }

        function onGridClick(e) {
            const btn = e.target.closest("[data-action]");
            if (!btn) return;
            const action = btn.dataset.action;

            if (action === "notify") {
                openWhatsApp(`Hello District 09. Please notify me when ${btn.dataset.name} is available.`);
                return;
            }

            const card = btn.closest(".product-card");
            const p = card && byId[card.dataset.id];
            if (!p) return;

            if (action === "color") setColor(card, p, Number(btn.dataset.index));
            else if (action === "size") setSize(card, p, btn.dataset.size);
            else if (action === "add") {
                const s = selection[p.id];
                if (p.colors[s.color]?.status === "soon") return;
                addItem(p.id, p.colors[s.color].name, s.size);
                const original = "ADD TO BAG";
                btn.textContent = "ADDED ✓";
                btn.classList.add("added");
                clearTimeout(btn._t);
                btn._t = setTimeout(() => { btn.textContent = original; btn.classList.remove("added"); }, 1200);
            }
        }

        /* ---------- FILTERS ---------- */
        function filterCategory(category) {
            let shown = 0;
            $$(".product-card").forEach(card => {
                const match = category === "all" || card.dataset.category === category;
                card.hidden = !match;
                if (match) shown++;
            });
            $$(".product-group").forEach(group => {
                group.hidden = category !== "all" && group.dataset.category !== category;
            });
            $$(".filter-btn").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.filter === category)));
            const status = $("#filterStatus");
            if (status) status.textContent = `${shown} product${shown === 1 ? "" : "s"} shown`;
        }

        /* ---------- BAG ---------- */
        function addItem(id, color, size) {
            const existing = bag.find(i => i.id === id && i.color === color && i.size === size);
            if (existing) existing.quantity = Math.min(existing.quantity + 1, MAX_QTY);
            else bag.push({ id, color, size, quantity: 1 });
            renderCart();
            const badge = $("#cartBadge");
            badge.classList.remove("bump");
            void badge.offsetWidth;
            badge.classList.add("bump");
        }

        function changeQuantity(index, delta) {
            const item = bag[index];
            if (!item) return;
            item.quantity = Math.min(item.quantity + delta, MAX_QTY);
            if (item.quantity <= 0) bag.splice(index, 1);
            renderCart();
        }

        function removeItem(index) {
            bag.splice(index, 1);
            renderCart();
        }

        function renderCart() {
            saveBag();
            const empty = bag.length === 0;
            const count = bagCount();
            $("#cartCount").textContent = count;
            $("#cartCount").hidden = count === 0;
            $("#cartBadge").setAttribute("aria-label", `Bag, ${count} item${count === 1 ? "" : "s"}`);
            $("#cartTotal").textContent = money(bagTotal());
            $("#cartCheckoutBtn").disabled = empty;
            $("#cartWhatsAppBtn").disabled = empty;

            $("#cartItems").innerHTML = empty
                ? '<p class="cart-empty">Your bag is currently empty.</p>'
                : bag.map((item, idx) => {
                    const p = byId[item.id];
                    return `
                    <div class="cart-item">
                        <div class="cart-item-details">
                            <strong>${esc(p.name)}</strong>
                            <p>Shade: ${esc(item.color)} | Size: ${esc(item.size)}</p>
                            <p>${money(p.price)} each</p>
                            <div class="cart-item-actions">
                                <button type="button" data-cart="dec" data-index="${idx}" aria-label="Decrease quantity of ${esc(p.name)}">−</button>
                                <span aria-label="Quantity">${item.quantity}</span>
                                <button type="button" data-cart="inc" data-index="${idx}" aria-label="Increase quantity of ${esc(p.name)}" ${item.quantity >= MAX_QTY ? "disabled" : ""}>+</button>
                                <button type="button" class="remove-item" data-cart="remove" data-index="${idx}">Remove</button>
                            </div>
                        </div>
                        <strong>${money(lineTotal(item))}</strong>
                    </div>`;
                }).join("");

            // checkout summary
            $("#checkoutItems").innerHTML = empty
                ? "<p>Your bag is empty.</p>"
                : bag.map(i => `<p>${esc(byId[i.id].name)} — ${esc(i.color)}, Size ${esc(i.size)}, Qty ${i.quantity} — ${money(lineTotal(i))}</p>`).join("");
            updateCheckoutTotals();
        }

        /* ---------- DELIVERY FEE ---------- */
        function selectedState() {
            const el = $("#customerState");
            return el ? el.value : "";
        }
        function deliveryFee() {
            const state = selectedState();
            return Object.prototype.hasOwnProperty.call(DELIVERY_FEES, state) ? DELIVERY_FEES[state] : null;
        }
        function updateCheckoutTotals() {
            if (!$("#checkoutTotal")) return;
            const fee = deliveryFee();
            const products = bagTotal();
            $("#checkoutProductTotal").textContent = money(products);
            $("#checkoutDeliveryLabel").textContent = fee === null ? "Delivery fee" : `Delivery to ${selectedState()}`;
            $("#checkoutDeliveryFee").textContent = fee === null ? "Choose your state" : money(fee);
            $("#checkoutTotalLabel").textContent = fee === null ? "Total (before delivery)" : "Total to pay";
            $("#checkoutTotal").textContent = money(products + (fee || 0));
        }

        function checkoutWhatsApp() {
            if (!bag.length) return;
            const state = selectedState();
            const fee = deliveryFee();
            const lines = [
                "Hello District 09, I would like to place an order.",
                "",
                ...orderLines().map(l => "- " + l),
                "",
                `Product total: ${money(bagTotal())}`
            ];
            if (fee !== null) {
                lines.push(`Delivery to ${state}: ${money(fee)}`, `Total with delivery: ${money(bagTotal() + fee)}`);
                lines.push("Please confirm availability and payment details.");
            } else {
                lines.push("Please confirm availability, delivery fee, and payment details.");
            }
            openWhatsApp(lines.join("\n"));
        }

        /* ---------- MODALS (focus trap + restore) ---------- */
        const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not(.honeypot), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
        const modalStack = [];

        function openModal(id) {
            const modal = document.getElementById(id);
            if (!modal || modal.classList.contains("open")) return;
            modal.dataset.returnFocus = "1";
            modal._opener = document.activeElement;
            modal.classList.add("open");
            document.body.classList.add("modal-open");
            modalStack.push(modal);
            const target = $(FOCUSABLE, $(".modal-card", modal));
            if (target) target.focus();
        }

        function closeModal(modal) {
            if (!modal || !modal.classList.contains("open")) return;
            modal.classList.remove("open");
            const i = modalStack.indexOf(modal);
            if (i > -1) modalStack.splice(i, 1);
            if (!modalStack.length) document.body.classList.remove("modal-open");
            if (modal._opener && document.contains(modal._opener)) modal._opener.focus();
        }

        function swapModal(fromId, toId) {
            const from = document.getElementById(fromId);
            const opener = from._opener;
            closeModal(from);
            openModal(toId);
            document.getElementById(toId)._opener = opener;
        }

        document.addEventListener("keydown", e => {
            const top = modalStack[modalStack.length - 1];
            if (!top) return;
            if (e.key === "Escape") { closeModal(top); return; }
            if (e.key === "Tab") {
                const items = $$(FOCUSABLE, top).filter(el => el.offsetParent !== null);
                if (!items.length) return;
                const first = items[0], last = items[items.length - 1];
                if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
                else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
        });

        /* ---------- EMAIL (Web3Forms) ---------- */
        async function sendEmailForm(data) {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 15000);
            try {
                const res = await fetch(FORM_ENDPOINT, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "Accept": "application/json" },
                    body: JSON.stringify({
                        access_key: WEB3FORMS_KEY,
                        from_name: "District 09 Website",
                        subject: data._subject || "New District 09 message",
                        ...Object.fromEntries(Object.entries(data).filter(([k]) => k !== "_subject"))
                    }),
                    signal: controller.signal
                });
                let result = {};
                try { result = await res.json(); } catch { /* non-JSON */ }
                if (!res.ok || result.success === false || result.success === "false") {
                    throw new Error(result.message || "Submission failed");
                }
                return result;
            } finally {
                clearTimeout(timer);
            }
        }

        function makeOrderRef() {
            return "D09-" + Date.now().toString(36).toUpperCase().slice(-6);
        }

        /* ---------- CHECKOUT / PAYSTACK ---------- */
        async function updatePaymentModeNotice() {
            const note = $("#paymentModeNotice");
            try {
                const res = await fetch("/api/paystack/status", { headers: { "Accept": "application/json" } });
                const info = await res.json();
                if (!res.ok || !info.configured) {
                    note.textContent = "Online payment is temporarily unavailable. You can still send your order through WhatsApp.";
                    note.classList.add("live");
                    return;
                }
                if (info.mode === "test") {
                    note.textContent = "Paystack TEST MODE — no real money will be charged while the store is being tested.";
                    note.classList.remove("live");
                } else if (window.location.hostname.endsWith(".manus.computer")) {
                    note.textContent = "A Paystack LIVE key is configured, but live payments are disabled in Preview. Checkout will only work on the published store after approval.";
                    note.classList.add("live");
                    $("#checkoutSubmit").disabled = true;
                    $("#checkoutSubmit").textContent = "LIVE PAYMENTS DISABLED IN PREVIEW";
                } else {
                    note.textContent = "Paystack LIVE MODE — completing checkout processes a real payment to the store.";
                    note.classList.add("live");
                }
            } catch {
                note.textContent = "Secure Paystack checkout is being checked. If it is unavailable, order via WhatsApp.";
            }
        }

        function showCheckoutForm() {
            $("#checkoutFormView").hidden = false;
            $("#checkoutSuccessView").hidden = true;
            const msg = $("#checkoutMessage");
            msg.textContent = "";
            msg.classList.remove("error");
        }

        function showPaymentResult(title, message, reference, whatsappMessage, options = {}) {
            $("#checkoutFormView").hidden = true;
            $("#checkoutSuccessView").hidden = false;
            $("#successEyebrow").textContent = options.eyebrow || "PAYMENT UPDATE";
            $("#successTitle").textContent = title;
            $("#successMessage").textContent = message;
            $("#successRef").textContent = reference ? "Reference: " + reference : "";
            const whatsapp = $("#successWhatsApp");
            whatsapp.hidden = !whatsappMessage;
            if (whatsappMessage) whatsapp.href = openWhatsAppUrl(whatsappMessage);
            const track = $("#successTrack");
            if (track) {
                track.hidden = !(reference && options.track);
                if (reference) track.href = "track.html?reference=" + encodeURIComponent(reference);
            }
            if (!$("#checkoutModal").classList.contains("open")) openModal("checkoutModal");
            $("#successTitle").focus();
        }

        async function handlePaymentReturn() {
            const params = new URLSearchParams(window.location.search);
            const reference = params.get("reference");
            const paymentState = params.get("payment");
            if (!reference && paymentState !== "cancelled") return;

            window.history.replaceState({}, "", window.location.pathname + window.location.hash);
            if (!reference) {
                showPaymentResult("CHECKOUT CANCELLED", "You left Paystack checkout before payment. No payment has been confirmed and your bag is still saved.", "", "Hello District 09, I left Paystack checkout and would like help placing my order.", { eyebrow: "NO PAYMENT TAKEN" });
                return;
            }

            showPaymentResult("CHECKING PAYMENT…", "We are confirming the transaction directly with Paystack. Please do not retry payment while this check is in progress.", reference, "Hello District 09, please help me check payment reference " + reference + ".");
            try {
                const res = await fetch("/api/paystack/verify?reference=" + encodeURIComponent(reference), { headers: { "Accept": "application/json" } });
                let result = {};
                try { result = await res.json(); } catch { /* handled as an unconfirmed result */ }
                if (!res.ok && result.status !== "mismatch") throw new Error(result.error || "Payment verification is unavailable.");

                if (result.status === "success") {
                    bag = [];
                    renderCart();
                    $("#checkoutForm").reset();
                    const emailMessage = result.order_email_sent
                        ? "Your payment is verified by Paystack, and your order details have been emailed to the store. Your delivery fee was included in your payment. You can track this order any time."
                        : "Your payment is verified by Paystack. Your delivery fee was included in your payment. You can track this order any time, and the store email alert may be delayed, so use WhatsApp below if you need assistance.";
                    showPaymentResult("PAYMENT CONFIRMED", emailMessage, reference,
                        "Hello District 09, my payment is confirmed. Please confirm availability and delivery for reference " + reference + ".",
                        { eyebrow: "ORDER PAID", track: true });
                } else if (result.status === "failed" || paymentState === "cancelled") {
                    showPaymentResult("PAYMENT NOT COMPLETED", "Paystack did not confirm a successful payment. Your bag is still saved. If your bank shows a debit, contact us before trying again.", reference,
                        "Hello District 09, my payment was not completed or needs checking. Reference: " + reference + ".",
                        { eyebrow: "NO SUCCESSFUL PAYMENT CONFIRMED" });
                } else if (result.status === "mismatch") {
                    showPaymentResult("PAYMENT NEEDS REVIEW", result.error || "The payment amount did not match the order. Please contact the store before retrying.", reference,
                        "Hello District 09, please check my payment and order. Reference: " + reference + ".",
                        { eyebrow: "PLEASE CONTACT THE STORE" });
                } else {
                    showPaymentResult("PAYMENT PROCESSING", "Paystack has not confirmed the final result yet. Your bag is saved. Please check your Paystack receipt or contact us before retrying.", reference,
                        "Hello District 09, please check the status of my payment. Reference: " + reference + ".",
                        { eyebrow: "AWAITING PAYSTACK CONFIRMATION", track: true });
                }
            } catch (error) {
                showPaymentResult("PAYMENT STATUS UNCONFIRMED", error.message + " If your bank shows a debit, do not retry until the store checks the reference.", reference,
                    "Hello District 09, please verify my Paystack payment. Reference: " + reference + ".",
                    { eyebrow: "PLEASE CHECK BEFORE RETRYING" });
            }
        }

        async function submitOrder(e) {
            e.preventDefault();
            if (!bag.length) return;

            const form = e.currentTarget;
            const btn = $("#checkoutSubmit");
            const msg = $("#checkoutMessage");
            const fd = new FormData(form);
            if (fd.get("_honey")) return;

            const customer = {
                name: String(fd.get("name") || "").trim(),
                email: String(fd.get("email") || "").trim(),
                phone: String(fd.get("phone") || "").trim(),
                state: String(fd.get("state") || "").trim(),
                city: String(fd.get("city") || "").trim(),
                address: String(fd.get("address") || "").trim(),
                note: String(fd.get("order_note") || "").trim() || "None"
            };
            const checkoutItems = bag.map(item => ({
                id: item.id, color: item.color, size: item.size, quantity: item.quantity
            }));
            const lines = orderLines();
            const total = bagTotal();

            if (!Object.prototype.hasOwnProperty.call(DELIVERY_FEES, customer.state)) {
                msg.classList.add("error");
                msg.textContent = "Please choose your delivery state so we can add the delivery fee.";
                $("#customerState").focus();
                return;
            }
            const fee = DELIVERY_FEES[customer.state];

            btn.disabled = true;
            btn.textContent = "OPENING PAYSTACK...";
            msg.classList.remove("error");
            msg.textContent = "Creating your secure payment session...";

            try {
                const initResponse = await fetch("/api/paystack/initialize", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "Accept": "application/json" },
                    body: JSON.stringify({ customer, items: checkoutItems })
                });
                let payment = {};
                try { payment = await initResponse.json(); } catch { /* handled below */ }
                if (!initResponse.ok || !payment.authorization_url || !payment.reference) {
                    throw new Error(payment.error || "Paystack could not start checkout. Please order via WhatsApp.");
                }

                // Email an order-intent notification before redirecting. Successful payment
                // is separately verified server-side and triggers a paid-order email.
                try {
                    await sendEmailForm({
                        _subject: `District 09 Order Awaiting Paystack Payment ${payment.reference}`,
                        order_reference: payment.reference,
                        payment_status: "Awaiting payment — not yet confirmed as paid",
                        customer_name: customer.name,
                        customer_email: customer.email,
                        customer_phone: customer.phone,
                        delivery_state: customer.state,
                        delivery_city_state: `${customer.city}, ${customer.state}`,
                        delivery_address: customer.address,
                        customer_notes: customer.note,
                        order_items: lines.join("\n"),
                        product_total: money(total),
                        delivery_fee: money(fee),
                        total_to_pay: money(total + fee),
                        paystack_mode: payment.mode
                    });
                } catch {
                    // Do not block checkout; a verified payment still triggers a server-side order email.
                }
                try { localStorage.setItem(LAST_ORDER_KEY, payment.reference); } catch { /* private mode */ }
                window.location.assign(payment.authorization_url);
            } catch (error) {
                msg.classList.add("error");
                msg.textContent = error.message || "We couldn't start checkout. Please try again or order via WhatsApp.";
            } finally {
                btn.disabled = false;
                btn.textContent = "CONTINUE TO PAYSTACK";
            }
        }

        /* ---------- NEWSLETTER ---------- */
        async function subscribe(e) {
            e.preventDefault();
            const form = e.currentTarget;
            const input = form.elements.email;
            const msg = $("#newsletterMessage");
            const btn = $("#newsletterSubmit");

            msg.className = "newsletter-message";
            if (form.elements._honey.value) return;
            if (!input.checkValidity()) {
                msg.classList.add("error");
                msg.textContent = "Please enter a valid email address.";
                input.focus();
                return;
            }

            btn.disabled = true;
            btn.textContent = "SUBMITTING...";
            try {
                await sendEmailForm({
                    _subject: "New District 09 Newsletter Signup",
                    signup_email: input.value.trim(),
                    signup_date: new Date().toLocaleString("en-NG")
                });
                msg.classList.add("ok");
                msg.textContent = "Welcome to the District 09 inner circle.";
                form.reset();
            } catch {
                msg.classList.add("error");
                msg.textContent = "Signup failed. Please try again.";
            } finally {
                btn.disabled = false;
                btn.textContent = "GET UPDATES";
            }
        }

        /* ---------- SHARED PAGE PARTS (header, footer, pop-ups) ---------- */
        function injectChrome() {
            const announcement = document.createElement("div");
            announcement.className = "announcement";
            announcement.innerHTML = "DISTRICT 09 &mdash; CURATED WARDROBE";

            const header = document.createElement("header");
            header.innerHTML = `
                <nav aria-label="Main">
                    <a href="index.html" class="logo">DISTRICT 09 <span>COLLECTION</span></a>

                    <div class="nav-actions">
                        <button type="button" class="bag" id="cartBadge" data-open="cartModal" aria-haspopup="dialog" aria-label="Bag, 0 items">
                            <svg class="bag-icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 8h14l-1.2 12H6.2L5 8z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/></svg>
                            <span class="bag-count" id="cartCount" aria-hidden="true">0</span>
                        </button>
                        <button type="button" class="menu-button" id="menuButton" aria-expanded="false" aria-controls="siteMenu" aria-label="Open menu">
                            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
                        </button>
                    </div>
                </nav>`;

            // The menu sits outside <header> (its blur effect would otherwise trap a fixed panel).
            const menuLayer = document.createElement("div");
            menuLayer.innerHTML = `
                <div class="site-menu-backdrop" id="menuBackdrop" hidden></div>
                <aside class="site-menu" id="siteMenu" aria-label="Menu" aria-hidden="true">
                    <div class="site-menu-head">
                        <span>MENU</span>
                        <button type="button" class="site-menu-close" id="menuClose" aria-label="Close menu">&times;</button>
                    </div>
                    <ul>
                        <li><a href="index.html">HOME</a></li>
                        <li><a href="shop.html">SHOP ALL</a></li>
                        <li><button type="button" data-open="sizeGuideModal" aria-haspopup="dialog">SIZE GUIDE</button></li>
                        <li><button type="button" data-open="contactModal" aria-haspopup="dialog">CONTACT US</button></li>
                        <li><a href="shipping.html">SHIPPING &amp; RETURNS</a></li>
                    </ul>
                </aside>`;


            const footer = document.createElement("footer");
            footer.innerHTML = `
                <div class="footer-content">
                    <a href="index.html" class="logo">DISTRICT 09 <span>COLLECTION</span></a>
                    <p>&copy; <span id="year">2026</span> DISTRICT 09 COLLECTION. Built for the modern wardrobe.</p>
                    <div class="footer-links">
                        <a href="shop.html">SHOP</a>
                        <button type="button" data-open="sizeGuideModal">SIZE GUIDE</button>
                        <a href="index.html#about">ABOUT</a>
                        <a href="shipping.html">SHIPPING &amp; RETURNS</a>
                        <a href="track.html">TRACK ORDER</a>
                        <a href="mailto:bydistrict09@gmail.com">EMAIL</a>
                        <a href="#">TOP &uarr;</a>
                    </div>
                </div>
                <div class="footer-contact">
                    <div>
                        <h4>PHONE / WHATSAPP</h4>
                        <a href="tel:+2349139656964">09139656964</a>
                    </div>
                    <div>
                        <h4>ADDRESS</h4>
                        <p>Lokoja, Kogi State<br>Abuja, FCT</p>
                    </div>
                    <div>
                        <h4>EMAIL</h4>
                        <a href="mailto:bydistrict09@gmail.com">bydistrict09@gmail.com</a>
                    </div>
                    <div>
                        <h4>FOLLOW US</h4>
                        <a href="https://www.instagram.com/district092026" target="_blank" rel="noopener noreferrer">Instagram</a><br>
                        <a href="https://www.tiktok.com/@keepfashnweird" target="_blank" rel="noopener noreferrer">TikTok</a>
                    </div>
                </div>`;

            const headerSlot = $("#siteHeader");
            if (headerSlot) headerSlot.replaceWith(announcement, header, menuLayer);
            const footerSlot = $("#siteFooter");
            if (footerSlot) footerSlot.replaceWith(footer);
        }

        const HENLEY_SIZES = [
            { size: "M", chest: '38"–40"', shoulder: '17.5"', length: '28"' },
            { size: "L", chest: '41"–44"', shoulder: '18.5"', length: '29.5"' }
        ];

        function injectModals() {
            if (document.getElementById("cartModal")) return;
            const stateOptions = DELIVERY_STATES
                .map(s => `<option value="${esc(s)}">${esc(s)} — ${money(DELIVERY_FEES[s])}</option>`)
                .join("");

            const root = document.createElement("div");
            root.id = "modalRoot";
            root.innerHTML = `
    <!-- CONTACT US -->
    <div class="modal-overlay" id="contactModal" role="dialog" aria-modal="true" aria-labelledby="contactTitle">
        <div class="modal-card">
            <button type="button" class="modal-close" data-close aria-label="Close contact options">&times;</button>
            <h2 id="contactTitle">CONTACT US</h2>
            <p class="modal-note">Choose how you would like to reach District 09.</p>
            <div class="contact-options">
                <a class="button button-secondary button-block" href="mailto:bydistrict09@gmail.com">EMAIL</a>
                <a class="button button-secondary button-block" href="https://wa.me/${WHATSAPP_NUMBER}" target="_blank" rel="noopener noreferrer">WHATSAPP</a>
                <a class="button button-secondary button-block" href="https://www.instagram.com/district092026" target="_blank" rel="noopener noreferrer">INSTAGRAM</a>
                <a class="button button-secondary button-block" href="https://www.tiktok.com/@keepfashnweird" target="_blank" rel="noopener noreferrer">TIKTOK</a>
            </div>
        </div>
    </div>

    <!-- SIZE GUIDE -->
    <div class="modal-overlay" id="sizeGuideModal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
        <div class="modal-card">
            <button type="button" class="modal-close" data-close aria-label="Close size guide">&times;</button>

            <p class="eyebrow">FIT & MEASUREMENTS</p>
            <h2 id="modalTitle">DISTRICT 09 SIZE GUIDE</h2>

            <div class="modal-note">
                <strong>Henley Sizing Notice:</strong> All District 09 Henleys are stocked in Medium (M) and Large (L).
            </div>

            <h3 class="modal-subhead">1. Henley Tops (M & L Only)</h3>
            <table class="size-table">
                <thead><tr><th scope="col">Size</th><th scope="col">Chest</th><th scope="col">Shoulder</th><th scope="col">Length</th></tr></thead>
                <tbody>
                    <tr><th scope="row">Medium (M)</th><td>38"–40"</td><td>17.5"</td><td>28"</td></tr>
                    <tr><th scope="row">Large (L)</th><td>41"–44"</td><td>18.5"</td><td>29.5"</td></tr>
                </tbody>
            </table>

            <h3 class="modal-subhead">2. Trousers (by waist size)</h3>
            <table class="size-table">
                <thead><tr><th scope="col">Waist Size</th><th scope="col">Waist</th><th scope="col">Hips</th><th scope="col">Inseam</th></tr></thead>
                <tbody>
                    <tr><th scope="row">30</th><td>30"</td><td>37"</td><td>32"</td></tr>
                    <tr><th scope="row">32</th><td>32"</td><td>39"</td><td>32"</td></tr>
                    <tr><th scope="row">34</th><td>34"</td><td>41"</td><td>32.5"</td></tr>
                    <tr><th scope="row">36</th><td>36"</td><td>43"</td><td>33"</td></tr>
                </tbody>
            </table>

            <button type="button" class="button button-block" data-close>GOT IT, CONTINUE SHOPPING</button>
        </div>
    </div>

    <!-- BAG -->
    <div class="modal-overlay" id="cartModal" role="dialog" aria-modal="true" aria-labelledby="cartTitle">
        <div class="modal-card">
            <button type="button" class="modal-close" data-close aria-label="Close shopping bag">&times;</button>

            <p class="eyebrow">DISTRICT 09 / YOUR SELECTION</p>
            <h2 id="cartTitle">YOUR BAG</h2>

            <div id="cartItems"></div>

            <div class="cart-total">
                <span>Subtotal</span>
                <span id="cartTotal">₦0</span>
            </div>
            <p class="cart-delivery-note">Delivery fee is added at checkout once you choose your state.</p>

            <button type="button" class="button button-block" id="cartCheckoutBtn">CHECK OUT ON WEBSITE</button>
            <button type="button" class="button button-secondary button-block" id="cartWhatsAppBtn">ORDER VIA WHATSAPP</button>
            <button type="button" class="button button-secondary button-block" data-close>CONTINUE SHOPPING</button>
        </div>
    </div>

    <!-- CHECKOUT -->
    <div class="modal-overlay" id="checkoutModal" role="dialog" aria-modal="true" aria-labelledby="checkoutTitle">
        <div class="modal-card">
            <button type="button" class="modal-close" data-close aria-label="Close checkout">&times;</button>

            <div id="checkoutFormView">
                <p class="eyebrow">DISTRICT 09 / CHECKOUT</p>
                <h2 id="checkoutTitle">YOUR ORDER DETAILS</h2>
                <p class="checkout-intro">Enter your delivery details and choose your state. Your delivery fee is added to the order summary below before you pay securely through Paystack.</p>
                <p class="checkout-payment-note" id="paymentModeNotice" aria-live="polite">Checking secure Paystack checkout…</p>

                <div class="checkout-summary">
                    <h3>ORDER SUMMARY</h3>
                    <div id="checkoutItems"></div>
                    <div class="checkout-summary-line">
                        <span>Product total</span>
                        <span id="checkoutProductTotal">₦0</span>
                    </div>
                    <div class="checkout-summary-line">
                        <span id="checkoutDeliveryLabel">Delivery fee</span>
                        <span id="checkoutDeliveryFee">Choose your state</span>
                    </div>
                    <div class="checkout-summary-total">
                        <span id="checkoutTotalLabel">Total (before delivery)</span>
                        <span id="checkoutTotal">₦0</span>
                    </div>
                </div>

                <form id="checkoutForm" class="checkout-form">
                    <div class="checkout-fields">
                        <div class="checkout-field">
                            <label for="customerName">FULL NAME *</label>
                            <input id="customerName" name="name" autocomplete="name" required>
                        </div>
                        <div class="checkout-field">
                            <label for="customerEmail">EMAIL ADDRESS *</label>
                            <input id="customerEmail" type="email" name="email" autocomplete="email" inputmode="email" required>
                        </div>
                        <div class="checkout-field">
                            <label for="customerPhone">PHONE NUMBER *</label>
                            <input id="customerPhone" type="tel" name="phone" autocomplete="tel" inputmode="tel" pattern="[+0-9\\s\\-\\(\\)]{7,20}" title="Enter a valid phone number" required>
                        </div>
                        <div class="checkout-field">
                            <label for="customerState">DELIVERY STATE *</label>
                            <select id="customerState" name="state" autocomplete="address-level1" required>
                                <option value="">Select your state</option>
                                ${stateOptions}
                            </select>
                        </div>
                        <div class="checkout-field full">
                            <label for="customerCity">CITY / TOWN *</label>
                            <input id="customerCity" name="city" placeholder="e.g. Lokoja" autocomplete="address-level2" required>
                        </div>
                        <div class="checkout-field full">
                            <label for="customerAddress">DELIVERY ADDRESS *</label>
                            <textarea id="customerAddress" name="address" autocomplete="street-address" required></textarea>
                        </div>
                        <div class="checkout-field full">
                            <label for="orderNote">ADDITIONAL NOTES (OPTIONAL)</label>
                            <textarea id="orderNote" name="order_note" placeholder="Delivery preferences or instructions"></textarea>
                        </div>
                        <input class="honeypot" type="text" name="_honey" tabindex="-1" autocomplete="off" aria-hidden="true">
                    </div>

                    <p class="checkout-message" id="checkoutMessage" aria-live="polite"></p>

                    <button class="button checkout-submit" type="submit" id="checkoutSubmit">CONTINUE TO PAYSTACK</button>
                    <button class="button button-secondary button-block" type="button" id="checkoutWhatsAppBtn">SEND ORDER THROUGH WHATSAPP INSTEAD</button>
                </form>
            </div>

            <div id="checkoutSuccessView" class="order-success" hidden>
                <p class="eyebrow" id="successEyebrow">PAYMENT UPDATE</p>
                <h2 id="successTitle" tabindex="-1">CHECKING PAYMENT…</h2>
                <div class="order-ref" id="successRef"></div>
                <p id="successMessage" aria-live="polite">We are checking your payment directly with Paystack.</p>
                <a class="button button-block" id="successTrack" hidden>TRACK THIS ORDER</a>
                <a class="button button-secondary button-block" id="successWhatsApp" target="_blank" rel="noopener noreferrer" hidden>ASK ABOUT THIS ORDER ON WHATSAPP</a>
                <button type="button" class="button button-secondary button-block" data-close>CONTINUE SHOPPING</button>
            </div>
        </div>
    </div>`;
            document.body.appendChild(root);
        }

        /* ---------- SHIPPING & RETURNS ---------- */
        function shippingHtml() {
            const rows = DELIVERY_STATES
                .map(s => `<tr><th scope="row">${esc(s)}</th><td>${money(DELIVERY_FEES[s])}</td></tr>`)
                .join("");
            const returnMessage = "Hello District 09, I would like to return an item. My order reference is: ";
            return `
            <div class="shipping-inner">
                <p class="eyebrow">DISTRICT 09 / DELIVERY</p>
                <h2>SHIPPING &amp; RETURNS</h2>
                <div class="shipping-grid">
                    <div class="shipping-card">
                        <h3>DELIVERY</h3>
                        <p>We deliver to every state in Nigeria. Your delivery fee depends on your state. Choose your state at checkout and the fee is added to your order summary before you pay.</p>
                        <details class="fee-details">
                            <summary>SEE DELIVERY FEES BY STATE</summary>
                            <table class="size-table fee-table">
                                <thead><tr><th scope="col">State / Destination</th><th scope="col">Delivery fee</th></tr></thead>
                                <tbody>${rows}</tbody>
                            </table>
                        </details>
                    </div>
                    <div class="shipping-card">
                        <h3>RETURNS</h3>
                        <p>Received the wrong size? You can return the item within 7 days of receiving it, as long as it is unworn, unwashed and in its original condition. The return shipping fee is paid by the customer.</p>
                        <p>To start a return, message us on WhatsApp or email us with your order reference.</p>
                        <div class="shipping-actions">
                            <a class="button button-secondary" href="${openWhatsAppUrl(returnMessage)}" target="_blank" rel="noopener noreferrer">START A RETURN ON WHATSAPP</a>
                            <a class="button button-secondary" href="mailto:bydistrict09@gmail.com?subject=${encodeURIComponent("Return request")}">EMAIL US</a>
                        </div>
                    </div>
                </div>
            </div>`;
        }
        function renderShippingSections() {
            $$("[data-shipping]").forEach(el => { el.innerHTML = shippingHtml(); });
        }

        /* ---------- SHOP ALL PAGE (one section per product) ---------- */
        function sizeInfoHtml(p) {
            if (p.category === "henley") {
                return `
                <table class="size-table shop-size-table">
                    <caption class="visually-hidden">Size measurements for ${esc(p.name)}</caption>
                    <thead><tr><th scope="col">Size</th><th scope="col">Chest</th><th scope="col">Shoulder</th><th scope="col">Length</th></tr></thead>
                    <tbody>${HENLEY_SIZES.map(r => `<tr><th scope="row">${r.size}</th><td>${r.chest}</td><td>${r.shoulder}</td><td>${r.length}</td></tr>`).join("")}</tbody>
                </table>`;
            }
            return `<p class="product-note">Available in ${p.category === "trousers" ? "waist " : ""}sizes ${esc(p.sizes.join(", "))}. Open the size guide for full measurements.</p>`;
        }

        function renderShopProduct(p) {
            if (p.status !== "available") {
                const image = p.image || (p.images && p.images[0]) || (p.colors && p.colors[0].img);
                return `
                <article class="shop-product product-card coming-soon-card is-preview-blurred" id="${p.id}" data-category="${p.category}" aria-label="${esc(p.name)}">
                    <div class="shop-product-media">
                        <div class="image-container">${imgTag(image, p.name + " — coming soon")}<div class="coming-soon-badge">COMING SOON</div></div>
                    </div>
                    <div class="shop-product-info">
                        <span class="tag tag-soon">${esc(p.tag)}</span>
                        <h2 class="shop-product-title">${esc(p.name)}</h2>
                        <p class="product-note">${esc(p.note || "")}</p>
                        <button type="button" class="notify-button" data-action="notify" data-name="${esc(p.notifyName || p.name)}">${esc(p.waitlist || "GET DROP UPDATES")}</button>
                    </div>
                </article>`;
            }

            const sel = selection[p.id];
            const single = p.colors.length === 1;
            const first = p.colors[sel.color] || p.colors[0];
            return `
            <article class="shop-product product-card is-available" id="${p.id}" data-category="${p.category}" data-id="${p.id}" aria-label="${esc(p.name)}">
                <div class="shop-product-media">
                    <div class="image-container">${imgTag(first.img, `${p.name} in ${first.name}`, first.fit || "cover")}</div>
                </div>
                <div class="shop-product-info">
                    <span class="tag">${esc(p.tag)}</span>
                    <h2 class="shop-product-title">${esc(p.name)}</h2>
                    <p class="shop-product-price">${money(p.price)}</p>
                    ${p.note ? `<p class="product-note">${esc(p.note)}</p>` : ""}

                    <div class="selection-panel">
                        <div class="option-row">
                            <span class="option-label">Color: <b class="current-color">${esc(first.name)}</b></span>
                            <div class="color-swatches" role="group" aria-label="${esc(p.name)} color">
                                ${p.colors.map((c, idx) => `<button type="button" class="swatch" data-action="color" data-index="${idx}" style="background:${c.hex}" aria-label="${esc(c.name)}" title="${esc(c.name)}" aria-pressed="${idx === sel.color}" ${single ? "disabled" : ""}></button>`).join("")}
                            </div>
                        </div>
                        <div class="option-row">
                            <span class="option-label">${p.category === "trousers" ? "Waist" : "Size"}: <b class="current-size">${esc(sel.size)}</b></span>
                            <div class="size-pills" role="group" aria-label="${esc(p.name)} ${p.category === "trousers" ? "waist size" : "size"}">
                                ${p.sizes.map(s => `<button type="button" class="size-pill" data-action="size" data-size="${s}" aria-pressed="${s === sel.size}">${s}</button>`).join("")}
                            </div>
                        </div>
                    </div>

                    ${sizeInfoHtml(p)}

                    <button type="button" class="add-to-bag-btn" data-action="add">ADD TO BAG</button>
                    <button type="button" class="text-link" data-open="sizeGuideModal">VIEW FULL SIZE GUIDE</button>
                </div>
            </article>`;
        }

        /* ---------- PRODUCT CARDS (picture + price only) ---------- */
        function productCardHtml(p) {
            const first = p.colors ? p.colors[0] : null;
            const image = (first && first.img) || p.image || (p.images && p.images[0]);
            if (p.status !== "available") {
                return `
                <div class="featured-card is-soon" aria-label="${esc(p.name)}, coming soon">
                    <div class="image-container">${imgTag(image, p.name + " — coming soon")}<div class="coming-soon-badge">COMING SOON</div></div>
                    <div class="featured-meta"><span class="featured-name">${esc(p.name)}</span></div>
                </div>`;
            }
            const swatches = p.colors.length > 1 ? `
                <div class="color-swatches card-swatches" role="group" aria-label="${esc(p.name)} colours">
                    ${p.colors.map((c, idx) => `<button type="button" class="swatch" data-card-color="${idx}" style="background:${c.hex}" aria-label="${esc(c.name)}" title="${esc(c.name)}" aria-pressed="${idx === 0}"></button>`).join("")}
                </div>` : "";
            return `
            <div class="featured-card" data-card-id="${esc(p.id)}">
                <a class="card-link" href="product.html?id=${encodeURIComponent(p.id)}" aria-label="${esc(p.name)}, ${money(p.price)}">
                    <div class="image-container">${imgTag(first.img, `${p.name} in ${first.name}`, first.fit || "cover")}</div>
                    <div class="featured-meta">
                        <span class="featured-name">${esc(p.name)}</span>
                        <span class="featured-price">${money(p.price)}</span>
                    </div>
                </a>${swatches}
            </div>`;
        }

        // Colour dots on a card change the picture and the link, without leaving the page.
        document.addEventListener("click", e => {
            const dot = e.target.closest("[data-card-color]");
            if (!dot) return;
            const card = dot.closest("[data-card-id]");
            const p = card && byId[card.dataset.cardId];
            if (!p) return;
            const idx = Number(dot.dataset.cardColor);
            const c = p.colors[idx];
            if (!c) return;
            const img = $(".product-image", card);
            img.onerror = function () { this.onerror = null; this.src = PLACEHOLDER_IMG; };
            img.src = c.img;
            img.style.objectFit = c.fit || "cover";
            img.alt = `${p.name} in ${c.name}`;
            $$("[data-card-color]", card).forEach(d => d.setAttribute("aria-pressed", String(d === dot)));
            $(".card-link", card).href = `product.html?id=${encodeURIComponent(p.id)}&color=${idx}`;
        });

        /* ---------- LABELLED SECTIONS: Henleys / Trousers / Tees / Corporate ---------- */
        const CATEGORY_LABELS = [
            { key: "henley", label: "HENLEY" },
            { key: "trousers", label: "TROUSERS" },
            { key: "collar-tees", label: "COLLAR T-SHIRT" },
            { key: "corporate-shirts", label: "CORPORATE SHIRTS" }
        ];
        function groupedGridHtml() {
            const tabs = `<div class="category-tabs" role="navigation" aria-label="Jump to a category">${CATEGORY_LABELS.map(c => `<a href="#cat-${c.key}">${c.label}</a>`).join("")}</div>`;
            const groups = CATEGORY_LABELS.map(c => {
                const items = PRODUCTS.filter(p => p.category === c.key);
                if (!items.length) return "";
                return `<section class="category-group" id="cat-${c.key}" aria-labelledby="catt-${c.key}">
                    <h3 class="category-title" id="catt-${c.key}">${c.label}</h3>
                    <div class="featured-grid">${items.map(productCardHtml).join("")}</div>
                </section>`;
            }).join("");
            return tabs + groups;
        }

        /* ---------- SHOP ALL ---------- */
        function renderShop() {
            $("#shopSections").innerHTML = groupedGridHtml();
        }

        /* ---------- PRODUCT PAGE: one product, choose colour + size, add to bag ---------- */
        function renderProductPage() {
            const box = $("#productPage");
            const id = new URLSearchParams(window.location.search).get("id");
            const p = byId[id];
            if (!p || p.status !== "available") {
                box.innerHTML = `<div class="product-missing"><h1>PRODUCT NOT FOUND</h1><p>We couldn't find that piece.</p><a href="shop.html" class="button">BACK TO SHOP ALL</a></div>`;
                return;
            }
            const wanted = Number(new URLSearchParams(window.location.search).get("color"));
            if (Number.isInteger(wanted) && wanted >= 0 && wanted < p.colors.length) selection[p.id].color = wanted;
            document.title = `${p.name} | DISTRICT 09`;
            box.innerHTML = `<a class="back-link" href="shop.html">&larr; SHOP ALL</a>` + renderShopProduct(p).replace("<h2 ", "<h1 ").replace("</h2>", "</h1>");
        }

        /* ---------- HOME: AVAILABLE NOW ROW ---------- */
        function renderFeatured() {
            const row = $("#featuredRow");
            if (!row) return;
            row.innerHTML = groupedGridHtml();
        }

        /* ---------- HOME: TOP SLIDESHOW OF AVAILABLE PIECES ---------- */
        function initHeroSlider() {
            const slider = $("#heroSlider");
            if (!slider) return;
            // Pick 7 random (product, colour) combinations from the products that are on sale.
            const combos = [];
            // The white henley photos do not show well on the slideshow background, so it is left out here (it still sells normally).
            const SKIP = new Set(["short-sleeve-henley|White", "classic-henley|White"]);
            PRODUCTS.filter(p => p.status === "available").forEach(p => p.colors.forEach((c, ci) => { if (!SKIP.has(p.id + "|" + c.name)) combos.push({ p, c, ci }); }));
            for (let i = combos.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [combos[i], combos[j]] = [combos[j], combos[i]]; }
            const items = combos.slice(0, 7);
            if (!items.length) { slider.hidden = true; return; }
            const track = $("#heroTrack"), dots = $("#heroDots");
            track.innerHTML = items.map(({ p, c, ci }, i) => {
                return `
                <article class="hero-slide${i === 0 ? " is-active" : ""}" aria-hidden="${i === 0 ? "false" : "true"}" aria-label="${i + 1} of ${items.length}">
                    <div class="hero-copy">
                        <p class="eyebrow">DISTRICT 09 / AVAILABLE NOW</p>
                        <h2>${esc(p.name)}</h2>
                        <p class="hero-price">${esc(c.name)}</p>
                        <a class="button" href="product.html?id=${encodeURIComponent(p.id)}&color=${ci}" ${i === 0 ? "" : 'tabindex="-1"'}>SHOP NOW</a>
                    </div>
                    <div class="hero-photo"><img src="cutouts/${esc(c.img.replace(/\.jpg$/, ""))}.webp" alt="${esc(p.name + " in " + c.name)}" ${i === 0 ? 'fetchpriority="high"' : 'loading="lazy"'} onerror="this.onerror=null;this.src='${esc(c.img)}'"></div>
                </article>`;
            }).join("");
            dots.innerHTML = items.map(({ p, c }, i) => `<button type="button" class="hero-dot${i === 0 ? " is-active" : ""}" data-index="${i}" aria-label="Show ${esc(p.name)} in ${esc(c.name)}"></button>`).join("");

            const slides = $$(".hero-slide", track), dotButtons = $$(".hero-dot", dots);
            const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            let index = 0, timer = null;
            function show(n) {
                index = (n + items.length) % items.length;
                slides.forEach((s, i) => {
                    s.classList.toggle("is-active", i === index);
                    s.setAttribute("aria-hidden", String(i !== index));
                    const a = $("a", s); if (a) a.tabIndex = i === index ? 0 : -1;
                });
                dotButtons.forEach((d, i) => d.classList.toggle("is-active", i === index));
            }
            function stop() { if (timer) { clearInterval(timer); timer = null; } }
            function start() { stop(); if (reduceMotion || items.length < 2 || document.hidden) return; timer = setInterval(() => show(index + 1), 4000); }
            $("#heroPrev").addEventListener("click", () => { show(index - 1); start(); });
            $("#heroNext").addEventListener("click", () => { show(index + 1); start(); });
            dots.addEventListener("click", e => { const b = e.target.closest(".hero-dot"); if (b) { show(Number(b.dataset.index)); start(); } });
            slider.addEventListener("mouseenter", stop); slider.addEventListener("mouseleave", start);
            slider.addEventListener("focusin", stop); slider.addEventListener("focusout", start);
            document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
            if (items.length < 2) slider.classList.add("is-single");
            start();
        }

        /* ---------- CUSTOMER REVIEW PHOTOS (auto slideshow) ---------- */
        // The photos come from reviews.js. Edit that file to add your own.
        function initReviews() {
            const slider = $("#reviewSlider");
            if (!slider) return;
            const section = slider.closest(".reviews");
            const images = (Array.isArray(window.D09_REVIEW_IMAGES) ? window.D09_REVIEW_IMAGES : []).filter(i => i && i.src);
            if (!images.length) { if (section) section.hidden = true; return; }

            const placeholders = window.D09_REVIEWS_ARE_PLACEHOLDERS !== false;
            const INTERVAL = Math.max(2000, Number(window.D09_REVIEW_INTERVAL_MS) || 3500);
            const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

            const track = $("#reviewTrack");
            const dots = $("#reviewDots");
            track.innerHTML = images.map((img, i) => `
                <figure class="review-slide${i === 0 ? " is-active" : ""}" aria-hidden="${i === 0 ? "false" : "true"}">
                    <img src="${esc(img.src)}" alt="${esc(img.alt || `Customer review photo ${i + 1}`)}" ${i === 0 ? "" : 'loading="lazy"'} onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}'">
                </figure>`).join("");
            dots.innerHTML = images.map((_, i) => `<button type="button" class="review-dot${i === 0 ? " is-active" : ""}" data-index="${i}" aria-label="Show photo ${i + 1} of ${images.length}"></button>`).join("");

            const badge = $("#reviewBadge");
            if (badge) badge.hidden = !placeholders;
            const note = $("#reviewNote");
            if (note) note.textContent = placeholders ? "Customer review photos are coming soon. The photos shown are sample product photos." : "";

            const slides = $$(".review-slide", track);
            const dotButtons = $$(".review-dot", dots);
            let index = 0;
            let timer = null;

            function show(n) {
                index = (n + images.length) % images.length; // after the last photo it goes back to the first
                slides.forEach((s, i) => {
                    s.classList.toggle("is-active", i === index);
                    s.setAttribute("aria-hidden", String(i !== index));
                });
                dotButtons.forEach((d, i) => d.classList.toggle("is-active", i === index));
            }
            function stop() { if (timer) { clearInterval(timer); timer = null; } }
            function start() {
                stop();
                if (reduceMotion || images.length < 2 || document.hidden) return;
                timer = setInterval(() => show(index + 1), INTERVAL);
            }

            $("#reviewPrev").addEventListener("click", () => { show(index - 1); start(); });
            $("#reviewNext").addEventListener("click", () => { show(index + 1); start(); });
            dots.addEventListener("click", e => {
                const b = e.target.closest(".review-dot");
                if (!b) return;
                show(Number(b.dataset.index));
                start();
            });
            slider.addEventListener("mouseenter", stop);
            slider.addEventListener("mouseleave", start);
            slider.addEventListener("focusin", stop);
            slider.addEventListener("focusout", start);
            document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));

            if (images.length < 2) slider.classList.add("is-single");
            start();
        }


        /* ---------- WIRING ---------- */
        function init() {
            injectChrome();
            injectModals();
            renderShippingSections();
            if ($("#productSections")) renderProducts();
            if ($("#shopSections")) renderShop();
            if ($("#productPage")) renderProductPage();
            renderFeatured();
            initReviews();
            initHeroSlider();
            preloadAvailableColorImages();
            renderCart();
            const year = $("#year");
            if (year) year.textContent = new Date().getFullYear();
            updatePaymentModeNotice();

            ["#productSections", "#shopSections", "#productPage"].forEach(sel => {
                const el = $(sel);
                if (el) el.addEventListener("click", onGridClick);
            });
            const stateSelect = $("#customerState");
            if (stateSelect) stateSelect.addEventListener("change", updateCheckoutTotals);

            // filters
            $$(".filter-btn").forEach(b => b.addEventListener("click", () => filterCategory(b.dataset.filter)));
            $$("[data-filter-link]").forEach(a => a.addEventListener("click", () => filterCategory(a.dataset.filterLink)));

            // side menu
            const menu = $("#siteMenu"), menuBtn = $("#menuButton"), backdrop = $("#menuBackdrop");
            function setMenu(open) {
                menu.classList.toggle("open", open);
                backdrop.hidden = !open;
                menu.setAttribute("aria-hidden", String(!open));
                menuBtn.setAttribute("aria-expanded", String(open));
                menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
                if (open) $("a, button", menu.querySelector("ul")).focus(); else if (document.activeElement && menu.contains(document.activeElement)) menuBtn.focus();
            }
            menuBtn.addEventListener("click", () => setMenu(!menu.classList.contains("open")));
            $("#menuClose").addEventListener("click", () => setMenu(false));
            backdrop.addEventListener("click", () => setMenu(false));
            menu.addEventListener("click", e => { if (e.target.closest("a, ul button")) setMenu(false); });
            document.addEventListener("keydown", e => { if (e.key === "Escape" && menu.classList.contains("open")) setMenu(false); });

            // generic modal openers / closers
            document.addEventListener("click", e => {
                const opener = e.target.closest("[data-open]");
                if (opener) {
                    if (opener.dataset.open === "cartModal") renderCart();
                    openModal(opener.dataset.open);
                    return;
                }
                const closer = e.target.closest("[data-close]");
                if (closer) { closeModal(closer.closest(".modal-overlay")); return; }
                if (e.target.classList && e.target.classList.contains("modal-overlay")) closeModal(e.target);
            });

            // cart actions
            $("#cartItems").addEventListener("click", e => {
                const b = e.target.closest("[data-cart]");
                if (!b) return;
                const i = Number(b.dataset.index);
                if (b.dataset.cart === "inc") changeQuantity(i, 1);
                else if (b.dataset.cart === "dec") changeQuantity(i, -1);
                else removeItem(i);
            });

            $("#cartCheckoutBtn").addEventListener("click", () => {
                if (!bag.length) return;
                showCheckoutForm();
                swapModal("cartModal", "checkoutModal");
            });
            $("#cartWhatsAppBtn").addEventListener("click", checkoutWhatsApp);
            $("#checkoutWhatsAppBtn").addEventListener("click", checkoutWhatsApp);

            $("#checkoutForm").addEventListener("submit", submitOrder);
            const newsletterForm = $("#newsletterForm");
            if (newsletterForm) newsletterForm.addEventListener("submit", subscribe);
            // Paystack always sends customers back to the home page, so only handle it there.
            if (PAGE === "home") handlePaymentReturn();

            // keep bag in sync across tabs
            window.addEventListener("storage", e => {
                if (e.key === STORAGE_KEY) { bag = loadBag(); renderCart(); }
            });
        }

        init();
    })();
