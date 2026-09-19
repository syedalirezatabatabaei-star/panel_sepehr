/* =========================================================
   Bale Chat UI
   Project: Sepehr Salamat
   File: Frontend/dashboard/js/bale-UI.js

   این فایل برای اجرا داخل داشبورد اصلی طراحی شده است.
   ========================================================= */

(function () {
    'use strict';

    /* =========================================================
       CONFIG
       ========================================================= */

    const BALE_CONFIG = {
        API_BASE: 'http://95.38.187.123:3000',

        SEND_WEBHOOK:
            'https://n8n.sepehrsalamati.ir/webhook/seandms',

        CREATE_CHAT_WEBHOOK:
            'https://n8n.sepehrsalamati.ir/webhook/plasuser',

        POLL_MESSAGES_INTERVAL: 5000,
        POLL_SESSIONS_INTERVAL: 15000,

        ASSETS: {
            logo: 'img/navid.jpg',
            defaultAvatar: 'img/images.jpg'
        }
    };


    /* =========================================================
       STATE
       ========================================================= */

    const BaleState = {
        sessions: [],
        currentSession: null,
        currentUserId: null,

        messages: [],

        isLoadingSessions: false,
        isLoadingMessages: false,

        isInitialMessageLoad: true,

        sessionsInterval: null,
        messagesInterval: null,

        searchMode: false,
        searchResults: [],

        isMobileSidebarOpen: false
    };


    /* =========================================================
       HELPERS
       ========================================================= */

    function escapeHtml(value) {
        if (value === null || value === undefined) {
            return '';
        }

        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }


    function baleNotify(message, type = 'info') {
        if (typeof window.showToast === 'function') {
            window.showToast(message, type);
            return;
        }

        alert(message);
    }


    function formatTime(dateValue) {
        if (!dateValue) {
            return '';
        }

        const date = new Date(dateValue);

        if (Number.isNaN(date.getTime())) {
            return '';
        }

        return date.toLocaleTimeString('fa-IR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }


    function formatDate(dateValue) {
        if (!dateValue) {
            return '';
        }

        const date = new Date(dateValue);

        if (Number.isNaN(date.getTime())) {
            return '';
        }

        return date.toLocaleDateString('fa-IR');
    }


    function getSessionId(session) {
        return (
            session?.id ??
            session?.session_id ??
            session?.uuid ??
            null
        );
    }


    function getSessionUserId(session) {
        return (
            session?.user_id ??
            session?.userid ??
            session?.userId ??
            null
        );
    }


    function getSessionUsername(session) {
        return (
            session?.username ??
            session?.user_name ??
            session?.name ??
            session?.phone ??
            'کاربر بله'
        );
    }


    function getMessageText(message) {
        return (
            message?.message ??
            message?.text ??
            message?.content ??
            ''
        );
    }


    function getMessageSenderId(message) {
        return (
            message?.user_id ??
            message?.userid ??
            message?.userId ??
            null
        );
    }


    function getMessageDate(message) {
        return (
            message?.created_at ??
            message?.createdAt ??
            message?.timestamp ??
            message?.date ??
            null
        );
    }


    function getCurrentUserId() {
        if (BaleState.currentUserId) {
            return BaleState.currentUserId;
        }

        const session = BaleState.currentSession;

        if (session) {
            const userId = getSessionUserId(session);

            if (userId !== null && userId !== undefined) {
                BaleState.currentUserId = userId;
                return userId;
            }
        }

        return null;
    }


    function getElement(id) {
        return document.getElementById(id);
    }


    /* =========================================================
       PAGE HTML
       ========================================================= */

    function getBalePageHTML() {
        return `
            <div class="bale-page" id="balePage">

                <div class="bale-container">

                    <!-- =========================
                         SIDEBAR
                         ========================= -->
                    <aside class="bale-sidebar" id="baleSidebar">

                        <div class="bale-sidebar-header">

                            <div class="bale-brand">
                                <img
                                    src="${BALE_CONFIG.ASSETS.logo}"
                                    alt="سپهر سلامتی"
                                    class="bale-brand-logo"
                                    onerror="this.style.display='none'"
                                >

                                <div class="bale-brand-text">
                                    <strong>ربات بله</strong>
                                    <span>سپهر سلامتی</span>
                                </div>
                            </div>

                            <button
                                type="button"
                                class="bale-icon-button bale-close-sidebar"
                                onclick="window.closeBaleSidebar()"
                                title="بستن"
                            >
                                ×
                            </button>

                        </div>


                        <!-- Search -->
                        <div class="bale-search-box">

                            <span class="bale-search-icon">⌕</span>

                            <input
                                type="text"
                                id="baleSessionSearch"
                                placeholder="جستجوی گفتگو..."
                                autocomplete="off"
                            >

                        </div>


                        <!-- New Chat -->
                        <button
                            type="button"
                            class="bale-new-chat-button"
                            onclick="window.openBaleNewChatModal()"
                        >
                            <span class="bale-plus">+</span>
                            <span>گفتگوی جدید</span>
                        </button>


                        <!-- Sessions -->
                        <div class="bale-sessions-header">

                            <span>گفتگوها</span>

                            <button
                                type="button"
                                class="bale-refresh-button"
                                onclick="window.loadBaleSessions(true)"
                                title="بروزرسانی"
                            >
                                ↻
                            </button>

                        </div>


                        <div
                            class="bale-sessions"
                            id="baleSessions"
                        >
                            <div class="bale-loading">
                                <div class="bale-spinner"></div>
                                <span>در حال دریافت گفتگوها...</span>
                            </div>
                        </div>


                        <div class="bale-sidebar-footer">

                            <div class="bale-connection-status">

                                <span class="bale-status-dot"></span>

                                <span>
                                    اتصال به سرور فعال
                                </span>

                            </div>

                        </div>

                    </aside>


                    <!-- =========================
                         MAIN CHAT
                         ========================= -->
                    <main class="bale-chat">

                        <!-- Chat Header -->
                        <header class="bale-chat-header">

                            <div class="bale-chat-header-right">

                                <button
                                    type="button"
                                    class="bale-icon-button bale-menu-button"
                                    onclick="window.toggleBaleSidebar()"
                                    title="گفتگوها"
                                >
                                    ☰
                                </button>


                                <div
                                    class="bale-current-avatar"
                                    id="baleCurrentAvatar"
                                >
                                    <img
                                        src="${BALE_CONFIG.ASSETS.defaultAvatar}"
                                        alt=""
                                    >
                                </div>


                                <div class="bale-current-user">

                                    <strong id="baleChatUsername">
                                        یک گفتگو انتخاب کنید
                                    </strong>

                                    <span id="baleChatStatus">
                                        برای شروع گفتگو، یک کاربر را انتخاب کنید
                                    </span>

                                </div>

                            </div>


                            <div class="bale-chat-header-left">

                                <button
                                    type="button"
                                    class="bale-icon-button"
                                    onclick="window.refreshBaleMessages()"
                                    title="بروزرسانی پیام‌ها"
                                >
                                    ↻
                                </button>


                                <button
                                    type="button"
                                    class="bale-icon-button"
                                    onclick="window.closeBaleChatPage()"
                                    title="بازگشت به داشبورد"
                                >
                                    ←
                                </button>

                            </div>

                        </header>


                        <!-- Chat Content -->
                        <div
                            class="bale-chat-box"
                            id="baleChatBox"
                        >

                            <div class="bale-empty-chat" id="baleEmptyChat">

                                <div class="bale-empty-icon">
                                    💬
                                </div>

                                <h3>
                                    چت ربات بله
                                </h3>

                                <p>
                                    برای مشاهده پیام‌ها، یکی از گفتگوها را انتخاب کنید.
                                </p>

                            </div>

                        </div>


                        <!-- Message Input -->
                        <div class="bale-input-area">

                            <div class="bale-input-wrapper">

                                <textarea
                                    id="baleMsgInput"
                                    rows="1"
                                    placeholder="پیام خود را بنویسید..."
                                    disabled
                                ></textarea>


                                <button
                                    type="button"
                                    id="baleSendButton"
                                    class="bale-send-button"
                                    onclick="window.sendBaleMessage()"
                                    disabled
                                    title="ارسال پیام"
                                >
                                    ➤
                                </button>

                            </div>

                            <div class="bale-input-hint">
                                برای ارسال پیام می‌توانید از Enter استفاده کنید.
                                برای خط جدید Shift + Enter را بزنید.
                            </div>

                        </div>

                    </main>

                </div>


                <!-- =========================
                     SEARCH OVERLAY
                     ========================= -->
                <div
                    class="bale-search-overlay"
                    id="baleSearchOverlay"
                    style="display:none;"
                >

                    <div class="bale-search-panel">

                        <div class="bale-search-panel-header">

                            <strong>
                                نتایج جستجو
                            </strong>

                            <button
                                type="button"
                                class="bale-icon-button"
                                onclick="window.closeBaleSearch()"
                            >
                                ×
                            </button>

                        </div>

                        <div
                            class="bale-search-results"
                            id="baleSearchResults"
                        ></div>

                    </div>

                </div>


                <!-- =========================
                     NEW CHAT MODAL
                     ========================= -->
                <div
                    class="bale-modal"
                    id="baleNewChatModal"
                    style="display:none;"
                >

                    <div
                        class="bale-modal-backdrop"
                        onclick="window.closeBaleNewChatModal()"
                    ></div>


                    <div class="bale-modal-content">

                        <div class="bale-modal-header">

                            <div>
                                <strong>
                                    ایجاد گفتگوی جدید
                                </strong>

                                <span>
                                    نام کاربری بله را وارد کنید.
                                </span>
                            </div>

                            <button
                                type="button"
                                class="bale-icon-button"
                                onclick="window.closeBaleNewChatModal()"
                            >
                                ×
                            </button>

                        </div>


                        <div class="bale-modal-body">

                            <label for="baleNewChatUsername">
                                نام کاربری
                            </label>

                            <input
                                type="text"
                                id="baleNewChatUsername"
                                placeholder="مثلاً @username"
                                autocomplete="off"
                            >

                        </div>


                        <div class="bale-modal-footer">

                            <button
                                type="button"
                                class="bale-secondary-button"
                                onclick="window.closeBaleNewChatModal()"
                            >
                                انصراف
                            </button>

                            <button
                                type="button"
                                class="bale-primary-button"
                                onclick="window.createBaleChat()"
                            >
                                ایجاد گفتگو
                            </button>

                        </div>

                    </div>

                </div>

            </div>
        `;
    }


    /* =========================================================
       CSS
       ========================================================= */

    function injectBaleStyles() {

        if (document.getElementById('baleUIStyles')) {
            return;
        }

        const style = document.createElement('style');

        style.id = 'baleUIStyles';

        style.textContent = `

        /* =====================================================
           DASHBOARD MODE
           ===================================================== */

        .settings-layout.bale-dashboard-mode {
            display: block !important;
            height: calc(100vh - 70px) !important;
            min-height: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
        }

        .settings-layout.bale-dashboard-mode .settings-nav {
            display: none !important;
        }

        .settings-layout.bale-dashboard-mode .settings-nav-overlay {
            display: none !important;
        }

        .settings-layout.bale-dashboard-mode .settings-content {
            width: 100% !important;
            max-width: none !important;
            height: 100% !important;
            min-height: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: hidden !important;
        }


        /* =====================================================
           PAGE
           ===================================================== */

        .bale-page {
            --bale-primary: #1687f8;
            --bale-primary-dark: #0875df;
            --bale-bg: #f4f7fb;
            --bale-panel: #ffffff;
            --bale-border: #e5eaf1;
            --bale-text: #172033;
            --bale-muted: #7b8496;
            --bale-hover: #f1f6fc;
            --bale-message: #e9f4ff;

            width: 100%;
            height: 100%;
            direction: rtl;
            font-family: inherit;
            color: var(--bale-text);
            background: var(--bale-bg);
            overflow: hidden;
        }


        .bale-container {
            display: flex;
            width: 100%;
            height: 100%;
            overflow: hidden;
            background: var(--bale-panel);
        }


        /* =====================================================
           SIDEBAR
           ===================================================== */

        .bale-sidebar {
            width: 330px;
            min-width: 330px;
            height: 100%;
            display: flex;
            flex-direction: column;
            background: #ffffff;
            border-left: 1px solid var(--bale-border);
            overflow: hidden;
            z-index: 20;
        }


        .bale-sidebar-header {
            height: 76px;
            min-height: 76px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 18px;
            border-bottom: 1px solid var(--bale-border);
        }


        .bale-brand {
            display: flex;
            align-items: center;
            gap: 11px;
        }


        .bale-brand-logo {
            width: 42px;
            height: 42px;
            border-radius: 12px;
            object-fit: cover;
            border: 1px solid var(--bale-border);
        }


        .bale-brand-text {
            display: flex;
            flex-direction: column;
            gap: 3px;
        }


        .bale-brand-text strong {
            font-size: 15px;
            font-weight: 800;
        }


        .bale-brand-text span {
            font-size: 11px;
            color: var(--bale-muted);
        }


        .bale-icon-button {
            border: 0;
            background: transparent;
            width: 38px;
            height: 38px;
            border-radius: 10px;
            cursor: pointer;
            color: var(--bale-muted);
            font-size: 19px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            transition: .2s ease;
        }


        .bale-icon-button:hover {
            background: var(--bale-hover);
            color: var(--bale-primary);
        }


        .bale-close-sidebar {
            display: none;
        }


        /* =====================================================
           SEARCH
           ===================================================== */

        .bale-search-box {
            margin: 14px;
            height: 42px;
            border: 1px solid var(--bale-border);
            border-radius: 12px;
            display: flex;
            align-items: center;
            padding: 0 12px;
            background: #fafbfd;
        }


        .bale-search-icon {
            color: var(--bale-muted);
            font-size: 20px;
            margin-left: 8px;
        }


        .bale-search-box input {
            width: 100%;
            height: 100%;
            border: 0;
            outline: 0;
            background: transparent;
            font-family: inherit;
            font-size: 12px;
            color: var(--bale-text);
        }


        .bale-search-box input::placeholder {
            color: #a2a9b6;
        }


        /* =====================================================
           NEW CHAT
           ===================================================== */

        .bale-new-chat-button {
            margin: 0 14px 14px;
            height: 43px;
            border: 0;
            border-radius: 11px;
            background: var(--bale-primary);
            color: #fff;
            cursor: pointer;
            font-family: inherit;
            font-size: 13px;
            font-weight: 700;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            transition: .2s ease;
        }


        .bale-new-chat-button:hover {
            background: var(--bale-primary-dark);
            transform: translateY(-1px);
        }


        .bale-plus {
            font-size: 20px;
            line-height: 1;
        }


        /* =====================================================
           SESSIONS
           ===================================================== */

        .bale-sessions-header {
            height: 40px;
            min-height: 40px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 17px;
            font-size: 12px;
            font-weight: 800;
            color: var(--bale-muted);
        }


        .bale-refresh-button {
            border: 0;
            background: transparent;
            cursor: pointer;
            color: var(--bale-muted);
            font-size: 18px;
            width: 30px;
            height: 30px;
            border-radius: 8px;
        }


        .bale-refresh-button:hover {
            background: var(--bale-hover);
            color: var(--bale-primary);
        }


        .bale-sessions {
            flex: 1;
            overflow-y: auto;
            padding: 3px 8px;
        }


        .bale-sessions::-webkit-scrollbar,
        .bale-chat-box::-webkit-scrollbar {
            width: 5px;
        }


        .bale-sessions::-webkit-scrollbar-thumb,
        .bale-chat-box::-webkit-scrollbar-thumb {
            background: #d5dbe5;
            border-radius: 20px;
        }


        .bale-session {
            width: 100%;
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 11px 10px;
            margin-bottom: 3px;
            border-radius: 12px;
            cursor: pointer;
            transition: .18s ease;
            border: 1px solid transparent;
        }


        .bale-session:hover {
            background: var(--bale-hover);
        }


        .bale-session.active {
            background: #edf6ff;
            border-color: #d8ebff;
        }


        .bale-session-avatar {
            width: 43px;
            height: 43px;
            min-width: 43px;
            border-radius: 50%;
            overflow: hidden;
            background: #eef2f7;
        }


        .bale-session-avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }


        .bale-session-info {
            flex: 1;
            min-width: 0;
        }


        .bale-session-name {
            display: block;
            font-size: 12px;
            font-weight: 800;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            margin-bottom: 5px;
        }


        .bale-session-preview {
            display: block;
            font-size: 10px;
            color: var(--bale-muted);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }


        .bale-session-meta {
            align-self: flex-start;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 5px;
        }


        .bale-session-time {
            font-size: 9px;
            color: #9ba3b2;
            white-space: nowrap;
        }


        .bale-unread {
            min-width: 18px;
            height: 18px;
            border-radius: 50%;
            background: var(--bale-primary);
            color: #fff;
            font-size: 9px;
            display: flex;
            align-items: center;
            justify-content: center;
        }


        .bale-loading {
            min-height: 180px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 12px;
            color: var(--bale-muted);
            font-size: 11px;
        }


        .bale-spinner {
            width: 27px;
            height: 27px;
            border-radius: 50%;
            border: 3px solid #e4eaf2;
            border-top-color: var(--bale-primary);
            animation: baleSpin .8s linear infinite;
        }


        @keyframes baleSpin {
            to {
                transform: rotate(360deg);
            }
        }


        .bale-no-sessions {
            padding: 35px 20px;
            text-align: center;
            color: var(--bale-muted);
            font-size: 12px;
        }


        /* =====================================================
           SIDEBAR FOOTER
           ===================================================== */

        .bale-sidebar-footer {
            padding: 13px 16px;
            border-top: 1px solid var(--bale-border);
        }


        .bale-connection-status {
            display: flex;
            align-items: center;
            gap: 7px;
            color: #7d8798;
            font-size: 10px;
        }


        .bale-status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #22c55e;
            box-shadow: 0 0 0 3px rgba(34, 197, 94, .12);
        }


        /* =====================================================
           CHAT
           ===================================================== */

        .bale-chat {
            flex: 1;
            min-width: 0;
            height: 100%;
            display: flex;
            flex-direction: column;
            background: #f8fafc;
        }


        .bale-chat-header {
            height: 76px;
            min-height: 76px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 20px;
            background: #fff;
            border-bottom: 1px solid var(--bale-border);
        }


        .bale-chat-header-right,
        .bale-chat-header-left {
            display: flex;
            align-items: center;
        }


        .bale-chat-header-right {
            gap: 10px;
        }


        .bale-chat-header-left {
            gap: 4px;
        }


        .bale-menu-button {
            display: none;
        }


        .bale-current-avatar {
            width: 43px;
            height: 43px;
            min-width: 43px;
            border-radius: 50%;
            overflow: hidden;
            background: #eef2f7;
        }


        .bale-current-avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }


        .bale-current-user {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }


        .bale-current-user strong {
            font-size: 13px;
            font-weight: 800;
        }


        .bale-current-user span {
            font-size: 10px;
            color: var(--bale-muted);
        }


        /* =====================================================
           CHAT BOX
           ===================================================== */

        .bale-chat-box {
            flex: 1;
            min-height: 0;
            overflow-y: auto;
            padding: 25px 30px;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }


        .bale-empty-chat {
            margin: auto;
            text-align: center;
            color: var(--bale-muted);
            max-width: 350px;
        }


        .bale-empty-icon {
            width: 70px;
            height: 70px;
            border-radius: 22px;
            margin: 0 auto 15px;
            background: #eaf4ff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
        }


        .bale-empty-chat h3 {
            margin: 0 0 8px;
            color: var(--bale-text);
            font-size: 16px;
        }


        .bale-empty-chat p {
            margin: 0;
            font-size: 12px;
            line-height: 1.8;
        }


        /* =====================================================
           MESSAGE
           ===================================================== */

        .bale-message-row {
            display: flex;
            width: 100%;
        }


        .bale-message-row.incoming {
            justify-content: flex-start;
        }


        .bale-message-row.outgoing {
            justify-content: flex-end;
        }


        .bale-message {
            max-width: min(70%, 650px);
            padding: 10px 13px;
            border-radius: 15px;
            font-size: 12px;
            line-height: 2;
            white-space: pre-wrap;
            word-break: break-word;
        }


        .bale-message.incoming {
            background: #fff;
            border: 1px solid var(--bale-border);
            border-bottom-right-radius: 5px;
        }


        .bale-message.outgoing {
            background: var(--bale-primary);
            color: #fff;
            border-bottom-left-radius: 5px;
        }


        .bale-message-time {
            display: block;
            margin-top: 3px;
            font-size: 8px;
            opacity: .65;
            direction: ltr;
            text-align: left;
        }


        /* =====================================================
           INPUT
           ===================================================== */

        .bale-input-area {
            padding: 12px 20px 15px;
            background: #fff;
            border-top: 1px solid var(--bale-border);
        }


        .bale-input-wrapper {
            display: flex;
            align-items: flex-end;
            gap: 9px;
            max-width: 1100px;
            margin: auto;
        }


        .bale-input-wrapper textarea {
            flex: 1;
            min-height: 44px;
            max-height: 130px;
            resize: none;
            border: 1px solid var(--bale-border);
            border-radius: 13px;
            padding: 11px 13px;
            outline: none;
            background: #fafbfd;
            font-family: inherit;
            font-size: 12px;
            color: var(--bale-text);
            line-height: 1.8;
            transition: .2s ease;
        }


        .bale-input-wrapper textarea:focus {
            border-color: #a8d3ff;
            background: #fff;
            box-shadow: 0 0 0 3px rgba(22, 135, 248, .07);
        }


        .bale-input-wrapper textarea:disabled {
            cursor: not-allowed;
            opacity: .6;
        }


        .bale-send-button {
            width: 44px;
            height: 44px;
            min-width: 44px;
            border: 0;
            border-radius: 13px;
            background: var(--bale-primary);
            color: #fff;
            cursor: pointer;
            font-size: 19px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: .2s ease;
        }


        .bale-send-button:hover:not(:disabled) {
            background: var(--bale-primary-dark);
            transform: translateY(-1px);
        }


        .bale-send-button:disabled {
            opacity: .45;
            cursor: not-allowed;
        }


        .bale-input-hint {
            max-width: 1100px;
            margin: 5px auto 0;
            color: #9ba3b2;
            font-size: 9px;
        }


        /* =====================================================
           SEARCH OVERLAY
           ===================================================== */

        .bale-search-overlay {
            position: fixed;
            inset: 0;
            z-index: 10000;
            background: rgba(15, 23, 42, .35);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }


        .bale-search-panel {
            width: min(650px, 100%);
            max-height: 80vh;
            background: #fff;
            border-radius: 18px;
            overflow: hidden;
            box-shadow: 0 20px 70px rgba(0,0,0,.18);
        }


        .bale-search-panel-header {
            height: 60px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 18px;
            border-bottom: 1px solid var(--bale-border);
        }


        .bale-search-results {
            max-height: calc(80vh - 60px);
            overflow-y: auto;
            padding: 10px;
        }


        .bale-search-result {
            padding: 12px;
            border-radius: 11px;
            cursor: pointer;
        }


        .bale-search-result:hover {
            background: var(--bale-hover);
        }


        .bale-search-result-name {
            font-size: 12px;
            font-weight: 800;
            margin-bottom: 4px;
        }


        .bale-search-result-message {
            font-size: 11px;
            color: var(--bale-muted);
            line-height: 1.8;
        }


        .bale-highlight {
            background: #fff0a8;
            color: #222;
            border-radius: 3px;
            padding: 0 2px;
        }


        /* =====================================================
           MODAL
           ===================================================== */

        .bale-modal {
            position: fixed;
            inset: 0;
            z-index: 11000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }


        .bale-modal-backdrop {
            position: absolute;
            inset: 0;
            background: rgba(15, 23, 42, .4);
        }


        .bale-modal-content {
            position: relative;
            width: min(440px, 100%);
            background: #fff;
            border-radius: 18px;
            box-shadow: 0 25px 80px rgba(0,0,0,.2);
            overflow: hidden;
        }


        .bale-modal-header {
            padding: 18px 20px;
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            border-bottom: 1px solid var(--bale-border);
        }


        .bale-modal-header div {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }


        .bale-modal-header strong {
            font-size: 15px;
        }


        .bale-modal-header span {
            color: var(--bale-muted);
            font-size: 10px;
        }


        .bale-modal-body {
            padding: 20px;
        }


        .bale-modal-body label {
            display: block;
            margin-bottom: 8px;
            font-size: 11px;
            font-weight: 700;
        }


        .bale-modal-body input {
            width: 100%;
            height: 44px;
            box-sizing: border-box;
            border: 1px solid var(--bale-border);
            border-radius: 11px;
            padding: 0 12px;
            outline: none;
            font-family: inherit;
            font-size: 12px;
        }


        .bale-modal-body input:focus {
            border-color: #a8d3ff;
            box-shadow: 0 0 0 3px rgba(22,135,248,.07);
        }


        .bale-modal-footer {
            display: flex;
            justify-content: flex-start;
            gap: 8px;
            padding: 15px 20px;
            border-top: 1px solid var(--bale-border);
        }


        .bale-primary-button,
        .bale-secondary-button {
            height: 40px;
            padding: 0 18px;
            border-radius: 10px;
            font-family: inherit;
            font-size: 11px;
            font-weight: 700;
            cursor: pointer;
            border: 0;
        }


        .bale-primary-button {
            background: var(--bale-primary);
            color: #fff;
        }


        .bale-secondary-button {
            background: #f1f4f8;
            color: #596274;
        }


        /* =====================================================
           MOBILE
           ===================================================== */

        @media (max-width: 800px) {

            .bale-sidebar {
                position: absolute;
                top: 0;
                right: 0;
                bottom: 0;
                transform: translateX(100%);
                transition: transform .25s ease;
                box-shadow: -10px 0 30px rgba(0,0,0,.1);
            }


            .bale-sidebar.mobile-open {
                transform: translateX(0);
            }


            .bale-close-sidebar,
            .bale-menu-button {
                display: inline-flex;
            }


            .bale-chat-header {
                padding: 0 10px;
            }


            .bale-chat-box {
                padding: 15px;
            }


            .bale-message {
                max-width: 85%;
            }


            .bale-input-area {
                padding: 10px;
            }

        }


        @media (max-width: 480px) {

            .bale-sidebar {
                width: 88%;
                min-width: 88%;
            }


            .bale-current-user strong {
                font-size: 12px;
            }


            .bale-chat-header-left .bale-icon-button:first-child {
                display: none;
            }


            .bale-input-hint {
                display: none;
            }

        }


        /* =====================================================
           DARK MODE
           ===================================================== */

        .bale-page.bale-dark {
            --bale-bg: #111827;
            --bale-panel: #182131;
            --bale-border: #293548;
            --bale-text: #e7edf7;
            --bale-muted: #9ba7b9;
            --bale-hover: #222e41;
            --bale-message: #22324a;
        }


        .bale-page.bale-dark,
        .bale-page.bale-dark .bale-chat {
            background: var(--bale-bg);
        }


        .bale-page.bale-dark .bale-sidebar,
        .bale-page.bale-dark .bale-chat-header,
        .bale-page.bale-dark .bale-input-area,
        .bale-page.bale-dark .bale-modal-content,
        .bale-page.bale-dark .bale-search-panel {
            background: var(--bale-panel);
        }


        .bale-page.bale-dark .bale-search-box,
        .bale-page.bale-dark .bale-input-wrapper textarea {
            background: #111827;
            color: var(--bale-text);
        }


        .bale-page.bale-dark .bale-message.incoming {
            background: #202c3e;
            color: var(--bale-text);
        }


        .bale-page.bale-dark .bale-session.active {
            background: #1c3550;
            border-color: #294d72;
        }

        `;

        document.head.appendChild(style);
    }


    /* =========================================================
       RENDER PAGE
       ========================================================= */

    function renderBalePage() {

        injectBaleStyles();

        const content = document.getElementById('settingsContent');

        if (!content) {
            console.error(
                'Bale UI: #settingsContent پیدا نشد.'
            );
            return;
        }

        content.innerHTML = getBalePageHTML();

        content.classList.add('bale-dashboard-content');

        const page = document.getElementById('balePage');

        if (page) {
            const savedTheme =
                localStorage.getItem('chatTheme');

            if (savedTheme === 'dark') {
                page.classList.add('bale-dark');
            }
        }

        initializeBaleEvents();

        loadBaleSessions();

        startBalePolling();
    }


    /* =========================================================
       INITIALIZE EVENTS
       ========================================================= */

    function initializeBaleEvents() {

        const searchInput =
            getElement('baleSessionSearch');

        const messageInput =
            getElement('baleMsgInput');

        const newChatInput =
            getElement('baleNewChatUsername');


        /* Session search */

        if (searchInput) {

            searchInput.addEventListener(
                'input',
                function () {

                    const query =
                        this.value.trim().toLowerCase();

                    if (!query) {
                        renderBaleSessions(BaleState.sessions);
                        return;
                    }

                    const filtered =
                        BaleState.sessions.filter(session => {

                            const username =
                                String(
                                    getSessionUsername(session)
                                ).toLowerCase();

                            return username.includes(query);
                        });

                    renderBaleSessions(filtered);

                }
            );

        }


        /* Message input */

        if (messageInput) {

            messageInput.addEventListener(
                'keydown',
                function (event) {

                    if (
                        event.key === 'Enter' &&
                        !event.shiftKey
                    ) {

                        event.preventDefault();

                        sendBaleMessage();
                    }

                }
            );


            messageInput.addEventListener(
                'input',
                function () {

                    this.style.height = 'auto';

                    this.style.height =
                        Math.min(
                            this.scrollHeight,
                            130
                        ) + 'px';

                }
            );

        }


        /* New chat Enter */

        if (newChatInput) {

            newChatInput.addEventListener(
                'keydown',
                function (event) {

                    if (event.key === 'Enter') {

                        event.preventDefault();

                        createBaleChat();
                    }

                }
            );

        }
    }


    /* =========================================================
       LOAD SESSIONS
       ========================================================= */

    async function loadBaleSessions(showNotification = false) {

        if (BaleState.isLoadingSessions) {
            return;
        }

        BaleState.isLoadingSessions = true;

        try {

            const response =
                await fetch(
                    `${BALE_CONFIG.API_BASE}/sessions`,
                    {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json'
                        }
                    }
                );

            if (!response.ok) {
                throw new Error(
                    `HTTP ${response.status}`
                );
            }

            const data =
                await response.json();

            let sessions = [];

            if (Array.isArray(data)) {
                sessions = data;
            }
            else if (Array.isArray(data.sessions)) {
                sessions = data.sessions;
            }
            else if (Array.isArray(data.data)) {
                sessions = data.data;
            }

            BaleState.sessions = sessions;

            renderBaleSessions(
                BaleState.sessions
            );

            /*
             * اگر گفتگوی فعلی وجود دارد،
             * اطلاعات آن را از لیست جدید بروز می‌کنیم.
             */

            if (BaleState.currentSession) {

                const currentId =
                    getSessionId(
                        BaleState.currentSession
                    );

                const updatedSession =
                    BaleState.sessions.find(
                        session =>
                            String(
                                getSessionId(session)
                            ) === String(currentId)
                    );

                if (updatedSession) {

                    BaleState.currentSession =
                        updatedSession;

                    updateBaleChatHeader(
                        updatedSession
                    );
                }
            }


            if (showNotification) {
                baleNotify(
                    'گفتگوها بروزرسانی شدند.',
                    'success'
                );
            }

        }
        catch (error) {

            console.error(
                'Bale sessions error:',
                error
            );

            renderBaleSessions([]);

            baleNotify(
                'دریافت گفتگوهای بله با خطا مواجه شد.',
                'error'
            );

        }
        finally {

            BaleState.isLoadingSessions = false;

        }
    }


    /* =========================================================
       RENDER SESSIONS
       ========================================================= */

    function renderBaleSessions(sessions) {

        const container =
            getElement('baleSessions');

        if (!container) {
            return;
        }

        if (!sessions || sessions.length === 0) {

            container.innerHTML = `
                <div class="bale-no-sessions">
                    گفتگویی پیدا نشد.
                </div>
            `;

            return;
        }


        container.innerHTML =
            sessions.map(session => {

                const sessionId =
                    getSessionId(session);

                const username =
                    getSessionUsername(session);

                const active =
                    BaleState.currentSession &&
                    String(
                        getSessionId(
                            BaleState.currentSession
                        )
                    ) === String(sessionId);


                const updatedAt =
                    session.updated_at ??
                    session.updatedAt ??
                    session.created_at ??
                    session.createdAt ??
                    null;


                const lastMessage =
                    session.last_message ??
                    session.lastMessage ??
                    session.message ??
                    'برای مشاهده پیام‌ها کلیک کنید';


                return `
                    <div
                        class="bale-session ${active ? 'active' : ''}"
                        data-session-id="${escapeHtml(sessionId)}"
                        onclick="window.selectBaleSession('${escapeHtml(sessionId)}')"
                    >

                        <div class="bale-session-avatar">
                            <img
                                src="${BALE_CONFIG.ASSETS.defaultAvatar}"
                                alt=""
                                onerror="this.style.display='none'"
                            >
                        </div>


                        <div class="bale-session-info">

                            <span class="bale-session-name">
                                ${escapeHtml(username)}
                            </span>

                            <span class="bale-session-preview">
                                ${escapeHtml(lastMessage)}
                            </span>

                        </div>


                        <div class="bale-session-meta">

                            <span class="bale-session-time">
                                ${formatTime(updatedAt)}
                            </span>

                        </div>

                    </div>
                `;

            }).join('');
    }


    /* =========================================================
       SELECT SESSION
       ========================================================= */

    async function selectBaleSession(sessionId) {

        const session =
            BaleState.sessions.find(
                item =>
                    String(
                        getSessionId(item)
                    ) === String(sessionId)
            );


        if (!session) {
            return;
        }


        BaleState.currentSession = session;

        BaleState.currentUserId =
            getSessionUserId(session);


        BaleState.isInitialMessageLoad = true;


        updateBaleChatHeader(session);

        enableBaleMessageInput();

        renderBaleSessions(
            BaleState.sessions
        );


        if (window.innerWidth <= 800) {
            closeBaleSidebar();
        }


        await loadBaleMessages();
    }


    /* =========================================================
       UPDATE CHAT HEADER
       ========================================================= */

    function updateBaleChatHeader(session) {

        const username =
            getSessionUsername(session);


        const usernameElement =
            getElement('baleChatUsername');

        const statusElement =
            getElement('baleChatStatus');


        if (usernameElement) {
            usernameElement.textContent =
                username;
        }


        if (statusElement) {
            statusElement.textContent =
                'گفتگوی فعال در ربات بله';
        }
    }


    /* =========================================================
       ENABLE INPUT
       ========================================================= */

    function enableBaleMessageInput() {

        const input =
            getElement('baleMsgInput');

        const button =
            getElement('baleSendButton');


        if (input) {
            input.disabled = false;
            input.placeholder =
                'پیام خود را بنویسید...';
        }


        if (button) {
            button.disabled = false;
        }
    }


    function disableBaleMessageInput() {

        const input =
            getElement('baleMsgInput');

        const button =
            getElement('baleSendButton');


        if (input) {
            input.disabled = true;
        }


        if (button) {
            button.disabled = true;
        }
    }


    /* =========================================================
       LOAD MESSAGES
       ========================================================= */

    async function loadBaleMessages() {

        if (
            !BaleState.currentSession ||
            BaleState.isLoadingMessages
        ) {
            return;
        }


        const sessionId =
            getSessionId(
                BaleState.currentSession
            );


        if (!sessionId) {
            return;
        }


        BaleState.isLoadingMessages = true;


        const chatBox =
            getElement('baleChatBox');


        const wasAtBottom =
            chatBox
                ? (
                    chatBox.scrollHeight -
                    chatBox.scrollTop -
                    chatBox.clientHeight
                ) < 100
                : true;


        const firstLoad =
            BaleState.isInitialMessageLoad;


        try {

            const response =
                await fetch(
                    `${BALE_CONFIG.API_BASE}/messages/${encodeURIComponent(sessionId)}`,
                    {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json'
                        }
                    }
                );


            if (!response.ok) {
                throw new Error(
                    `HTTP ${response.status}`
                );
            }


            const data =
                await response.json();


            let messages = [];

            if (Array.isArray(data)) {
                messages = data;
            }
            else if (Array.isArray(data.messages)) {
                messages = data.messages;
            }
            else if (Array.isArray(data.data)) {
                messages = data.data;
            }


            BaleState.messages = messages;

            renderBaleMessages(messages);


            if (chatBox && (wasAtBottom || firstLoad)) {

                requestAnimationFrame(() => {

                    chatBox.scrollTop =
                        chatBox.scrollHeight;

                });

            }


            BaleState.isInitialMessageLoad = false;

        }
        catch (error) {

            console.error(
                'Bale messages error:',
                error
            );


            if (firstLoad) {

                renderBaleMessages([]);

                baleNotify(
                    'دریافت پیام‌ها با خطا مواجه شد.',
                    'error'
                );
            }

        }
        finally {

            BaleState.isLoadingMessages = false;

        }
    }


    /* =========================================================
       RENDER MESSAGES
       ========================================================= */

    function renderBaleMessages(messages) {

        const chatBox =
            getElement('baleChatBox');

        if (!chatBox) {
            return;
        }


        if (!messages || messages.length === 0) {

            chatBox.innerHTML = `
                <div class="bale-empty-chat">

                    <div class="bale-empty-icon">
                        💬
                    </div>

                    <h3>
                        هنوز پیامی وجود ندارد
                    </h3>

                    <p>
                        اولین پیام این گفتگو را ارسال کنید.
                    </p>

                </div>
            `;

            return;
        }


        const currentUserId =
            getCurrentUserId();


        chatBox.innerHTML =
            messages.map(message => {

                const text =
                    getMessageText(message);


                const senderId =
                    getMessageSenderId(message);


                /*
                 * اگر user_id پیام با user_id جلسه
                 * یکی باشد، پیام ورودی در نظر گرفته می‌شود.
                 *
                 * اگر API شما ساختار دیگری داشته باشد،
                 * این قسمت قابل تغییر است.
                 */

                const sessionUserId =
                    getSessionUserId(
                        BaleState.currentSession
                    );


                const isIncoming =
                    sessionUserId !== null &&
                    senderId !== null
                        ? String(senderId) === String(sessionUserId)
                        : false;


                const type =
                    isIncoming
                        ? 'incoming'
                        : 'outgoing';


                const date =
                    getMessageDate(message);


                const time =
                    formatTime(date) ||
                    formatTime(
                        new Date()
                    );


                return `
                    <div class="bale-message-row ${type}">

                        <div class="bale-message ${type}">

                            ${escapeHtml(text)}

                            <span class="bale-message-time">
                                ${escapeHtml(time)}
                            </span>

                        </div>

                    </div>
                `;

            }).join('');
    }


    /* =========================================================
       SEND MESSAGE
       ========================================================= */

    async function sendBaleMessage() {

        if (!BaleState.currentSession) {

            baleNotify(
                'ابتدا یک گفتگو را انتخاب کنید.',
                'warning'
            );

            return;
        }


        const input =
            getElement('baleMsgInput');

        const button =
            getElement('baleSendButton');


        if (!input) {
            return;
        }


        const text =
            input.value.trim();


        if (!text) {
            return;
        }


        const sessionId =
            getSessionId(
                BaleState.currentSession
            );


        const userId =
            getCurrentUserId();


        if (!sessionId) {

            baleNotify(
                'شناسه گفتگو پیدا نشد.',
                'error'
            );

            return;
        }


        if (
            userId === null ||
            userId === undefined
        ) {

            baleNotify(
                'شناسه کاربر پیدا نشد.',
                'error'
            );

            return;
        }


        const oldText =
            input.value;


        input.value = '';

        input.style.height = 'auto';

        input.disabled = true;

        if (button) {
            button.disabled = true;
        }


        try {

            const response =
                await fetch(
                    BALE_CONFIG.SEND_WEBHOOK,
                    {
                        method: 'POST',

                        headers: {
                            'Content-Type':
                                'application/json',
                            'Accept':
                                'application/json'
                        },

                        body: JSON.stringify({
                            session_id:
                                sessionId,

                            user_id:
                                userId,

                            message:
                                text
                        })
                    }
                );


            if (!response.ok) {

                throw new Error(
                    `HTTP ${response.status}`
                );

            }


            /*
             * پیام‌ها از API اصلی دوباره خوانده می‌شوند.
             */

            await loadBaleMessages();


        }
        catch (error) {

            console.error(
                'Bale send message error:',
                error
            );


            input.value =
                oldText;


            baleNotify(
                'ارسال پیام با خطا مواجه شد.',
                'error'
            );

        }
        finally {

            input.disabled = false;

            if (button) {
                button.disabled = false;
            }

            input.focus();
        }
    }


    /* =========================================================
       CREATE NEW CHAT
       ========================================================= */

    async function createBaleChat() {

        const input =
            getElement('baleNewChatUsername');


        if (!input) {
            return;
        }


        const username =
            input.value.trim();


        if (!username) {

            baleNotify(
                'نام کاربری را وارد کنید.',
                'warning'
            );

            input.focus();

            return;
        }


        const button =
            document.querySelector(
                '#baleNewChatModal .bale-primary-button'
            );


        if (button) {
            button.disabled = true;
            button.textContent =
                'در حال ایجاد...';
        }


        try {

            const response =
                await fetch(
                    BALE_CONFIG.CREATE_CHAT_WEBHOOK,
                    {
                        method: 'POST',

                        headers: {
                            'Content-Type':
                                'application/json',

                            'Accept':
                                'application/json'
                        },

                        body: JSON.stringify({
                            username: username
                        })
                    }
                );


            if (!response.ok) {

                throw new Error(
                    `HTTP ${response.status}`
                );

            }


            let createdData = null;

            try {
                createdData =
                    await response.json();
            }
            catch (e) {
                createdData = null;
            }


            closeBaleNewChatModal();


            input.value = '';


            baleNotify(
                'گفتگوی جدید ایجاد شد.',
                'success'
            );


            await loadBaleSessions();


            /*
             * اگر API شناسه session را برگرداند،
             * سعی می‌کنیم همان گفتگو را باز کنیم.
             */

            const returnedSessionId =
                createdData?.session_id ??
                createdData?.sessionId ??
                createdData?.id;


            if (returnedSessionId) {

                const newSession =
                    BaleState.sessions.find(
                        session =>
                            String(
                                getSessionId(session)
                            ) === String(
                                returnedSessionId
                            )
                    );


                if (newSession) {

                    await selectBaleSession(
                        returnedSessionId
                    );

                    return;
                }
            }


            /*
             * در غیر این صورت کاربری که نامش
             * با username یکی است را پیدا می‌کنیم.
             */

            const newSession =
                BaleState.sessions.find(
                    session =>
                        String(
                            getSessionUsername(session)
                        ).toLowerCase() ===
                        String(username).toLowerCase()
                );


            if (newSession) {

                await selectBaleSession(
                    getSessionId(newSession)
                );
            }

        }
        catch (error) {

            console.error(
                'Bale create chat error:',
                error
            );


            baleNotify(
                'ایجاد گفتگوی جدید با خطا مواجه شد.',
                'error'
            );

        }
        finally {

            if (button) {

                button.disabled = false;

                button.textContent =
                    'ایجاد گفتگو';
            }
        }
    }


    /* =========================================================
       SEARCH
       ========================================================= */

    async function searchBaleMessages(query) {

        query =
            String(query || '').trim().toLowerCase();


        if (!query) {
            return;
        }


        const overlay =
            getElement('baleSearchOverlay');

        const resultsContainer =
            getElement('baleSearchResults');


        if (!overlay || !resultsContainer) {
            return;
        }


        overlay.style.display = 'flex';


        resultsContainer.innerHTML = `
            <div class="bale-loading">
                <div class="bale-spinner"></div>
                <span>در حال جستجو...</span>
            </div>
        `;


        const results = [];


        try {

            /*
             * ابتدا گفتگوها را دریافت می‌کنیم.
             */

            const sessionsResponse =
                await fetch(
                    `${BALE_CONFIG.API_BASE}/sessions`
                );


            if (!sessionsResponse.ok) {
                throw new Error(
                    'خطا در دریافت گفتگوها'
                );
            }


            const sessionsData =
                await sessionsResponse.json();


            let sessions = [];

            if (Array.isArray(sessionsData)) {
                sessions = sessionsData;
            }
            else if (
                Array.isArray(
                    sessionsData.sessions
                )
            ) {
                sessions =
                    sessionsData.sessions;
            }
            else if (
                Array.isArray(
                    sessionsData.data
                )
            ) {
                sessions =
                    sessionsData.data;
            }


            /*
             * پیام‌های هر گفتگو را بررسی می‌کنیم.
             */

            for (const session of sessions) {

                const sessionId =
                    getSessionId(session);


                if (!sessionId) {
                    continue;
                }


                try {

                    const response =
                        await fetch(
                            `${BALE_CONFIG.API_BASE}/messages/${encodeURIComponent(sessionId)}`
                        );


                    if (!response.ok) {
                        continue;
                    }


                    const data =
                        await response.json();


                    let messages = [];

                    if (Array.isArray(data)) {
                        messages = data;
                    }
                    else if (
                        Array.isArray(
                            data.messages
                        )
                    ) {
                        messages =
                            data.messages;
                    }
                    else if (
                        Array.isArray(
                            data.data
                        )
                    ) {
                        messages =
                            data.data;
                    }


                    messages.forEach(message => {

                        const text =
                            getMessageText(
                                message
                            );


                        if (
                            String(text)
                                .toLowerCase()
                                .includes(query)
                        ) {

                            results.push({
                                session,
                                message
                            });

                        }

                    });

                }
                catch (error) {

                    console.warn(
                        'Search session error:',
                        error
                    );

                }
            }


            BaleState.searchResults =
                results;


            renderBaleSearchResults(
                results,
                query
            );

        }
        catch (error) {

            console.error(
                'Bale search error:',
                error
            );


            resultsContainer.innerHTML = `
                <div class="bale-no-sessions">
                    جستجو با خطا مواجه شد.
                </div>
            `;
        }
    }


    function highlightText(text, query) {

        const safeText =
            escapeHtml(text);


        if (!query) {
            return safeText;
        }


        const escapedQuery =
            String(query)
                .replace(
                    /[.*+?^${}()|[\]\\]/g,
                    '\\$&'
                );


        try {

            return safeText.replace(
                new RegExp(
                    `(${escapedQuery})`,
                    'gi'
                ),
                '<span class="bale-highlight">$1</span>'
            );

        }
        catch (error) {

            return safeText;
        }
    }


    function renderBaleSearchResults(
        results,
        query
    ) {

        const container =
            getElement('baleSearchResults');


        if (!container) {
            return;
        }


        if (!results.length) {

            container.innerHTML = `
                <div class="bale-no-sessions">
                    نتیجه‌ای برای
                    «${escapeHtml(query)}»
                    پیدا نشد.
                </div>
            `;

            return;
        }


        container.innerHTML =
            results.map(
                (result, index) => {

                    const session =
                        result.session;

                    const message =
                        result.message;

                    const username =
                        getSessionUsername(
                            session
                        );

                    const text =
                        getMessageText(
                            message
                        );


                    return `
                        <div
                            class="bale-search-result"
                            onclick="window.openBaleSearchResult(${index})"
                        >

                            <div class="bale-search-result-name">
                                ${escapeHtml(username)}
                            </div>

                            <div class="bale-search-result-message">
                                ${highlightText(text, query)}
                            </div>

                        </div>
                    `;
                }
            ).join('');
    }


    async function openBaleSearchResult(index) {

        const result =
            BaleState.searchResults[index];


        if (!result) {
            return;
        }


        closeBaleSearch();


        const sessionId =
            getSessionId(
                result.session
            );


        if (sessionId) {

            await selectBaleSession(
                sessionId
            );
        }
    }


    function closeBaleSearch() {

        const overlay =
            getElement('baleSearchOverlay');

        if (overlay) {
            overlay.style.display = 'none';
        }
    }


    /* =========================================================
       MODAL
       ========================================================= */

    function openBaleNewChatModal() {

        const modal =
            getElement('baleNewChatModal');

        if (!modal) {
            return;
        }


        modal.style.display = 'flex';


        const input =
            getElement('baleNewChatUsername');


        if (input) {

            input.value = '';

            setTimeout(() => {
                input.focus();
            }, 100);

        }
    }


    function closeBaleNewChatModal() {

        const modal =
            getElement('baleNewChatModal');

        if (modal) {
            modal.style.display = 'none';
        }
    }


    /* =========================================================
       SIDEBAR
       ========================================================= */

    function toggleBaleSidebar() {

        const sidebar =
            getElement('baleSidebar');

        if (!sidebar) {
            return;
        }


        sidebar.classList.toggle(
            'mobile-open'
        );


        BaleState.isMobileSidebarOpen =
            sidebar.classList.contains(
                'mobile-open'
            );
    }


    function closeBaleSidebar() {

        const sidebar =
            getElement('baleSidebar');

        if (!sidebar) {
            return;
        }


        sidebar.classList.remove(
            'mobile-open'
        );


        BaleState.isMobileSidebarOpen =
            false;
    }


    /* =========================================================
       REFRESH
       ========================================================= */

    async function refreshBaleMessages() {

        if (!BaleState.currentSession) {

            baleNotify(
                'ابتدا یک گفتگو را انتخاب کنید.',
                'info'
            );

            return;
        }


        await loadBaleMessages();


        baleNotify(
            'پیام‌ها بروزرسانی شدند.',
            'success'
        );
    }


    /* =========================================================
       POLLING
       ========================================================= */

    function startBalePolling() {

        stopBalePolling();


        BaleState.sessionsInterval =
            setInterval(
                function () {

                    /*
                     * فقط اگر صفحه Bale هنوز باز است.
                     */

                    if (
                        document.getElementById(
                            'balePage'
                        )
                    ) {

                        loadBaleSessions();

                    }

                },
                BALE_CONFIG.POLL_SESSIONS_INTERVAL
            );


        BaleState.messagesInterval =
            setInterval(
                function () {

                    if (
                        document.getElementById(
                            'balePage'
                        ) &&
                        BaleState.currentSession
                    ) {

                        loadBaleMessages();

                    }

                },
                BALE_CONFIG.POLL_MESSAGES_INTERVAL
            );
    }


    function stopBalePolling() {

        if (BaleState.sessionsInterval) {

            clearInterval(
                BaleState.sessionsInterval
            );

            BaleState.sessionsInterval =
                null;
        }


        if (BaleState.messagesInterval) {

            clearInterval(
                BaleState.messagesInterval
            );

            BaleState.messagesInterval =
                null;
        }
    }


    /* =========================================================
       OPEN BALE PAGE
       ========================================================= */

    function openBaleChatPage() {

        const settingsLayout =
            document.querySelector(
                '.settings-layout'
            );


        const settingsContent =
            document.getElementById(
                'settingsContent'
            );


        if (!settingsLayout ||
            !settingsContent) {

            console.error(
                'Bale UI: ساختار داشبورد پیدا نشد.'
            );

            return;
        }


        /*
         * وضعیت فعلی داشبورد
         */

        if (typeof window.AppState !== 'undefined') {
            window.AppState.currentPage =
                'bale-chat';
        }


        /*
         * عنوان Header اصلی داشبورد
         */

        const headerTitle =
            document.getElementById(
                'headerTitle'
            );


        if (headerTitle) {
            headerTitle.textContent =
                'صفحه چت ربات بله';
        }


        /*
         * مخفی کردن Settings Navigation
         */

        settingsLayout.classList.add(
            'bale-dashboard-mode'
        );


        /*
         * دکمه باز کردن Settings در صورت وجود
         */

        const settingsToggle =
            document.getElementById(
                'settingsToggleBtn'
            );


        if (settingsToggle) {
            settingsToggle.style.display =
                'none';
        }


        /*
         * Sidebar داخلی Settings
         */

        const settingsNav =
            document.getElementById(
                'settingsNav'
            );


        if (settingsNav) {
            settingsNav.style.display =
                'none';
        }


        const overlay =
            document.getElementById(
                'settingsNavOverlay'
            );


        if (overlay) {
            overlay.style.display =
                'none';
        }


        /*
         * Render
         */

        renderBalePage();


        /*
         * active کردن آیتم sidebar
         */

        document
            .querySelectorAll('.sidebar-item')
            .forEach(item => {

                item.classList.remove(
                    'active'
                );

            });


        const baleSidebarItem =
            document.querySelector(
                '.sidebar-item[onclick*="openBaleChatPage"]'
            );


        if (baleSidebarItem) {
            baleSidebarItem.classList.add(
                'active'
            );
        }
    }


    /* =========================================================
       CLOSE BALE PAGE
       ========================================================= */

    function closeBaleChatPage() {

        stopBalePolling();


        const settingsLayout =
            document.querySelector(
                '.settings-layout'
            );


        if (settingsLayout) {

            settingsLayout.classList.remove(
                'bale-dashboard-mode'
            );

        }


        const settingsNav =
            document.getElementById(
                'settingsNav'
            );


        if (settingsNav) {
            settingsNav.style.display = '';
        }


        const overlay =
            document.getElementById(
                'settingsNavOverlay'
            );


        if (overlay) {
            overlay.style.display = '';
        }


        const settingsToggle =
            document.getElementById(
                'settingsToggleBtn'
            );


        if (settingsToggle) {
            settingsToggle.style.display = '';
        }


        const headerTitle =
            document.getElementById(
                'headerTitle'
            );


        if (headerTitle) {
            headerTitle.textContent =
                'تنظیمات سیستم';
        }


        BaleState.currentSession = null;
        BaleState.currentUserId = null;
        BaleState.messages = [];


        /*
         * برگشت به صفحه اصلی تنظیمات
         */

        if (
            typeof window.navigateTo ===
            'function'
        ) {

            window.navigateTo(
                'overview'
            );

        }
        else {

            const content =
                document.getElementById(
                    'settingsContent'
                );

            if (content) {
                content.innerHTML = '';
            }

        }
    }


    /* =========================================================
       THEME
       ========================================================= */

    function toggleBaleTheme() {

        const page =
            getElement('balePage');

        if (!page) {
            return;
        }


        page.classList.toggle(
            'bale-dark'
        );


        const isDark =
            page.classList.contains(
                'bale-dark'
            );


        localStorage.setItem(
            'chatTheme',
            isDark ? 'dark' : 'light'
        );
    }


    /* =========================================================
       PUBLIC API
       ========================================================= */

    window.openBaleChatPage =
        openBaleChatPage;

    window.closeBaleChatPage =
        closeBaleChatPage;

    window.loadBaleSessions =
        loadBaleSessions;

    window.selectBaleSession =
        selectBaleSession;

    window.sendBaleMessage =
        sendBaleMessage;

    window.createBaleChat =
        createBaleChat;

    window.openBaleNewChatModal =
        openBaleNewChatModal;

    window.closeBaleNewChatModal =
        closeBaleNewChatModal;

    window.toggleBaleSidebar =
        toggleBaleSidebar;

    window.closeBaleSidebar =
        closeBaleSidebar;

    window.refreshBaleMessages =
        refreshBaleMessages;

    window.searchBaleMessages =
        searchBaleMessages;

    window.closeBaleSearch =
        closeBaleSearch;

    window.openBaleSearchResult =
        openBaleSearchResult;

    window.toggleBaleTheme =
        toggleBaleTheme;


    /* =========================================================
       INITIAL CLEANUP
       ========================================================= */

    window.addEventListener(
        'beforeunload',
        function () {
            stopBalePolling();
        }
    );


})();
