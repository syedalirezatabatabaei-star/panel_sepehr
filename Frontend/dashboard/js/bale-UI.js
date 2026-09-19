/* =========================================================
   BALE CHAT UI
   Sepehr Salamat Dashboard
   ========================================================= */

(() => {
    "use strict";

    /* =====================================================
       CONFIG
       ===================================================== */

    const BALE_API = "http://95.38.187.123:3000";
    const BALE_WEBHOOK = "https://n8n.sepehrsalamati.ir/webhook/seandms";
    const BALE_CREATE_WEBHOOK = "https://n8n.sepehrsalamati.ir/webhook/plasuser";

    /* =====================================================
       STATE
       ===================================================== */

    const BaleUIState = {
        currentSession: null,
        currentUserId: null,

        unread: {},
        lastSessionUpdate: {},

        lastMessageCount: 0,
        isInitialLoad: true,

        sessions: [],

        refreshSessionsTimer: null,
        refreshMessagesTimer: null
    };

    /* =====================================================
       OPEN BALE PAGE
       ===================================================== */

    window.openBaleMessaging = function () {

        console.log("[BALE UI] Opening Bale Chat Bot");

        /*
         * Settings navigation را مخفی می‌کنیم
         * چون صفحه بله یک بخش مستقل داشبورد است.
         */

        const settingsLayout = document.querySelector(".settings-layout");

        if (settingsLayout) {
            settingsLayout.classList.add("bale-ui-active");
        }

        const settingsNav = document.getElementById("settingsNav");

        if (settingsNav) {
            settingsNav.style.display = "none";
        }

        const settingsToggle = document.getElementById("settingsToggleBtn");

        if (settingsToggle) {
            settingsToggle.style.display = "none";
        }

        /*
         * عنوان Header
         */

        const headerTitle = document.getElementById("headerTitle");

        if (headerTitle) {
            headerTitle.textContent = "چت ربات بله";
        }

        /*
         * محتوای اصلی
         */

        const content = document.getElementById("settingsContent");

        if (!content) {
            console.error("[BALE UI] settingsContent پیدا نشد.");
            return;
        }

        content.classList.add("bale-ui-content");

        content.innerHTML = getBaleHTML();

        injectBaleStyles();

        initializeBaleUI();

        loadSessions();
    };

    /* =====================================================
       CLOSE BALE PAGE
       ===================================================== */

    window.closeBaleMessaging = function () {

        console.log("[BALE UI] Closing Bale Chat");

        if (BaleUIState.refreshSessionsTimer) {
            clearInterval(BaleUIState.refreshSessionsTimer);
            BaleUIState.refreshSessionsTimer = null;
        }

        if (BaleUIState.refreshMessagesTimer) {
            clearInterval(BaleUIState.refreshMessagesTimer);
            BaleUIState.refreshMessagesTimer = null;
        }

        const content = document.getElementById("settingsContent");

        if (content) {
            content.classList.remove("bale-ui-content");
        }

        const settingsLayout = document.querySelector(".settings-layout");

        if (settingsLayout) {
            settingsLayout.classList.remove("bale-ui-active");
        }

        const settingsNav = document.getElementById("settingsNav");

        if (settingsNav) {
            settingsNav.style.display = "";
        }

        const settingsToggle = document.getElementById("settingsToggleBtn");

        if (settingsToggle) {
            settingsToggle.style.display = "";
        }
    };

    /* =====================================================
       HTML
       ===================================================== */

    function getBaleHTML() {

        return `
            <div class="bale-ui-container">

                <!-- =========================================
                     USERS / SESSIONS
                     ========================================= -->

                <aside class="bale-users">

                    <div class="bale-users-header">

                        <div class="bale-header-content">

                            <div class="bale-logo">
                                <img
                                    src="../img/images.jpg"
                                    alt="سپهر سلامتی"
                                    onerror="this.style.display='none'"
                                >
                            </div>

                            <div class="bale-header-text">

                                <h2>سپهر سلامتی</h2>

                                <span>
                                    بله - واحد تحول دیجیتال
                                </span>

                            </div>

                        </div>

                        <div class="bale-header-actions">

                            <button
                                id="baleThemeToggle"
                                class="bale-header-btn"
                                title="تغییر تم"
                            >
                                🌙
                            </button>

                            <button
                                id="baleSearchBtn"
                                class="bale-header-btn"
                                title="جستجوی پیام‌ها"
                            >
                                🔍
                            </button>

                            <button
                                id="baleNewChatBtn"
                                class="bale-header-btn"
                                title="گفتگوی جدید"
                            >
                                +
                            </button>

                        </div>

                    </div>

                    <div
                        id="baleSessions"
                        class="bale-sessions"
                    ></div>

                </aside>


                <!-- =========================================
                     CHAT
                     ========================================= -->

                <section class="bale-chat">

                    <div
                        id="baleChatHeader"
                        class="bale-chat-header"
                    >

                        <div class="bale-empty-state">

                            <div class="bale-empty-icon">
                                💬
                            </div>

                            <h3>
                                به چت ربات بله خوش آمدید
                            </h3>

                            <p>
                                یک گفتگو را از لیست انتخاب کنید
                                <br>
                                یا یک گفتگوی جدید ایجاد کنید
                            </p>

                        </div>

                    </div>


                    <div
                        id="baleChatBox"
                        class="bale-chat-box"
                        style="display:none;"
                    ></div>


                    <div
                        id="baleInputBox"
                        class="bale-input-box"
                        style="display:none;"
                    >

                        <div class="bale-input-container">

                            <input
                                id="baleMsgInput"
                                type="text"
                                placeholder="پیام خود را بنویسید..."
                                autocomplete="off"
                            >

                        </div>

                        <button
                            id="baleSendBtn"
                            class="bale-send-btn"
                            title="ارسال پیام"
                        >
                            ➤
                        </button>

                    </div>

                </section>


                <!-- =========================================
                     SEARCH
                     ========================================= -->

                <div
                    id="baleSearchOverlay"
                    class="bale-search-overlay"
                >

                    <div class="bale-search-container">

                        <div class="bale-search-header">

                            <h3>
                                🔍 جستجوی پیام‌ها
                            </h3>

                            <button
                                id="baleSearchClose"
                                class="bale-search-close"
                            >
                                ✕
                            </button>

                        </div>


                        <div class="bale-search-input-row">

                            <input
                                id="baleSearchInput"
                                class="bale-search-input"
                                type="text"
                                placeholder="عبارت مورد نظر را جستجو کنید..."
                            >

                            <button
                                id="balePerformSearch"
                                class="bale-search-button"
                            >
                                جستجو
                            </button>

                        </div>


                        <div
                            id="baleSearchResults"
                            class="bale-search-results"
                        >

                            <div class="bale-search-empty">
                                🔍
                                <p>
                                    عبارت مورد نظر را جستجو کنید
                                </p>
                            </div>

                        </div>

                    </div>

                </div>


                <!-- =========================================
                     NEW CHAT MODAL
                     ========================================= -->

                <div
                    id="baleNewChatModal"
                    class="bale-modal"
                >

                    <div class="bale-modal-content">

                        <h3>
                            ایجاد گفتگوی جدید
                        </h3>

                        <input
                            id="baleUsernameInput"
                            type="text"
                            placeholder="نام کاربری را وارد کنید..."
                        >

                        <div class="bale-modal-buttons">

                            <button
                                id="baleCreateChat"
                                class="bale-primary-btn"
                            >
                                ایجاد گفتگو
                            </button>

                            <button
                                id="baleCloseModal"
                                class="bale-secondary-btn"
                            >
                                انصراف
                            </button>

                        </div>

                    </div>

                </div>

            </div>
        `;
    }

    /* =====================================================
       INITIALIZE
       ===================================================== */

    function initializeBaleUI() {

        initTheme();

        document
            .getElementById("baleThemeToggle")
            ?.addEventListener("click", toggleTheme);

        document
            .getElementById("baleNewChatBtn")
            ?.addEventListener("click", openNewChatModal);

        document
            .getElementById("baleCloseModal")
            ?.addEventListener("click", closeNewChatModal);

        document
            .getElementById("baleCreateChat")
            ?.addEventListener("click", createChat);

        document
            .getElementById("baleSearchBtn")
            ?.addEventListener("click", openSearch);

        document
            .getElementById("baleSearchClose")
            ?.addEventListener("click", closeSearch);

        document
            .getElementById("balePerformSearch")
            ?.addEventListener("click", performSearch);

        document
            .getElementById("baleSendBtn")
            ?.addEventListener("click", sendMessage);

        document
            .getElementById("baleMsgInput")
            ?.addEventListener("keypress", event => {

                if (event.key === "Enter") {
                    sendMessage();
                }

            });

        document
            .getElementById("baleSearchInput")
            ?.addEventListener("keypress", event => {

                if (event.key === "Enter") {
                    performSearch();
                }

            });

        document
            .getElementById("baleSearchOverlay")
            ?.addEventListener("click", event => {

                if (event.target.id === "baleSearchOverlay") {
                    closeSearch();
                }

            });

        document
            .getElementById("baleNewChatModal")
            ?.addEventListener("click", event => {

                if (event.target.id === "baleNewChatModal") {
                    closeNewChatModal();
                }

            });

        startRefreshTimers();
    }

    /* =====================================================
       THEME
       ===================================================== */

    function initTheme() {

        const savedTheme =
            localStorage.getItem("baleChatTheme") || "light";

        document
            .documentElement
            .setAttribute("data-bale-theme", savedTheme);

        updateThemeIcon(savedTheme);
    }

    function toggleTheme() {

        const current =
            document.documentElement.getAttribute("data-bale-theme");

        const next =
            current === "dark" ? "light" : "dark";

        document
            .documentElement
            .setAttribute("data-bale-theme", next);

        localStorage.setItem("baleChatTheme", next);

        updateThemeIcon(next);
    }

    function updateThemeIcon(theme) {

        const btn =
            document.getElementById("baleThemeToggle");

        if (btn) {
            btn.textContent =
                theme === "dark" ? "☀️" : "🌙";
        }
    }

    /* =====================================================
       NEW CHAT
       ===================================================== */

    function openNewChatModal() {

        const modal =
            document.getElementById("baleNewChatModal");

        if (!modal) return;

        modal.style.display = "flex";

        setTimeout(() => {

            document
                .getElementById("baleUsernameInput")
                ?.focus();

        }, 100);
    }

    function closeNewChatModal() {

        const modal =
            document.getElementById("baleNewChatModal");

        if (modal) {
            modal.style.display = "none";
        }

        const input =
            document.getElementById("baleUsernameInput");

        if (input) {
            input.value = "";
        }
    }

    async function createChat() {

        const input =
            document.getElementById("baleUsernameInput");

        const username =
            input?.value.trim();

        if (!username) {

            alert("لطفاً نام کاربری را وارد کنید.");

            return;
        }

        const btn =
            document.getElementById("baleCreateChat");

        try {

            btn.disabled = true;
            btn.innerHTML = `
                <span class="bale-spinner"></span>
            `;

            const response =
                await fetch(BALE_CREATE_WEBHOOK, {

                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        username
                    })

                });

            if (!response.ok) {
                throw new Error("Webhook Error");
            }

            await response.json();

            closeNewChatModal();

            await loadSessions();

        } catch (error) {

            console.error(
                "[BALE UI] createChat:",
                error
            );

            alert("خطا در ایجاد گفتگو");

        } finally {

            btn.disabled = false;
            btn.textContent = "ایجاد گفتگو";
        }
    }

    /* =====================================================
       LOAD SESSIONS
       ===================================================== */

    async function loadSessions() {

        try {

            const response =
                await fetch(`${BALE_API}/sessions`);

            if (!response.ok) {
                throw new Error("Sessions API Error");
            }

            let sessions =
                await response.json();

            sessions.sort(
                (a, b) =>
                    new Date(b.updated_at) -
                    new Date(a.updated_at)
            );

            BaleUIState.sessions = sessions;

            renderSessions(sessions);

        } catch (error) {

            console.error(
                "[BALE UI] loadSessions:",
                error
            );

            const box =
                document.getElementById("baleSessions");

            if (box) {

                box.innerHTML = `
                    <div class="bale-error-state">
                        ⚠️
                        <p>
                            خطا در دریافت گفتگوها
                        </p>
                    </div>
                `;
            }
        }
    }

    /* =====================================================
       RENDER SESSIONS
       ===================================================== */

    function renderSessions(sessions) {

        const box =
            document.getElementById("baleSessions");

        if (!box) return;

        box.innerHTML = "";

        if (!sessions.length) {

            box.innerHTML = `
                <div class="bale-empty-sessions">

                    <div>
                        📭
                    </div>

                    <p>
                        هنوز گفتگویی وجود ندارد
                    </p>

                </div>
            `;

            return;
        }

        sessions.forEach(session => {

            if (
                BaleUIState.lastSessionUpdate[session.id] &&
                BaleUIState.lastSessionUpdate[session.id]
                    !== session.updated_at &&
                BaleUIState.currentSession !== session.id
            ) {

                BaleUIState.unread[session.id] =
                    (BaleUIState.unread[session.id] || 0) + 1;
            }

            BaleUIState.lastSessionUpdate[session.id] =
                session.updated_at;

            const item =
                document.createElement("div");

            item.className =
                "bale-user" +
                (
                    BaleUIState.currentSession === session.id
                        ? " active"
                        : ""
                );

            const initial =
                session.user_id
                    ? String(session.user_id)
                        .charAt(0)
                        .toUpperCase()
                    : "?";

            const unread =
                BaleUIState.unread[session.id] || 0;

            item.innerHTML = `

                <div class="bale-user-content">

                    <div class="bale-user-avatar">
                        ${escapeHTML(initial)}
                    </div>

                    <div class="bale-user-info">

                        <div class="bale-uid">
                            ${escapeHTML(session.user_id || "بدون نام")}
                        </div>

                        <div class="bale-user-title">
                            ${escapeHTML(session.title || "گفتگوی جدید")}
                        </div>

                        <div class="bale-utime">
                            ${formatDate(session.updated_at)}
                        </div>

                    </div>

                </div>

                ${
                    unread
                        ? `<div class="bale-unread-badge">${unread}</div>`
                        : ""
                }

            `;

            item.addEventListener(
                "click",
                () => selectSession(session)
            );

            box.appendChild(item);
        });
    }

    /* =====================================================
       SELECT SESSION
       ===================================================== */

    async function selectSession(session) {

        BaleUIState.currentSession = session.id;
        BaleUIState.currentUserId = session.user_id;

        BaleUIState.unread[session.id] = 0;

        BaleUIState.lastMessageCount = 0;
        BaleUIState.isInitialLoad = true;

        const initial =
            session.user_id
                ? String(session.user_id)
                    .charAt(0)
                    .toUpperCase()
                : "?";

        const header =
            document.getElementById("baleChatHeader");

        if (header) {

            header.innerHTML = `

                <button
                    class="bale-mobile-back"
                    onclick="baleGoBackToSidebar()"
                >
                    →
                </button>

                <div class="bale-chat-header-avatar">
                    ${escapeHTML(initial)}
                </div>

                <div class="bale-chat-header-info">

                    <h2>
                        ${escapeHTML(session.user_id || "کاربر")}
                    </h2>

                    <span>
                        <span class="bale-status-dot"></span>
                        آنلاین
                        •
                        ${escapeHTML(session.title || "گفتگو")}
                    </span>

                </div>
            `;
        }

        const chatBox =
            document.getElementById("baleChatBox");

        const inputBox =
            document.getElementById("baleInputBox");

        if (chatBox) {
            chatBox.style.display = "flex";
        }

        if (inputBox) {
            inputBox.style.display = "flex";
        }

        const users =
            document.querySelector(".bale-users");

        const chat =
            document.querySelector(".bale-chat");

        if (window.innerWidth <= 768) {

            users?.classList.add("show-chat");
            chat?.classList.add("show-chat");
        }

        renderSessions(BaleUIState.sessions);

        await loadMessages();
    }

    /* =====================================================
       LOAD MESSAGES
       ===================================================== */

    async function loadMessages() {

        if (!BaleUIState.currentSession) {
            return;
        }

        try {

            const response =
                await fetch(
                    `${BALE_API}/messages/${BaleUIState.currentSession}`
                );

            if (!response.ok) {
                throw new Error("Messages API Error");
            }

            const messages =
                await response.json();

            const chatBox =
                document.getElementById("baleChatBox");

            if (!chatBox) return;

            if (
                messages.length ===
                BaleUIState.lastMessageCount &&
                !BaleUIState.isInitialLoad
            ) {
                return;
            }

            const wasAtBottom =
                chatBox.scrollHeight -
                chatBox.scrollTop <=
                chatBox.clientHeight + 50;

            BaleUIState.lastMessageCount =
                messages.length;

            chatBox.innerHTML = "";

            if (!messages.length) {

                chatBox.innerHTML = `

                    <div class="bale-empty-state">

                        <div class="bale-empty-icon">
                            ✨
                        </div>

                        <h3>
                            شروع مکالمه
                        </h3>

                        <p>
                            هنوز پیامی رد و بدل نشده است
                        </p>

                    </div>
                `;

                BaleUIState.isInitialLoad = false;

                return;
            }

            messages.forEach(message => {

                const isUser =
                    message.sender_type === "user";

                const wrapper =
                    document.createElement("div");

                wrapper.className =
                    "bale-message-wrapper" +
                    (isUser ? " me-wrapper" : "");

                const avatar =
                    isUser
                        ? "images.jpg"
                        : "navid.jpg";

                const time =
                    message.created_at
                        ? formatTime(message.created_at)
                        : formatTime(new Date());

                wrapper.innerHTML = `

                    <div class="bale-message-avatar">

                        <img
                            src="${avatar}"
                            alt=""
                            onerror="this.style.display='none'"
                        >

                    </div>

                    <div class="bale-message ${
                        isUser ? "me" : "other"
                    }">

                        <div>
                            ${escapeHTML(message.message || "")}
                        </div>

                        <div class="bale-message-time">
                            ${time}
                        </div>

                    </div>
                `;

                chatBox.appendChild(wrapper);
            });

            BaleUIState.isInitialLoad = false;

            if (wasAtBottom) {
                chatBox.scrollTop =
                    chatBox.scrollHeight;
            }

        } catch (error) {

            console.error(
                "[BALE UI] loadMessages:",
                error
            );
        }
    }

    /* =====================================================
       SEND MESSAGE
       ===================================================== */

    async function sendMessage() {

        const input =
            document.getElementById("baleMsgInput");

        const text =
            input?.value.trim();

        if (!BaleUIState.currentSession) {

            alert("ابتدا یک گفتگو را انتخاب کنید.");

            return;
        }

        if (!text) return;

        const btn =
            document.getElementById("baleSendBtn");

        try {

            btn.disabled = true;

            btn.innerHTML =
                `<span class="bale-spinner"></span>`;

            const response =
                await fetch(BALE_WEBHOOK, {

                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({

                        session_id:
                            BaleUIState.currentSession,

                        user_id:
                            BaleUIState.currentUserId,

                        message: text

                    })
                });

            if (!response.ok) {
                throw new Error("Webhook Error");
            }

            input.value = "";

            await loadMessages();

        } catch (error) {

            console.error(
                "[BALE UI] sendMessage:",
                error
            );

            alert("ارسال پیام انجام نشد.");

        } finally {

            btn.disabled = false;
            btn.innerHTML = "➤";
        }
    }

    /* =====================================================
       SEARCH
       ===================================================== */

    function openSearch() {

        const overlay =
            document.getElementById("baleSearchOverlay");

        if (!overlay) return;

        overlay.classList.add("active");

        document
            .getElementById("baleSearchInput")
            ?.focus();
    }

    function closeSearch() {

        const overlay =
            document.getElementById("baleSearchOverlay");

        overlay?.classList.remove("active");

        const input =
            document.getElementById("baleSearchInput");

        if (input) {
            input.value = "";
        }
    }

    async function performSearch() {

        const input =
            document.getElementById("baleSearchInput");

        const query =
            input?.value.trim();

        if (!query) {

            alert("لطفاً عبارتی برای جستجو وارد کنید.");

            return;
        }

        const results =
            document.getElementById("baleSearchResults");

        results.innerHTML = `

            <div class="bale-search-empty">

                <span class="bale-spinner dark"></span>

                <p>
                    در حال جستجو...
                </p>

            </div>
        `;

        try {

            const response =
                await fetch(`${BALE_API}/sessions`);

            if (!response.ok) {
                throw new Error("Sessions API Error");
            }

            const sessions =
                await response.json();

            const searchResults = [];

            for (const session of sessions) {

                try {

                    const messagesResponse =
                        await fetch(
                            `${BALE_API}/messages/${session.id}`
                        );

                    if (!messagesResponse.ok) {
                        continue;
                    }

                    const messages =
                        await messagesResponse.json();

                    messages.forEach(message => {

                        const text =
                            String(message.message || "");

                        if (
                            text
                                .toLowerCase()
                                .includes(query.toLowerCase())
                        ) {

                            searchResults.push({

                                userId:
                                    session.user_id,

                                sessionTitle:
                                    session.title,

                                message:
                                    text,

                                senderType:
                                    message.sender_type
                            });
                        }

                    });

                } catch (error) {

                    console.warn(
                        "[BALE UI] Search session failed:",
                        session.id
                    );
                }
            }

            renderSearchResults(
                searchResults,
                query
            );

        } catch (error) {

            console.error(
                "[BALE UI] search:",
                error
            );

            results.innerHTML = `

                <div class="bale-search-empty">

                    <div>
                        ⚠️
                    </div>

                    <p>
                        خطا در جستجو
                    </p>

                </div>
            `;
        }
    }

    function renderSearchResults(results, query) {

        const container =
            document.getElementById("baleSearchResults");

        if (!results.length) {

            container.innerHTML = `

                <div class="bale-search-empty">

                    <div>
                        😔
                    </div>

                    <p>
                        نتیجه‌ای یافت نشد
                    </p>

                </div>
            `;

            return;
        }

        container.innerHTML =
            results.map(result => {

                const highlighted =
                    highlightText(
                        result.message,
                        query
                    );

                return `

                    <div class="bale-search-result">

                        <div class="bale-search-user">

                            ${escapeHTML(
                                result.userId || "کاربر"
                            )}

                            •

                            ${
                                result.senderType === "user"
                                    ? "کاربر"
                                    : "بات"
                            }

                        </div>

                        <div class="bale-search-message">
                            ${highlighted}
                        </div>

                    </div>
                `;

            }).join("");
    }

    /* =====================================================
       MOBILE
       ===================================================== */

    window.baleGoBackToSidebar =
        function () {

            if (window.innerWidth > 768) {
                return;
            }

            document
                .querySelector(".bale-users")
                ?.classList.remove("show-chat");

            document
                .querySelector(".bale-chat")
                ?.classList.remove("show-chat");
        };

    /* =====================================================
       REFRESH
       ===================================================== */

    function startRefreshTimers() {

        if (BaleUIState.refreshSessionsTimer) {
            clearInterval(
                BaleUIState.refreshSessionsTimer
            );
        }

        if (BaleUIState.refreshMessagesTimer) {
            clearInterval(
                BaleUIState.refreshMessagesTimer
            );
        }

        BaleUIState.refreshSessionsTimer =
            setInterval(
                loadSessions,
                15000
            );

        BaleUIState.refreshMessagesTimer =
            setInterval(
                async () => {

                    if (
                        BaleUIState.currentSession
                    ) {

                        try {

                            const response =
                                await fetch(
                                    `${BALE_API}/messages/${BaleUIState.currentSession}`
                                );

                            const messages =
                                await response.json();

                            if (
                                messages.length >
                                BaleUIState.lastMessageCount
                            ) {

                                await loadMessages();
                            }

                        } catch (error) {

                            // Background refresh
                            // intentionally silent
                        }
                    }

                },
                5000
            );
    }

    /* =====================================================
       HELPERS
       ===================================================== */

    function escapeHTML(value) {

        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function escapeRegex(value) {

        return String(value)
            .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    function highlightText(text, query) {

        const safeText =
            escapeHTML(text);

        const regex =
            new RegExp(
                `(${escapeRegex(query)})`,
                "gi"
            );

        return safeText.replace(
            regex,
            '<span class="bale-search-highlight">$1</span>'
        );
    }

    function formatDate(date) {

        try {

            return new Date(date)
                .toLocaleString("fa-IR");

        } catch {

            return "";
        }
    }

    function formatTime(date) {

        try {

            return new Date(date)
                .toLocaleTimeString(
                    "fa-IR",
                    {
                        hour: "2-digit",
                        minute: "2-digit"
                    }
                );

        } catch {

            return "";
        }
    }

    /* =====================================================
       STYLES
       ===================================================== */

    function injectBaleStyles() {

        if (document.getElementById("baleUIStyles")) {
            return;
        }

        const style =
            document.createElement("style");

        style.id = "baleUIStyles";

        style.textContent = `

        /* =================================================
           BALE DASHBOARD OVERRIDE
           ================================================= */

        .settings-layout.bale-ui-active {
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
        }

        .bale-ui-content {
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            height: calc(100vh - 70px) !important;
            overflow: hidden !important;
        }

        [data-bale-theme="light"] {}

        [data-bale-theme="dark"] {}

        .bale-ui-container {

            --bale-primary: #4da6ff;
            --bale-primary-dark: #3399ff;
            --bale-primary-light: #80c4ff;
            --bale-accent: #7c4dff;

            --bale-bg: #f0f4f8;
            --bale-sidebar: #ffffff;
            --bale-chat-bg: #e8f0fe;

            --bale-text: #1a1a2e;
            --bale-secondary: #5a6c7d;
            --bale-muted: #8899aa;

            --bale-border: rgba(0,0,0,.08);

            width: 100%;
            height: 100%;

            display: flex;

            direction: rtl;

            background: var(--bale-bg);

            color: var(--bale-text);

            font-family:
                'Vazirmatn',
                Tahoma,
                sans-serif;

            overflow: hidden;
        }


        /* =================================================
           USERS
           ================================================= */

        .bale-users {

            width: 360px;

            flex-shrink: 0;

            background:
                var(--bale-sidebar);

            display: flex;

            flex-direction: column;

            border-left:
                1px solid var(--bale-border);

            box-shadow:
                2px 0 20px rgba(0,0,0,.05);

            z-index: 10;
        }


        .bale-users-header {

            display: flex;

            align-items: center;

            justify-content: space-between;

            padding: 16px;

            background:
                linear-gradient(
                    135deg,
                    var(--bale-primary),
                    var(--bale-primary-dark)
                );

            color: white;
        }


        .bale-header-content {

            display: flex;

            align-items: center;

            gap: 10px;

            min-width: 0;
        }


        .bale-logo {

            width: 44px;

            height: 44px;

            border-radius: 12px;

            overflow: hidden;

            border:
                2px solid rgba(255,255,255,.3);

            flex-shrink: 0;
        }


        .bale-logo img {

            width: 100%;
            height: 100%;

            object-fit: cover;
        }


        .bale-header-text {

            min-width: 0;
        }


        .bale-header-text h2 {

            font-size: 15px;

            font-weight: 700;

            color: white;

            margin: 0 0 3px;
        }


        .bale-header-text span {

            font-size: 11px;

            color:
                rgba(255,255,255,.85);
        }


        .bale-header-actions {

            display: flex;

            gap: 5px;

            flex-shrink: 0;
        }


        .bale-header-btn {

            width: 36px;

            height: 36px;

            border: none;

            border-radius: 10px;

            background:
                rgba(255,255,255,.2);

            color: white;

            cursor: pointer;

            font-size: 16px;

            display: flex;

            align-items: center;

            justify-content: center;

            transition: .2s;
        }


        .bale-header-btn:hover {

            background:
                rgba(255,255,255,.32);

            transform: scale(1.05);
        }


        /* =================================================
           SESSIONS
           ================================================= */

        .bale-sessions {

            flex: 1;

            overflow-y: auto;

            padding: 10px;
        }


        .bale-user {

            padding: 12px;

            margin-bottom: 5px;

            border-radius: 14px;

            cursor: pointer;

            border:
                1px solid transparent;

            transition: .2s;

            position: relative;
        }


        .bale-user:hover {

            background:
                rgba(77,166,255,.06);

            border-color:
                rgba(77,166,255,.15);
        }


        .bale-user.active {

            background:
                rgba(77,166,255,.12);

            border-color:
                rgba(77,166,255,.28);
        }


        .bale-user-content {

            display: flex;

            align-items: center;

            gap: 10px;
        }


        .bale-user-avatar {

            width: 46px;

            height: 46px;

            flex-shrink: 0;

            border-radius: 13px;

            display: flex;

            align-items: center;

            justify-content: center;

            background:
                linear-gradient(
                    135deg,
                    var(--bale-primary),
                    var(--bale-accent)
                );

            color: white;

            font-weight: 700;
        }


        .bale-user-info {

            flex: 1;

            min-width: 0;
        }


        .bale-uid {

            font-size: 13px;

            font-weight: 600;

            overflow: hidden;

            white-space: nowrap;

            text-overflow: ellipsis;
        }


        .bale-user-title {

            font-size: 11px;

            color: var(--bale-secondary);

            overflow: hidden;

            white-space: nowrap;

            text-overflow: ellipsis;

            margin-top: 3px;
        }


        .bale-utime {

            font-size: 10px;

            color: var(--bale-muted);

            margin-top: 5px;
        }


        .bale-unread-badge {

            position: absolute;

            left: 12px;

            top: 12px;

            min-width: 22px;

            height: 22px;

            padding: 0 6px;

            border-radius: 11px;

            background: #ff4757;

            color: white;

            display: flex;

            align-items: center;

            justify-content: center;

            font-size: 10px;

            font-weight: 700;
        }


        .bale-empty-sessions,
        .bale-error-state {

            padding: 40px 20px;

            text-align: center;

            color: var(--bale-muted);

            font-size: 13px;
        }


        .bale-empty-sessions div {

            font-size: 42px;

            margin-bottom: 10px;
        }


        /* =================================================
           CHAT
           ================================================= */

        .bale-chat {

            flex: 1;

            min-width: 0;

            display: flex;

            flex-direction: column;

            background:
                var(--bale-chat-bg);

            position: relative;
        }


        .bale-chat-header {

            min-height: 76px;

            padding: 14px 20px;

            background:
                var(--bale-sidebar);

            border-bottom:
                1px solid var(--bale-border);

            display: flex;

            align-items: center;

            gap: 12px;

            flex-shrink: 0;
        }


        .bale-chat-header-avatar {

            width: 44px;

            height: 44px;

            border-radius: 13px;

            background:
                linear-gradient(
                    135deg,
                    var(--bale-primary),
                    var(--bale-primary-light)
                );

            color: white;

            display: flex;

            align-items: center;

            justify-content: center;

            font-weight: 700;
        }


        .bale-chat-header-info {

            flex: 1;
        }


        .bale-chat-header-info h2 {

            font-size: 15px;

            margin: 0 0 4px;

            font-weight: 600;
        }


        .bale-chat-header-info span {

            font-size: 11px;

            color: var(--bale-secondary);

            display: flex;

            align-items: center;

            gap: 5px;
        }


        .bale-status-dot {

            width: 7px;

            height: 7px;

            border-radius: 50%;

            background: #00d68f;

            box-shadow:
                0 0 8px rgba(0,214,143,.5);
        }


        .bale-chat-box {

            flex: 1;

            overflow-y: auto;

            padding: 20px;

            display: flex;

            flex-direction: column;

            gap: 12px;
        }


        .bale-message-wrapper {

            display: flex;

            align-items: flex-end;

            gap: 8px;

            max-width: 75%;
        }


        .bale-message-wrapper.me-wrapper {

            flex-direction: row-reverse;

            align-self: flex-start;
        }


        .bale-message-avatar {

            width: 32px;

            height: 32px;

            border-radius: 9px;

            overflow: hidden;

            flex-shrink: 0;

            background: #ddd;
        }


        .bale-message-avatar img {

            width: 100%;

            height: 100%;

            object-fit: cover;
        }


        .bale-message {

            padding: 10px 14px;

            border-radius: 16px;

            line-height: 1.7;

            font-size: 13px;

            word-break: break-word;
        }


        .bale-message.me {

            background:
                linear-gradient(
                    135deg,
                    var(--bale-primary),
                    var(--bale-primary-light)
                );

            color: white;

            border-bottom-left-radius: 5px;
        }


        .bale-message.other {

            background:
                white;

            color: var(--bale-text);

            border:
                1px solid var(--bale-border);

            border-bottom-right-radius: 5px;
        }


        .bale-message-time {

            font-size: 9px;

            margin-top: 4px;

            opacity: .65;

            text-align: left;
        }


        /* =================================================
           INPUT
           ================================================= */

        .bale-input-box {

            display: flex;

            gap: 10px;

            padding: 12px 18px;

            background:
                var(--bale-sidebar);

            border-top:
                1px solid var(--bale-border);
        }


        .bale-input-container {

            flex: 1;

            background:
                var(--bale-bg);

            border-radius: 13px;

            border:
                2px solid transparent;

            transition: .2s;
        }


        .bale-input-container:focus-within {

            border-color:
                rgba(77,166,255,.3);
        }


        .bale-input-container input {

            width: 100%;

            border: none;

            outline: none;

            background: transparent;

            color: var(--bale-text);

            padding: 13px 16px;

            font-family:
                'Vazirmatn',
                Tahoma,
                sans-serif;

            font-size: 13px;
        }


        .bale-send-btn {

            width: 48px;

            height: 48px;

            border: none;

            border-radius: 13px;

            background:
                linear-gradient(
                    135deg,
                    var(--bale-primary),
                    var(--bale-primary-light)
                );

            color: white;

            cursor: pointer;

            font-size: 18px;

            display: flex;

            align-items: center;

            justify-content: center;
        }


        .bale-send-btn:disabled {

            opacity: .5;

            cursor: not-allowed;
        }


        /* =================================================
           EMPTY STATE
           ================================================= */

        .bale-empty-state {

            width: 100%;

            height: 100%;

            display: flex;

            flex-direction: column;

            align-items: center;

            justify-content: center;

            text-align: center;

            color: var(--bale-muted);

            padding: 30px;
        }


        .bale-empty-icon {

            font-size: 60px;

            margin-bottom: 15px;

            opacity: .6;
        }


        .bale-empty-state h3 {

            font-size: 17px;

            color: var(--bale-secondary);

            margin-bottom: 7px;
        }


        .bale-empty-state p {

            font-size: 12px;

            line-height: 1.8;
        }


        /* =================================================
           SEARCH
           ================================================= */

        .bale-search-overlay {

            position: fixed;

            inset: 0;

            z-index: 9999;

            display: none;

            align-items: flex-start;

            justify-content: center;

            padding-top: 90px;

            background:
                rgba(0,0,0,.5);

            backdrop-filter: blur(5px);
        }


        .bale-search-overlay.active {

            display: flex;
        }


        .bale-search-container {

            width: 90%;

            max-width: 600px;

            background:
                white;

            border-radius: 20px;

            padding: 22px;

            box-shadow:
                0 25px 60px rgba(0,0,0,.25);
        }


        .bale-search-header {

            display: flex;

            align-items: center;

            gap: 10px;

            margin-bottom: 16px;
        }


        .bale-search-header h3 {

            flex: 1;

            font-size: 17px;
        }


        .bale-search-close {

            width: 34px;

            height: 34px;

            border: none;

            border-radius: 9px;

            cursor: pointer;
        }


        .bale-search-input-row {

            display: flex;

            gap: 8px;
        }


        .bale-search-input {

            flex: 1;

            padding: 12px 14px;

            border:
                2px solid rgba(77,166,255,.2);

            border-radius: 11px;

            outline: none;

            font-family:
                'Vazirmatn',
                Tahoma,
                sans-serif;
        }


        .bale-search-button {

            padding: 0 20px;

            border: none;

            border-radius: 11px;

            background:
                var(--bale-primary);

            color: white;

            cursor: pointer;

            font-family:
                'Vazirmatn',
                Tahoma,
                sans-serif;
        }


        .bale-search-results {

            margin-top: 15px;

            max-height: 400px;

            overflow-y: auto;
        }


        .bale-search-result {

            padding: 12px;

            border-radius: 10px;

            margin-bottom: 6px;

            cursor: pointer;
        }


        .bale-search-result:hover {

            background:
                rgba(77,166,255,.08);
        }


        .bale-search-user {

            color: var(--bale-primary);

            font-size: 12px;

            font-weight: 600;

            margin-bottom: 5px;
        }


        .bale-search-message {

            font-size: 13px;

            line-height: 1.7;
        }


        .bale-search-highlight {

            background:
                rgba(255,213,0,.45);

            border-radius: 3px;

            padding: 1px 3px;
        }


        .bale-search-empty {

            padding: 30px;

            text-align: center;

            color: #8899aa;
        }


        /* =================================================
           MODAL
           ================================================= */

        .bale-modal {

            position: fixed;

            inset: 0;

            z-index: 10000;

            display: none;

            align-items: center;

            justify-content: center;

            background:
                rgba(0,0,0,.5);

            backdrop-filter: blur(5px);
        }


        .bale-modal-content {

            width: 400px;

            max-width: 90%;

            background: white;

            border-radius: 20px;

            padding: 25px;

            box-shadow:
                0 25px 60px rgba(0,0,0,.25);
        }


        .bale-modal-content h3 {

            font-size: 18px;

            margin-bottom: 18px;
        }


        .bale-modal-content input {

            width: 100%;

            padding: 13px 15px;

            border:
                2px solid rgba(77,166,255,.2);

            border-radius: 11px;

            outline: none;

            font-family:
                'Vazirmatn',
                Tahoma,
                sans-serif;
        }


        .bale-modal-buttons {

            display: flex;

            justify-content: flex-end;

            gap: 8px;

            margin-top: 18px;
        }


        .bale-primary-btn,
        .bale-secondary-btn {

            padding: 11px 18px;

            border: none;

            border-radius: 10px;

            cursor: pointer;

            font-family:
                'Vazirmatn',
                Tahoma,
                sans-serif;
        }


        .bale-primary-btn {

            background:
                var(--bale-primary);

            color: white;
        }


        .bale-secondary-btn {

            background:
                #eef1f5;

            color: #5a6c7d;
        }


        /* =================================================
           SPINNER
           ================================================= */

        .bale-spinner {

            width: 17px;

            height: 17px;

            border:
                2px solid rgba(255,255,255,.35);

            border-top-color:
                white;

            border-radius: 50%;

            animation:
                baleSpin .8s linear infinite;
        }


        @keyframes baleSpin {

            to {
                transform: rotate(360deg);
            }

        }


        /* =================================================
           MOBILE
           ================================================= */

        .bale-mobile-back {

            display: none;

            width: 38px;

            height: 38px;

            border: none;

            border-radius: 9px;

            background:
                rgba(77,166,255,.1);

            color:
                var(--bale-primary);

            font-size: 18px;

            cursor: pointer;
        }


        @media (max-width: 768px) {

            .bale-users {

                width: 100%;

                position: absolute;

                inset: 0;

                transition:
                    transform .3s ease;
            }


            .bale-chat {

                width: 100%;

                position: absolute;

                inset: 0;

                transform:
                    translateX(100%);

                transition:
                    transform .3s ease;
            }


            .bale-users.show-chat {

                transform:
                    translateX(100%);
            }


            .bale-chat.show-chat {

                transform:
                    translateX(0);
            }


            .bale-mobile-back {

                display: flex;

                align-items: center;

                justify-content: center;
            }


            .bale-message-wrapper {

                max-width: 90%;
            }


            .bale-users-header {

                padding: 12px;
            }


            .bale-header-actions {

                gap: 3px;
            }


            .bale-header-btn {

                width: 32px;

                height: 32px;

                font-size: 14px;
            }

        }

        `;

        document.head.appendChild(style);
    }

})();
