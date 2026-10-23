/* =========================================================
   EITAA CHAT UI
   ========================================================= */

(function () {

    'use strict';


    /* =========================================================
       CONFIG
    ========================================================= */

    // The API runs on a different port; include the panel session cookie on every request.
    async function chatFetch(input, init = {}) {
        return window.fetch(input, {
            ...init,
            credentials: 'include',
            cache: init.cache || 'no-store'
        });
    }

    const EITAA_API =
        `${API_BASE}/api/chat/eitaa`;

    const EITAA_WEBHOOK =
        `${API_BASE}/api/chat/eitaa/webhook/send`;

    const EITAA_CREATE_CHAT_WEBHOOK =
        `${API_BASE}/api/chat/eitaa/webhook/create`;


    /*
     * Assets
     */
    const EITAA_LOGO =
        'img/navid.jpg';

    const EITAA_AVATAR =
        'img/eitaa.png';


    /* =========================================================
       STATE
       ========================================================= */

    let unread = {};

    let lastSessionUpdate = {};

    let currentSession = null;

    let currentUserId = null;

    let lastMessageCount = 0;

    let isInitialLoad = true;

    let sessionsInterval = null;

    let messagesInterval = null;


    /* =========================================================
       HELPERS
       ========================================================= */

    function getEl(id) {

        return document.getElementById(id);

    }


    function escapeHtml(value) {

        if (
            value === null ||
            value === undefined
        ) {
            return '';
        }

        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');

    }


    function escapeRegex(value) {

        return String(value).replace(
            /[.*+?^${}()|[\]\\]/g,
            '\\$&'
        );

    }


    function notify(message) {

        if (
            typeof window.showToast ===
            'function'
        ) {

            window.showToast(message);

            return;
        }

        alert(message);

    }


    /* =========================================================
       STYLES
       ========================================================= */

    function injectEitaaStyles() {

        if (
            document.getElementById(
                'eitaaChatStyles'
            )
        ) {
            return;
        }


        const style =
            document.createElement('style');

        style.id =
            'eitaaChatStyles';


        style.textContent = `

        /* =====================================================
           ROOT
           ===================================================== */

        #eitaaChatPageWrapper {

            --primary: #4da6ff;
            --primary-dark: #3399ff;
            --primary-light: #80c4ff;
            --secondary: #66b3ff;
            --accent: #7c4dff;

            --bg-dark: #f0f4f8;
            --bg-sidebar: #ffffff;
            --bg-chat: #e8f0fe;
            --bg-input: #ffffff;

            --text-primary: #1a1a2e;
            --text-secondary: #5a6c7d;
            --text-muted: #8899aa;

            --msg-user:
                linear-gradient(
                    135deg,
                    #4da6ff 0%,
                    #80c4ff 100%
                );

            --msg-bot:
                linear-gradient(
                    135deg,
                    #ffffff 0%,
                    #f8fafc 100%
                );

            --shadow-soft:
                0 4px 20px rgba(
                    0,
                    0,
                    0,
                    0.08
                );

            --shadow-glow:
                0 0 30px rgba(
                    77,
                    166,
                    255,
                    0.15
                );

            --radius: 16px;
            --radius-sm: 10px;

            --border-color:
                rgba(
                    0,
                    0,
                    0,
                    0.08
                );

            width: 100%;
            height: 100%;
            min-height: 0;

            font-family:
                'Vazirmatn',
                Tahoma,
                sans-serif;

            color:
                var(--text-primary);

            background:
                var(--bg-dark);

            overflow: hidden;
        }


        /* =====================================================
           DARK THEME
           ===================================================== */

        #eitaaChatPageWrapper[data-theme="dark"] {

            --bg-dark: #101722;
            --bg-sidebar: #18212d;
            --bg-chat: #111a26;
            --bg-input: #202b38;

            --text-primary: #f1f5f9;
            --text-secondary: #b6c2cf;
            --text-muted: #8290a0;

            --msg-bot:
                linear-gradient(
                    135deg,
                    #202b38 0%,
                    #1b2530 100%
                );

            --border-color:
                rgba(
                    255,
                    255,
                    255,
                    0.08
                );
        }


        /* =====================================================
           DASHBOARD AREA
           ===================================================== */

        .main-content.eitaa-chat-host {

            height: 100vh;

            min-height: 0 !important;

            display: flex;

            flex-direction: column;

            overflow: hidden !important;
        }


        .main-content.eitaa-chat-host
        .settings-layout.eitaa-chat-active {

            flex: 1 1 auto !important;

            width: 100%;

            height: auto !important;

            min-height: 0 !important;

            overflow: hidden !important;

            display: flex !important;
        }


        .main-content.eitaa-chat-host
        .settings-nav {

            display: none !important;
        }


        .main-content.eitaa-chat-host
        .settings-nav-overlay {

            display: none !important;
        }


        .main-content.eitaa-chat-host
        .settings-content {

            flex: 1 1 auto !important;

            width: 100% !important;

            height: auto !important;

            min-height: 0 !important;

            max-height: none !important;

            padding: 0 !important;

            margin: 0 !important;

            overflow: hidden !important;
        }


        /* =====================================================
           CONTAINER
           ===================================================== */

        #eitaaChatPageWrapper {

            width: 100%;

            height: 100%;

            min-height: 0;

            max-height: 100%;

            position: relative;

            overflow: hidden;

            margin: 0;

            padding: 0;
        }


        #eitaaChatPageWrapper .container {

            display: flex;

            width: 100%;

            height: 100%;

            min-height: 0;

            max-height: 100%;

            position: relative;

            overflow: hidden;

            margin: 0;

            padding: 0;
        }


        /* =====================================================
           USERS / SIDEBAR
           ===================================================== */

        #eitaaChatPageWrapper .users {

            width: 360px;

            height: 100%;

            min-height: 0;

            max-height: 100%;

            flex: 0 0 360px;

            display: flex;

            flex-direction: column;

            background:
                var(--bg-sidebar);

            border-left:
                1px solid var(--border-color);

            overflow: hidden;

            transition:
                transform 0.3s
                cubic-bezier(
                    0.4,
                    0,
                    0.2,
                    1
                );
        }


        /* =====================================================
           USERS HEADER
           ===================================================== */

        #eitaaChatPageWrapper .users-header {

            display: flex;

            align-items: center;

            justify-content: space-between;

            gap: 12px;

            padding: 16px;

            background:
                var(--bg-sidebar);

            border-bottom:
                1px solid var(--border-color);

            flex: 0 0 auto;
        }


        #eitaaChatPageWrapper .header-content {

            display: flex;

            align-items: center;

            gap: 10px;

            min-width: 0;
        }


        #eitaaChatPageWrapper .logo-container {

            width: 44px;

            height: 44px;

            flex: 0 0 44px;

            border-radius: 50%;

            overflow: hidden;

            box-shadow:
                var(--shadow-soft);
        }


        #eitaaChatPageWrapper .logo-container img {

            width: 100%;

            height: 100%;

            object-fit: cover;
        }


        #eitaaChatPageWrapper .header-text {

            min-width: 0;
        }


        #eitaaChatPageWrapper .header-text h1 {

            margin: 0;

            font-size: 16px;

            font-weight: 700;

            color:
                var(--text-primary);
        }


        #eitaaChatPageWrapper .header-text span {

            display: block;

            margin-top: 3px;

            font-size: 15px;

            color:
                var(--text-muted);
        }


        #eitaaChatPageWrapper
        .header-actions-sidebar {

            display: flex;

            align-items: center;

            gap: 6px;

            flex-shrink: 0;
        }


        #eitaaChatPageWrapper .header-btn {

            width: 40px;

            height: 40px;

            border:
                1px solid var(--border-color);

            border-radius:
                var(--radius-sm);

            background:
                var(--bg-input);

            color:
                var(--text-primary);

            cursor: pointer;

            display: flex;

            align-items: center;

            justify-content: center;

            font-size: 18px;

            transition:
                all 0.2s ease;
        }


        #eitaaChatPageWrapper .header-btn:hover {

            transform:
                translateY(-1px);

            border-color:
                var(--primary);

            color:
                var(--primary);

            box-shadow:
                var(--shadow-glow);
        }


        /* =====================================================
           SESSIONS
           ===================================================== */

        #eitaaChatPageWrapper #eitaaSessions {

            flex: 1 1 auto;

            min-height: 0;

            overflow-y: auto;

            overflow-x: hidden;

            padding: 12px;

            background:
                var(--bg-sidebar);
        }


        #eitaaChatPageWrapper
        #eitaaSessions::-webkit-scrollbar {

            width: 6px;
        }


        #eitaaChatPageWrapper
        #eitaaSessions::-webkit-scrollbar-thumb {

            background:
                rgba(
                    100,
                    100,
                    100,
                    0.25
                );

            border-radius: 20px;
        }


        /* =====================================================
           USER
           ===================================================== */

        #eitaaChatPageWrapper .user {

            position: relative;

            display: flex;

            align-items: center;

            justify-content: space-between;

            gap: 10px;

            padding: 12px;

            margin-bottom: 8px;

            border-radius:
                var(--radius-sm);

            cursor: pointer;

            background:
                transparent;

            border:
                1px solid transparent;

            transition:
                all 0.2s ease;
        }


        #eitaaChatPageWrapper .user:hover {

            background:
                rgba(
                    77,
                    166,
                    255,
                    0.07
                );
        }


        #eitaaChatPageWrapper .user.active {

            background:
                rgba(
                    77,
                    166,
                    255,
                    0.12
                );

            border-color:
                rgba(
                    77,
                    166,
                    255,
                    0.2
                );
        }


        #eitaaChatPageWrapper .user-content {

            display: flex;

            align-items: center;

            gap: 10px;

            min-width: 0;
        }


        #eitaaChatPageWrapper .user-avatar {

            width: 44px;

            height: 44px;

            flex: 0 0 44px;

            border-radius: 50%;

            display: flex;

            align-items: center;

            justify-content: center;

            background:
                linear-gradient(
                    135deg,
                    var(--primary),
                    var(--primary-light)
                );

            color: #fff;

            font-size: 17px;

            font-weight: 700;
        }


        #eitaaChatPageWrapper .user-info {

            min-width: 0;
        }


        #eitaaChatPageWrapper .uid {

            font-size: 15px;

            font-weight: 700;

            color:
                var(--text-primary);

            white-space: nowrap;

            overflow: hidden;

            text-overflow: ellipsis;
        }


        #eitaaChatPageWrapper .user-title {

            margin-top: 2px;

            font-size: 15px;

            color:
                var(--text-secondary);

            white-space: nowrap;

            overflow: hidden;

            text-overflow: ellipsis;
        }


        #eitaaChatPageWrapper .utime {

            margin-top: 3px;

            font-size: 15px;

            color:
                var(--text-muted);
        }


        /* =====================================================
           CHAT
           ===================================================== */

        #eitaaChatPageWrapper .chat {

            flex: 1 1 auto;

            min-width: 0;

            min-height: 0;

            width: auto;

            height: 100%;

            max-height: 100%;

            display: flex;

            flex-direction: column;

            background:
                var(--bg-chat);

            position: relative;

            overflow: hidden;
        }


        /* =====================================================
           CHAT HEADER
           ===================================================== */

        #eitaaChatPageWrapper .chat-header {

            flex: 0 0 auto;

            min-height: 72px;

            display: flex;

            align-items: center;

            gap: 12px;

            padding: 12px 20px;

            background:
                var(--bg-sidebar);

            border-bottom:
                1px solid var(--border-color);

            position: relative;

            z-index: 5;
        }


        #eitaaChatPageWrapper
        .chat-header-avatar {

            width: 44px;

            height: 44px;

            flex: 0 0 44px;

            border-radius: 50%;

            overflow: hidden;

            background:
                var(--primary);
        }


        #eitaaChatPageWrapper
        .chat-header-avatar img {

            width: 100%;

            height: 100%;

            object-fit: cover;
        }


        #eitaaChatPageWrapper
        .chat-header-info {

            min-width: 0;
        }


        #eitaaChatPageWrapper
        .chat-header-info h2 {

            margin: 0;

            font-size: 16px;

            color:
                var(--text-primary);
        }


        #eitaaChatPageWrapper
        .chat-header-info span {

            display: block;

            margin-top: 4px;

            font-size: 13px;

            color:
                var(--text-secondary);
        }


        #eitaaChatPageWrapper .status-dot {

            display: inline-block;

            width: 7px;

            height: 7px;

            border-radius: 50%;

            background: #31c48d;

            margin-left: 4px;
        }


        #eitaaChatPageWrapper
        .mobile-back-btn {

            display: none;

            width: 38px;

            height: 38px;

            align-items: center;

            justify-content: center;

            border:
                1px solid var(--border-color);

            background:
                var(--bg-input);

            color:
                var(--text-primary);

            border-radius:
                var(--radius-sm);

            cursor: pointer;

            font-size: 20px;
        }


        /* =====================================================
           CHAT BOX
           ===================================================== */

        #eitaaChatPageWrapper .chat-box {

            flex: 1 1 auto;

            min-height: 0 !important;

            height: auto !important;

            max-height: none !important;

            overflow-y: auto !important;

            overflow-x: hidden;

            padding: 24px;

            display: flex;

            flex-direction: column;

            gap: 14px;

            position: relative;

            z-index: 1;
        }


        #eitaaChatPageWrapper
        .chat-box::-webkit-scrollbar {

            width: 7px;
        }


        #eitaaChatPageWrapper
        .chat-box::-webkit-scrollbar-thumb {

            background:
                rgba(
                    100,
                    100,
                    100,
                    0.25
                );

            border-radius: 20px;
        }


        /* =====================================================
           MESSAGE
           ===================================================== */

        /*
         * ربات:
         * پیام + آواتار سمت راست
         */

        #eitaaChatPageWrapper .message-wrapper {

            width: 100%;

            display: flex;

            align-items: flex-end;

            gap: 8px;

            box-sizing: border-box;

            direction: rtl;

            justify-content: flex-start;

            margin: 0;

            padding: 0;
        }


        /*
         * کاربر:
         * پیام + آواتار سمت چپ
         */

        #eitaaChatPageWrapper
        .message-wrapper.me-wrapper {

            direction: ltr;

            justify-content: flex-start;

            margin: 0;

            padding: 0;
        }


        /*
         * آواتار پیام
         */

        #eitaaChatPageWrapper .message-avatar {

            width: 38px;

            height: 38px;

            flex: 0 0 38px;

            border-radius: 50%;

            overflow: hidden;

            align-self: flex-end;
        }


        #eitaaChatPageWrapper
        .message-avatar img {

            width: 100%;

            height: 100%;

            display: block;

            object-fit: cover;

            border-radius: 50%;
        }


        /*
         * خود حباب پیام
         */

        #eitaaChatPageWrapper .message {

            max-width: 70%;

            min-width: 0;

            padding: 10px 14px;

            border-radius: 14px;

            font-size: 16px;

            line-height: 1.8;

            word-break: break-word;

            overflow-wrap: anywhere;

            direction: rtl;

            box-sizing: border-box;
        }


        /*
         * پیام کاربر
         */

        #eitaaChatPageWrapper
        .message.me {

            background:
                var(--msg-user);

            color: #fff;

            border-bottom-left-radius: 4px;

            border-bottom-right-radius: 14px;
        }


        /*
         * پیام ربات
         */

        #eitaaChatPageWrapper
        .message.other {

            background:
                var(--msg-bot);

            color:
                var(--text-primary);

            border:
                1px solid var(--border-color);

            box-shadow:
                var(--shadow-soft);

            border-bottom-right-radius: 4px;

            border-bottom-left-radius: 14px;
        }


        /*
         * ساعت پیام
         */

        #eitaaChatPageWrapper
        .message-time {

            margin-top: 4px;

            font-size: 13px;

            opacity: 0.65;

            text-align: left;
        }


        /* =====================================================
           INPUT
           ===================================================== */

        #eitaaChatPageWrapper .input-box {

            display: flex;

            align-items: center;

            gap: 10px;

            padding: 12px 16px;

            background:
                var(--bg-sidebar);

            box-sizing: border-box;

            width: 100%;

            flex: 0 0 auto;

            min-height: 70px;
        }


        #eitaaChatPageWrapper .input-container {

            flex: 1 1 auto;

            min-width: 0;

            height: 46px;

            display: flex;

            align-items: center;

            background:
                var(--bg-input);

            border: none;

            outline: none;

            box-shadow: none;

            border-radius: 12px;

            overflow: hidden;

            box-sizing: border-box;
        }


        #eitaaChatPageWrapper
        .input-container input {

            width: 100%;

            height: 100%;

            border: none !important;

            outline: none !important;

            box-shadow: none !important;

            background:
                transparent;

            color:
                var(--text-primary);

            padding: 0 14px;

            margin: 0;

            font-family: inherit;

            font-size: 16px;

            box-sizing: border-box;
        }


        #eitaaChatPageWrapper
        .input-container input::placeholder {

            color:
                var(--text-muted);
        }


        #eitaaChatPageWrapper
        .input-container input:focus {

            border: none !important;

            outline: none !important;

            box-shadow: none !important;
        }


        /*
         * جلوگیری از استایل‌های عمومی Dashboard
         */

        #eitaaChatPageWrapper #eitaaMsgInput {

            border: none !important;

            outline: none !important;

            box-shadow: none !important;

            background:
                transparent !important;

            color:
                var(--text-primary) !important;
        }


        #eitaaChatPageWrapper
        #eitaaMsgInput:focus {

            border: none !important;

            outline: none !important;

            box-shadow: none !important;
        }


        /* =====================================================
           SEND BUTTON
           ===================================================== */

        #eitaaChatPageWrapper .send-btn {

            width: 46px;

            height: 46px;

            min-width: 46px;

            max-width: 46px;

            padding: 0;

            margin: 0;

            border: none !important;

            outline: none !important;

            box-shadow: none !important;

            border-radius: 12px;

            display: flex;

            align-items: center;

            justify-content: center;

            cursor: pointer;

            box-sizing: border-box;

            flex: 0 0 46px;

            background:
                var(--primary);

            color: #fff;

            font-size: 20px;
        }


        #eitaaChatPageWrapper
        .send-btn:hover {

            transform:
                translateY(-1px);

            background:
                var(--primary-dark);
        }


        #eitaaChatPageWrapper
        .send-btn:disabled {

            opacity: 0.6;

            cursor: not-allowed;

            transform: none;
        }


        /* =====================================================
           EMPTY
           ===================================================== */

        #eitaaChatPageWrapper .empty-state {

            flex: 1;

            display: flex;

            flex-direction: column;

            align-items: center;

            justify-content: center;

            text-align: center;

            color:
                var(--text-muted);
        }


        #eitaaChatPageWrapper
        .empty-state-icon {

            font-size: 48px;

            margin-bottom: 12px;

            opacity: 0.65;
        }


        #eitaaChatPageWrapper
        .empty-state h3 {

            margin: 0 0 8px;

            font-size: 16px;

            color:
                var(--text-primary);
        }


        #eitaaChatPageWrapper
        .empty-state p {

            margin: 0;

            font-size: 13px;

            line-height: 1.8;
        }


        /* =====================================================
           SEARCH
           ===================================================== */

        #eitaaChatPageWrapper .search-overlay {

            position: fixed;

            inset: 0;

            z-index: 10000;

            display: none;

            align-items: center;

            justify-content: center;

            background:
                rgba(
                    0,
                    0,
                    0,
                    0.45
                );

            padding: 20px;
        }


        #eitaaChatPageWrapper
        .search-overlay.active {

            display: flex;
        }


        #eitaaChatPageWrapper
        .search-container {

            width: min(
                700px,
                95%
            );

            max-height: 85vh;

            display: flex;

            flex-direction: column;

            background:
                var(--bg-sidebar);

            border-radius:
                var(--radius);

            box-shadow:
                var(--shadow-soft);

            overflow: hidden;
        }


        #eitaaChatPageWrapper
        .search-header {

            display: flex;

            align-items: center;

            justify-content: space-between;

            padding: 18px;

            border-bottom:
                1px solid var(--border-color);
        }


        #eitaaChatPageWrapper
        .search-header h3 {

            margin: 0;

            font-size: 15px;

            color:
                var(--text-primary);
        }


        #eitaaChatPageWrapper
        .search-close-btn {

            width: 34px;

            height: 34px;

            border: none;

            background:
                transparent;

            color:
                var(--text-secondary);

            cursor: pointer;

            font-size: 18px;
        }


        #eitaaChatPageWrapper
        .search-input-container {

            display: flex;

            gap: 8px;

            padding: 16px;
        }


        #eitaaChatPageWrapper
        .search-input {

            flex: 1;

            min-width: 0;

            border:
                1px solid var(--border-color);

            border-radius: 10px;

            padding: 11px;

            background:
                var(--bg-input);

            color:
                var(--text-primary);

            outline: none;

            font-family: inherit;
        }


        #eitaaChatPageWrapper
        .search-btn {

            padding: 0 18px;

            border: none;

            border-radius: 10px;

            background:
                var(--primary);

            color: #fff;

            cursor: pointer;

            font-family: inherit;
        }


        #eitaaChatPageWrapper
        .search-results {

            flex: 1;

            min-height: 0;

            overflow-y: auto;

            padding: 0 16px 16px;
        }


        #eitaaChatPageWrapper
        .search-result-item {

            padding: 12px;

            margin-bottom: 8px;

            border:
                1px solid var(--border-color);

            border-radius: 10px;

            background:
                var(--bg-input);
        }


        #eitaaChatPageWrapper
        .search-result-user {

            font-size: 15px;

            color:
                var(--primary);

            margin-bottom: 6px;
        }


        #eitaaChatPageWrapper
        .search-result-text {

            font-size: 15px;

            line-height: 1.8;

            color:
                var(--text-primary);
        }


        #eitaaChatPageWrapper
        .search-highlight {

            background:
                rgba(
                    255,
                    220,
                    80,
                    0.45
                );

            border-radius: 3px;

            padding: 1px 3px;
        }


        #eitaaChatPageWrapper
        .search-empty {

            padding: 50px 20px;

            text-align: center;

            color:
                var(--text-muted);
        }


        #eitaaChatPageWrapper
        .search-empty-icon {

            font-size: 42px;

            margin-bottom: 10px;
        }


        /* =====================================================
           MODAL
           ===================================================== */

        #eitaaChatPageWrapper .modal {

            position: fixed;

            inset: 0;

            z-index: 10001;

            display: none;

            align-items: center;

            justify-content: center;

            padding: 20px;

            background:
                rgba(
                    0,
                    0,
                    0,
                    0.45
                );
        }


        #eitaaChatPageWrapper
        .modal-content {

            width: min(
                430px,
                95%
            );

            padding: 24px;

            border-radius:
                var(--radius);

            background:
                var(--bg-sidebar);

            box-shadow:
                var(--shadow-soft);
        }


        #eitaaChatPageWrapper
        .modal-content h3 {

            margin: 0 0 18px;

            color:
                var(--text-primary);

            font-size: 16px;
        }


        #eitaaChatPageWrapper
        #eitaaUsernameInput {

            width: 100%;

            box-sizing: border-box;

            padding: 12px;

            border:
                1px solid var(--border-color);

            border-radius: 10px;

            background:
                var(--bg-input);

            color:
                var(--text-primary);

            outline: none;

            font-family: inherit;
        }


        #eitaaChatPageWrapper
        .modal-buttons {

            display: flex;

            gap: 8px;

            margin-top: 16px;
        }


        #eitaaChatPageWrapper
        .modal-buttons button {

            flex: 1;

            padding: 11px;

            border: none;

            border-radius: 10px;

            cursor: pointer;

            font-family: inherit;
        }


        #eitaaChatPageWrapper
        #eitaaCreateChatBtn {

            background:
                var(--primary);

            color: #fff;
        }


        #eitaaChatPageWrapper
        #eitaaCloseModalBtn {

            background:
                rgba(
                    100,
                    100,
                    100,
                    0.1
                );

            color:
                var(--text-primary);
        }


        /* =====================================================
           SPINNER
           ===================================================== */

        #eitaaChatPageWrapper .spinner {

            width: 18px;

            height: 18px;

            border:
                2px solid rgba(
                    255,
                    255,
                    255,
                    0.45
                );

            border-top-color:
                #ffffff;

            border-radius: 50%;

            animation:
                eitaaSpin 0.7s linear infinite;
        }


        @keyframes eitaaSpin {

            to {
                transform: rotate(360deg);
            }

        }

/* ===== FIX: Eitaa full-height page ===== */

.main-content.eitaa-chat-host {
    height: 100vh !important;
    min-height: 0 !important;
    max-height: 100vh !important;
    overflow: hidden !important;
}

.main-content.eitaa-chat-host .settings-layout.eitaa-chat-active {
    height: 100% !important;
    min-height: 0 !important;
    max-height: 100% !important;
    overflow: hidden !important;
}

.main-content.eitaa-chat-host .settings-content {
    height: 100% !important;
    min-height: 0 !important;
    max-height: 100% !important;
    padding: 0 !important;
    margin: 0 !important;
    overflow: hidden !important;
}

#eitaaChatPageWrapper {
    height: 100% !important;
    min-height: 0 !important;
    max-height: 100% !important;
    overflow: hidden !important;
}

#eitaaChatPageWrapper .container {
    height: 100% !important;
    min-height: 0 !important;
    max-height: 100% !important;
    overflow: hidden !important;
}

#eitaaChatPageWrapper .chat {
    height: 100% !important;
    min-height: 0 !important;
    max-height: 100% !important;
    overflow: hidden !important;
}

#eitaaChatPageWrapper .chat-box {
    flex: 1 1 auto !important;
    min-height: 0 !important;
    height: auto !important;
    max-height: none !important;
    overflow-y: auto !important;
}

#eitaaChatPageWrapper .input-box {
    flex: 0 0 auto !important;
    margin: 0 !important;
}

        /* =====================================================
           MOBILE
           ===================================================== */

        @media (max-width: 768px) {

            #eitaaChatPageWrapper .users {

                width: 100%;

                flex: 0 0 100%;

                position: absolute;

                inset: 0;

                z-index: 10;

                transform:
                    translateX(0);
            }


            #eitaaChatPageWrapper .chat {

                width: 100%;

                position: absolute;

                inset: 0;

                height: 100%;

                transform:
                    translateX(100%);

                z-index: 20;
            }


            #eitaaChatPageWrapper
            .message {

                max-width: 85%;

                font-size: 15px;
            }


            #eitaaChatPageWrapper
            .message-wrapper {

                margin: 0;

                padding: 0;
            }


            #eitaaChatPageWrapper
            .message-wrapper.me-wrapper {

                margin: 0;

                padding: 0;
            }


            #eitaaChatPageWrapper
            .chat-box {

                padding: 16px;
            }


            #eitaaChatPageWrapper
            .input-box {

                padding: 10px 12px;

                gap: 8px;
            }


            #eitaaChatPageWrapper
            .input-container {

                height: 44px;
            }


            #eitaaChatPageWrapper
            .send-btn {

                width: 44px;

                height: 44px;

                min-width: 44px;

                max-width: 44px;

                flex-basis: 44px;
            }


            #eitaaChatPageWrapper
            .mobile-back-btn {

                display: flex !important;
            }


            #eitaaChatPageWrapper
            .users.show-chat {

                transform:
                    translateX(100%);
            }


            #eitaaChatPageWrapper
            .chat.show-chat {

                transform:
                    translateX(0);
            }


            #eitaaChatPageWrapper
            .chat.hide-chat {

                transform:
                    translateX(100%);
            }


            #eitaaChatPageWrapper
            .users-header {

                padding: 14px;
            }


            #eitaaChatPageWrapper
            .header-text h1 {

                font-size: 15px;
            }


            #eitaaChatPageWrapper
            .header-actions-sidebar {

                gap: 4px;
            }


            #eitaaChatPageWrapper
            .header-btn {

                width: 38px;

                height: 38px;
            }


            #eitaaChatPageWrapper
            .chat-header {

                padding: 12px 16px;
            }

        }

        `;


        document.head.appendChild(style);

    }


    /* =========================================================
       PAGE HTML
       ========================================================= */

    function getEitaaPageHTML() {

        return `

            <div
                id="eitaaChatPageWrapper"
                dir="rtl"
                data-theme="light"
            >

                <div class="container">

                    <!-- Sidebar -->

                    <div class="users">

                        <div class="users-header">

                            <div class="header-content">

                                <div class="logo-container">

                                    <img
                                        src="${EITAA_LOGO}"
                                        alt="سپهر سلامتی"
                                    >

                                </div>


                                <div class="header-text">

                                    <h1>
                                        سپهر سلامتی
                                    </h1>

                                    <span>
                                        ایتا - واحد تحول دیجیتال
                                    </span>

                                </div>

                            </div>


                            <div
                                class="header-actions-sidebar"
                            >

                                <button
                                    id="eitaaThemeToggleBtn"
                                    class="header-btn"
                                    title="تغییر تم"
                                    type="button"
                                >
                                    🌙
                                </button>


                                <button
                                    id="eitaaSearchSessionsBtn"
                                    class="header-btn"
                                    title="جستجوی پیام‌ها"
                                    type="button"
                                >
                                    🔍
                                </button>


                                <button
                                    id="eitaaNewChatBtn"
                                    class="header-btn"
                                    title="گفتگوی جدید"
                                    type="button"
                                >
                                    +
                                </button>

                            </div>

                        </div>


                        <div id="eitaaSessions"></div>

                    </div>


                    <!-- Chat -->

                    <div class="chat">

                        <div
                            class="chat-header"
                            id="eitaaChatHeader"
                        >

                            <div
                                class="empty-state"
                                style="
                                    width:100%;
                                    padding:60px 20px;
                                "
                            >

                                <div
                                    class="empty-state-icon"
                                >
                                    💬
                                </div>

                                <h3>
                                    به پنل مدیریت چت ایتا خوش آمدید
                                </h3>

                                <p>
                                    یک گفتگو را از لیست سمت راست انتخاب کنید
                                    <br>
                                    یا یک گفتگوی جدید ایجاد کنید
                                </p>

                            </div>

                        </div>


                        <div
                            class="chat-box"
                            id="eitaaChatBox"
                            style="display:none;"
                        ></div>


                        <div
                            class="input-box"
                            id="eitaaInputBox"
                            style="display:none;"
                        >

                            <div class="input-container">

                                <input
                                    id="eitaaMsgInput"
                                    placeholder="پیام خود را بنویسید..."
                                    autocomplete="off"
                                >

                            </div>


                            <button
                                class="send-btn"
                                id="eitaaSendMessageBtn"
                                title="ارسال پیام"
                                type="button"
                            >

                                <span>➤</span>

                            </button>

                        </div>

                    </div>

                </div>


                <!-- Search -->

                <div
                    class="search-overlay"
                    id="eitaaSearchOverlay"
                >

                    <div class="search-container">

                        <div class="search-header">

                            <h3>
                                🔍 جستجوی پیام‌ها
                            </h3>


                            <button
                                class="search-close-btn"
                                id="eitaaSearchCloseBtn"
                                type="button"
                            >
                                ✕
                            </button>

                        </div>


                        <div class="search-input-container">

                            <input
                                type="text"
                                class="search-input"
                                id="eitaaSearchInput"
                                placeholder="عبارت مورد نظر را جستجو کنید..."
                            >


                            <button
                                class="search-btn"
                                id="eitaaSearchBtn"
                                type="button"
                            >
                                جستجو
                            </button>

                        </div>


                        <div
                            class="search-results"
                            id="eitaaSearchResults"
                        ></div>

                    </div>

                </div>


                <!-- New Chat Modal -->

                <div
                    class="modal"
                    id="eitaaNewChatModal"
                >

                    <div class="modal-content">

                        <h3>
                            ایجاد گفتگوی جدید
                        </h3>


                        <input
                            id="eitaaUsernameInput"
                            type="text"
                            placeholder="نام کاربری را وارد کنید..."
                        >


                        <div class="modal-buttons">

                            <button
                                id="eitaaCreateChatBtn"
                                type="button"
                            >
                                ایجاد گفتگو
                            </button>


                            <button
                                id="eitaaCloseModalBtn"
                                type="button"
                            >
                                انصراف
                            </button>

                        </div>

                    </div>

                </div>

            </div>

        `;

    }


    /* =========================================================
       THEME
       ========================================================= */

    function initEitaaTheme() {

        const wrapper =
            getEl(
                'eitaaChatPageWrapper'
            );

        if (!wrapper) {
            return;
        }


        const savedTheme =
            localStorage.getItem(
                'eitaaChatTheme'
            ) || 'light';


        wrapper.setAttribute(
            'data-theme',
            savedTheme
        );


        updateEitaaThemeIcon(
            savedTheme
        );

    }


    function toggleEitaaTheme() {

        const wrapper =
            getEl(
                'eitaaChatPageWrapper'
            );

        if (!wrapper) {
            return;
        }


        const currentTheme =
            wrapper.getAttribute(
                'data-theme'
            ) || 'light';


        const newTheme =
            currentTheme === 'dark'
                ? 'light'
                : 'dark';


        wrapper.setAttribute(
            'data-theme',
            newTheme
        );


        localStorage.setItem(
            'eitaaChatTheme',
            newTheme
        );


        updateEitaaThemeIcon(
            newTheme
        );

    }


    function updateEitaaThemeIcon(
        theme
    ) {

        const btn =
            getEl(
                'eitaaThemeToggleBtn'
            );

        if (!btn) {
            return;
        }


        btn.textContent =
            theme === 'dark'
                ? '☀️'
                : '🌙';

    }


    /* =========================================================
       MODAL
       ========================================================= */

    function openEitaaModal() {

        const modal =
            getEl(
                'eitaaNewChatModal'
            );

        const input =
            getEl(
                'eitaaUsernameInput'
            );


        if (!modal) {
            return;
        }


        modal.style.display =
            'flex';


        if (input) {
            input.focus();
        }

    }


    function closeEitaaModal() {

        const modal =
            getEl(
                'eitaaNewChatModal'
            );

        const input =
            getEl(
                'eitaaUsernameInput'
            );


        if (modal) {
            modal.style.display =
                'none';
        }


        if (input) {
            input.value = '';
        }

    }


    /* =========================================================
       SEARCH
       ========================================================= */

    function openEitaaSearch() {

        const overlay =
            getEl(
                'eitaaSearchOverlay'
            );

        const input =
            getEl(
                'eitaaSearchInput'
            );

        const results =
            getEl(
                'eitaaSearchResults'
            );


        if (!overlay) {
            return;
        }


        overlay.classList.add(
            'active'
        );


        if (results) {

            results.innerHTML = `

                <div class="search-empty">

                    <div class="search-empty-icon">
                        🔍
                    </div>

                    <p>
                        عبارت مورد نظر را جستجو کنید
                    </p>

                </div>

            `;

        }


        if (input) {
            input.focus();
        }

    }


    function closeEitaaSearch() {

        const overlay =
            getEl(
                'eitaaSearchOverlay'
            );

        const input =
            getEl(
                'eitaaSearchInput'
            );


        if (overlay) {

            overlay.classList.remove(
                'active'
            );

        }


        if (input) {
            input.value = '';
        }

    }


    async function performEitaaSearch() {

        const input =
            getEl(
                'eitaaSearchInput'
            );

        const resultsContainer =
            getEl(
                'eitaaSearchResults'
            );


        if (
            !input ||
            !resultsContainer
        ) {
            return;
        }


        const query =
            input.value.trim();


        if (!query) {

            notify(
                'لطفاً عبارتی برای جستجو وارد کنید.'
            );

            return;
        }


        resultsContainer.innerHTML = `

            <div class="search-empty">

                <div
                    class="spinner"
                    style="
                        border-color:var(--primary);
                        border-top-color:transparent;
                    "
                ></div>

                <p style="margin-top:12px;">
                    در حال جستجو...
                </p>

            </div>

        `;


        try {

            const sessionsRes =
                await chatFetch(
                    EITAA_API +
                    '/sessions'
                );


            if (!sessionsRes.ok) {
                throw new Error(
                    'Sessions request failed'
                );
            }


            const sessions =
                await sessionsRes.json();


            let results = [];


            for (
                const session
                of sessions
            ) {

                const sid =
                    session.session_id ||
                    session.sessions_id ||
                    session.id;


                if (!sid) {
                    continue;
                }


                const messagesRes =
                    await chatFetch(
                        `${EITAA_API}/messages/${sid}`
                    );


                if (!messagesRes.ok) {
                    continue;
                }


                const messages =
                    await messagesRes.json();


                messages.forEach(
                    m => {

                        if (
                            m.message &&
                            String(
                                m.message
                            )
                            .toLowerCase()
                            .includes(
                                query.toLowerCase()
                            )
                        ) {

                            results.push({

                                userId:
                                    session.external_chat_id ||
                                    session.session_id ||
                                    session.user_id ||
                                    sid,

                                sessionTitle:
                                    session.title,

                                message:
                                    m.message,

                                senderType:
                                    m.sender_type

                            });

                        }

                    }
                );

            }


            if (
                results.length === 0
            ) {

                resultsContainer.innerHTML = `

                    <div class="search-empty">

                        <div
                            class="search-empty-icon"
                        >
                            😔
                        </div>

                        <p>
                            نتیجه‌ای یافت نشد
                        </p>

                    </div>

                `;

                return;
            }


            resultsContainer.innerHTML =
                results.map(
                    r => {

                        const safeMessage =
                            escapeHtml(
                                r.message
                            );


                        const highlightedMessage =
                            safeMessage.replace(
                                new RegExp(
                                    `(${escapeRegex(
                                        query
                                    )})`,
                                    'gi'
                                ),
                                '<span class="search-highlight">$1</span>'
                            );


                        return `

                            <div
                                class="search-result-item"
                            >

                                <div
                                    class="search-result-user"
                                >

                                    ${escapeHtml(
                                        r.userId
                                    )}

                                    •

                                    ${
                                        r.senderType ===
                                        'user'
                                            ? 'کاربر'
                                            : 'بات'
                                    }

                                </div>


                                <div
                                    class="search-result-text"
                                >
                                    ${highlightedMessage}
                                </div>

                            </div>

                        `;

                    }
                ).join('');


        } catch (err) {

            console.error(
                'Eitaa search error:',
                err
            );


            resultsContainer.innerHTML = `

                <div class="search-empty">

                    <div
                        class="search-empty-icon"
                    >
                        ⚠️
                    </div>

                    <p>
                        خطا در جستجو
                    </p>

                </div>

            `;

        }

    }


    /* =========================================================
       CREATE CHAT
       ========================================================= */

    async function createEitaaChat() {
    if (typeof guardPage === 'function' && !guardPage('eitaa.chats', 'write')) return;

        const input =
            getEl(
                'eitaaUsernameInput'
            );

        if (!input) {
            return;
        }


        const username =
            input.value.trim();


        if (!username) {

            notify(
                'لطفاً نام کاربری را وارد کنید.'
            );

            return;
        }


        const btn =
            getEl(
                'eitaaCreateChatBtn'
            );


        try {

            if (btn) {

                btn.disabled = true;

                btn.innerHTML =
                    '<div class="spinner"></div>';

            }


            const res =
                await chatFetch(
                    EITAA_CREATE_CHAT_WEBHOOK,
                    {
                        method: 'POST',

                        headers: {
                            'Content-Type':
                                'application/json'
                        },

                        body: JSON.stringify({
                            username:
                                username
                        })
                    }
                );


            if (!res.ok) {

                const errorBody = await res.text().catch(() => '');
                throw new Error(`درخواست سرویس ناموفق بود (HTTP ${res.status})${errorBody ? ': ' + errorBody.slice(0, 180) : ''}`);

            }


            let data = null;


            try {

                data =
                    await res.json();

            } catch (e) {

                data = null;

            }


            console.log(
                'Eitaa create chat:',
                data
            );


            closeEitaaModal();


            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        800
                    )
            );


            await loadEitaaSessions();


        } catch (err) {

            console.error(
                'Eitaa create chat error:',
                err
            );


            notify(
                'خطا در ایجاد گفتگو'
            );


        } finally {

            if (btn) {

                btn.disabled = false;

                btn.textContent =
                    'ایجاد گفتگو';

            }

        }

    }


    /* =========================================================
       MOBILE
       ========================================================= */

    function goBackToEitaaSidebar() {

        if (
            window.innerWidth > 768
        ) {
            return;
        }


        const users =
            document.querySelector(
                '#eitaaChatPageWrapper .users'
            );


        const chat =
            document.querySelector(
                '#eitaaChatPageWrapper .chat'
            );


        if (
            !users ||
            !chat
        ) {
            return;
        }


        users.classList.remove(
            'show-chat'
        );


        chat.classList.remove(
            'show-chat'
        );


        chat.classList.add(
            'hide-chat'
        );


        setTimeout(
            () => {

                chat.classList.remove(
                    'hide-chat'
                );

            },
            300
        );

    }


    /* =========================================================
       LOAD SESSIONS
       ========================================================= */

    async function loadEitaaSessions() {

        const box =
            getEl(
                'eitaaSessions'
            );


        if (!box) {
            return;
        }


        try {

            const res =
                await chatFetch(
                    EITAA_API +
                    '/sessions'
                );


            if (!res.ok) {

                throw new Error(
                    'Sessions request failed'
                );

            }


            let sessions =
                await res.json();


            sessions.sort(
                (a, b) => {

                    return new Date(
                        b.updated_at
                    ) -
                    new Date(
                        a.updated_at
                    );

                }
            );


            box.innerHTML = '';


            if (!sessions.length) {

                box.innerHTML = `

                    <div style="
                        padding:40px 20px;
                        text-align:center;
                        color:var(--text-muted);
                    ">

                        <div style="
                            font-size:48px;
                            margin-bottom:12px;
                            opacity:.5;
                        ">
                            📭
                        </div>

                        <p>
                            هنوز گفتگویی وجود ندارد
                        </p>

                    </div>

                `;

                return;
            }


            sessions.forEach(
                s => {

                    const sid =
                        s.session_id ||
                        s.sessions_id ||
                        s.id;


                    const displayId =
                        s.external_chat_id ||
                        s.session_id ||
                        sid;


                    if (!sid) {
                        return;
                    }


                    const div =
                        document.createElement(
                            'div'
                        );


                    div.className =
                        'user' +
                        (
                            currentSession === sid
                                ? ' active'
                                : ''
                        );


                    const initial =
                        displayId
                            ? String(
                                displayId
                            )
                            .charAt(0)
                            .toUpperCase()
                            : '?';


                    div.innerHTML = `

                        <div class="user-content">

                            <div class="user-avatar">
                                ${escapeHtml(
                                    initial
                                )}
                            </div>


                            <div class="user-info">

                                <div class="uid">
                                    ${escapeHtml(
                                        displayId
                                    )}
                                </div>


                                <div class="user-title">
                                    ${escapeHtml(
                                        s.title ||
                                        'گفتگوی جدید'
                                    )}
                                </div>


                                <div class="utime">
                                    ${
                                        s.updated_at
                                            ? new Date(
                                                s.updated_at
                                            ).toLocaleString(
                                                'fa-IR'
                                            )
                                            : ''
                                    }
                                </div>

                            </div>

                        </div>

                    `;


                    div.addEventListener(
                        'click',
                        () => {

                            selectEitaaSession(
                                s,
                                sid,
                                displayId
                            );

                        }
                    );


                    box.appendChild(
                        div
                    );

                }
            );


        } catch (err) {

            console.error(
                'Load Eitaa sessions error:',
                err
            );


            box.innerHTML = `

                <div style="
                    padding:30px 20px;
                    text-align:center;
                    color:var(--text-muted);
                ">
                    ⚠️ خطا در دریافت گفتگوها
                </div>

            `;

        }

    }


    /* =========================================================
       SELECT SESSION
       ========================================================= */

    async function selectEitaaSession(
        s,
        sid,
        displayId
    ) {

        currentSession =
            sid;


        currentUserId =
            s.external_chat_id ||
            s.session_id ||
            displayId;


        delete unread[sid];


        lastMessageCount =
            0;


        isInitialLoad =
            true;


        const chatHeader =
            getEl(
                'eitaaChatHeader'
            );


        if (chatHeader) {

            const avatar =
                EITAA_AVATAR;


            chatHeader.innerHTML = `

                <button
                    class="mobile-back-btn"
                    id="eitaaMobileBackBtn"
                    type="button"
                >
                    →
                </button>


                <div class="chat-header-avatar">

                    <img
                        src="${avatar}"
                        alt="Eitaa"
                    >

                </div>


                <div class="chat-header-info">

                    <h2>
                        ${escapeHtml(
                            displayId
                        )}
                    </h2>


                    <span>

                        <span class="status-dot"></span>

                        آنلاین •

                        ${escapeHtml(
                            s.title ||
                            'گفتگو'
                        )}

                    </span>

                </div>

            `;


            const backBtn =
                getEl(
                    'eitaaMobileBackBtn'
                );


            if (backBtn) {

                backBtn.onclick =
                    goBackToEitaaSidebar;

            }

        }


        const chatBox =
            getEl(
                'eitaaChatBox'
            );


        const inputBox =
            getEl(
                'eitaaInputBox'
            );


        if (chatBox) {

            chatBox.style.display =
                'flex';

        }


        if (inputBox) {

            inputBox.style.display =
                'flex';

        }


        if (
            window.innerWidth <= 768
        ) {

            document
                .querySelector(
                    '#eitaaChatPageWrapper .users'
                )
                ?.classList.add(
                    'show-chat'
                );


            document
                .querySelector(
                    '#eitaaChatPageWrapper .chat'
                )
                ?.classList.add(
                    'show-chat'
                );

        }


        /*
         * لیست را دوباره رندر می‌کنیم
         * تا active روی چت انتخاب‌شده باشد.
         */

        await loadEitaaSessions();


        await loadEitaaMessages();

    }


    /* =========================================================
       LOAD MESSAGES
       ========================================================= */

    async function loadEitaaMessages(
        silent = false
    ) {

        if (!currentSession) {
            return;
        }


        const chatBox =
            getEl(
                'eitaaChatBox'
            );


        if (!chatBox) {
            return;
        }


        try {

            const res =
                await chatFetch(
                    `${EITAA_API}/messages/${currentSession}`
                );


            if (!res.ok) {

                throw new Error(
                    'Messages request failed'
                );

            }


            const messages =
                await res.json();


            if (
                silent &&
                messages.length ===
                    lastMessageCount
            ) {
                return;
            }


            const wasAtBottom =
                chatBox.scrollHeight -
                chatBox.scrollTop <=
                chatBox.clientHeight + 50;


            if (
                !isInitialLoad &&
                messages.length ===
                    lastMessageCount
            ) {
                return;
            }


            const firstLoad =
                isInitialLoad;


            lastMessageCount =
                messages.length;


            isInitialLoad =
                false;


            chatBox.innerHTML =
                '';


            if (!messages.length) {

                chatBox.innerHTML = `

                    <div class="empty-state">

                        <div class="empty-state-icon">
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

                return;
            }


            messages.forEach(
                m => {

                    const isUser =
                        m.sender_type ===
                        'user';


                    const wrapper =
                        document.createElement(
                            'div'
                        );


                    wrapper.className =
                        'message-wrapper' +
                        (
                            isUser
                                ? ' me-wrapper'
                                : ''
                        );


                    const createdAt =
                        m.created_at ||
                        m.timestamp ||
                        m.createdAt;


                    const time =
                        createdAt
                            ? new Date(
                                createdAt
                            ).toLocaleTimeString(
                                'fa-IR',
                                {
                                    hour:
                                        '2-digit',

                                    minute:
                                        '2-digit'
                                }
                            )
                            : new Date()
                                .toLocaleTimeString(
                                    'fa-IR',
                                    {
                                        hour:
                                            '2-digit',

                                        minute:
                                            '2-digit'
                                    }
                                );


                    /*
                     * کاربر:
                     * images.jpg
                     *
                     * ربات:
                     * navid.jpg
                     */

                    const avatar =
                        isUser
                            ? 'img/eitaa.png'
                            : 'img/navid.jpg';


                    const messageText =
                        escapeHtml(
                            m.message || ''
                        )
                        .replace(
                            /\n/g,
                            '<br>'
                        );


                    wrapper.innerHTML = `

                        <div class="message-avatar">

                            <img
                                src="${avatar}"
                                alt="${
                                    isUser
                                        ? 'کاربر ایتا'
                                        : 'سپهر'
                                }"
                            >

                        </div>


                        <div class="message ${
                            isUser
                                ? 'me'
                                : 'other'
                        }">

                            <div>
                                ${messageText}
                            </div>


                            <div class="message-time">
                                ${time}
                            </div>

                        </div>

                    `;


                    chatBox.appendChild(
                        wrapper
                    );

                }
            );


            if (
                wasAtBottom ||
                firstLoad
            ) {

                chatBox.scrollTop =
                    chatBox.scrollHeight;

            }


        } catch (err) {

            console.error(
                'Load Eitaa messages error:',
                err
            );

        }

    }


    /* =========================================================
       SEND MESSAGE
       ========================================================= */

    async function sendEitaaMessage() {
    if (typeof guardPage === 'function' && !guardPage('eitaa.chats', 'write')) return;

        const input =
            getEl(
                'eitaaMsgInput'
            );


        if (!input) {
            return;
        }


        const text =
            input.value.trim();


        if (!currentSession) {

            notify(
                'ابتدا یک گفتگو را انتخاب کنید.'
            );

            return;
        }


        if (!text) {
            return;
        }


        const btn =
            getEl(
                'eitaaSendMessageBtn'
            );


        try {

            if (btn) {

                btn.disabled =
                    true;

                btn.innerHTML =
                    '<div class="spinner"></div>';

            }


            /*
             * مهم:
             *
             * برای Eitaa فقط همین دو مقدار
             * ارسال می‌شود.
             *
             * user_id ارسال نمی‌کنیم.
             */

            const res =
                await chatFetch(
                    EITAA_WEBHOOK,
                    {
                        method: 'POST',

                        headers: {
                            'Content-Type':
                                'application/json'
                        },

                        body: JSON.stringify({

                            session_id:
                                currentSession,

                            message:
                                text

                        })
                    }
                );


            if (!res.ok) {

                const errorBody = await res.text().catch(() => '');
                throw new Error(`درخواست سرویس ناموفق بود (HTTP ${res.status})${errorBody ? ': ' + errorBody.slice(0, 180) : ''}`);

            }


            input.value =
                '';


            await loadEitaaMessages(
                false
            );


        } catch (err) {

            console.error(
                'Send Eitaa message error:',
                err
            );


            notify(
                'ارسال پیام انجام نشد.'
            );


        } finally {

            if (btn) {

                btn.disabled =
                    false;

                btn.innerHTML =
                    '<span>➤</span>';

            }

        }

    }


    /* =========================================================
       EVENTS
       ========================================================= */

    function initializeEitaaEvents() {

        /*
         * Theme
         */

        const themeBtn =
            getEl(
                'eitaaThemeToggleBtn'
            );


        if (themeBtn) {

            themeBtn.onclick =
                toggleEitaaTheme;

        }


        /*
         * New Chat
         */

        const newChatBtn =
            getEl(
                'eitaaNewChatBtn'
            );


        if (newChatBtn) {

            newChatBtn.onclick =
                openEitaaModal;

        }


        /*
         * Search
         */

        const searchBtn =
            getEl(
                'eitaaSearchSessionsBtn'
            );


        if (searchBtn) {

            searchBtn.onclick =
                openEitaaSearch;

        }


        const searchCloseBtn =
            getEl(
                'eitaaSearchCloseBtn'
            );


        if (searchCloseBtn) {

            searchCloseBtn.onclick =
                closeEitaaSearch;

        }


        const searchPerformBtn =
            getEl(
                'eitaaSearchBtn'
            );


        if (searchPerformBtn) {

            searchPerformBtn.onclick =
                performEitaaSearch;

        }


        const searchInput =
            getEl(
                'eitaaSearchInput'
            );


        if (searchInput) {

            searchInput.addEventListener(
                'keypress',
                function (e) {

                    if (
                        e.key ===
                        'Enter'
                    ) {

                        performEitaaSearch();

                    }

                }
            );

        }


        const searchOverlay =
            getEl(
                'eitaaSearchOverlay'
            );


        if (searchOverlay) {

            searchOverlay.addEventListener(
                'click',
                function (e) {

                    if (
                        e.target ===
                        this
                    ) {

                        closeEitaaSearch();

                    }

                }
            );

        }


        /*
         * Create Chat
         */

        const createBtn =
            getEl(
                'eitaaCreateChatBtn'
            );


        if (createBtn) {

            createBtn.onclick =
                createEitaaChat;

        }


        const closeModalBtn =
            getEl(
                'eitaaCloseModalBtn'
            );


        if (closeModalBtn) {

            closeModalBtn.onclick =
                closeEitaaModal;

        }


        const modal =
            getEl(
                'eitaaNewChatModal'
            );


        if (modal) {

            modal.addEventListener(
                'click',
                function (e) {

                    if (
                        e.target ===
                        this
                    ) {

                        closeEitaaModal();

                    }

                }
            );

        }


        const usernameInput =
            getEl(
                'eitaaUsernameInput'
            );


        if (usernameInput) {

            usernameInput.addEventListener(
                'keypress',
                function (e) {

                    if (
                        e.key ===
                        'Enter'
                    ) {

                        createEitaaChat();

                    }

                }
            );

        }


        /*
         * Message Input
         */

        const msgInput =
            getEl(
                'eitaaMsgInput'
            );


        if (msgInput) {

            msgInput.addEventListener(
                'keypress',
                function (e) {

                    if (
                        e.key ===
                            'Enter' &&
                        !e.shiftKey
                    ) {

                        e.preventDefault();

                        sendEitaaMessage();

                    }

                }
            );

        }


        /*
         * Send
         */

        const sendBtn =
            getEl(
                'eitaaSendMessageBtn'
            );


        if (sendBtn) {

            sendBtn.onclick =
                sendEitaaMessage;

        }


        /*
         * Theme
         */

        initEitaaTheme();

    }


    /* =========================================================
       POLLING
       ========================================================= */

    function startEitaaPolling() {

        stopEitaaPolling();


        sessionsInterval =
            setInterval(
                () => {

                    if (
                        getEl(
                            'eitaaChatPageWrapper'
                        )
                    ) {

                        loadEitaaSessions();

                    }

                },
                15000
            );


        messagesInterval =
            setInterval(
                async () => {

                    if (!currentSession) {
                        return;
                    }


                    if (
                        !getEl(
                            'eitaaChatPageWrapper'
                        )
                    ) {
                        return;
                    }


                    try {

                        const res =
                            await chatFetch(
                                `${EITAA_API}/messages/${currentSession}`
                            );


                        if (!res.ok) {
                            return;
                        }


                        const messages =
                            await res.json();


                        if (
                            messages.length >
                            lastMessageCount
                        ) {

                            await loadEitaaMessages(
                                false
                            );

                        }


                    } catch (err) {

                        /*
                         * intentionally silent
                         */

                    }

                },
                5000
            );

    }


    /* =========================================================
       STOP POLLING
       ========================================================= */

    function stopEitaaPolling() {

        if (
            sessionsInterval
        ) {

            clearInterval(
                sessionsInterval
            );

            sessionsInterval =
                null;

        }


        if (
            messagesInterval
        ) {

            clearInterval(
                messagesInterval
            );

            messagesInterval =
                null;

        }

    }


    /* =========================================================
       RENDER
       ========================================================= */

    async function renderEitaaChat() {

        const content =
            getEl(
                'settingsContent'
            );


        if (!content) {

            console.error(
                'settingsContent پیدا نشد.'
            );

            return;
        }


        /*
         * Styles
         */

        injectEitaaStyles();


        /*
         * HTML
         */

        content.innerHTML =
            getEitaaPageHTML();


        /*
         * Reset State
         */

        currentSession =
            null;

        currentUserId =
            null;

        lastMessageCount =
            0;

        isInitialLoad =
            true;

        unread = {};

        lastSessionUpdate = {};


        /*
         * Events
         */

        initializeEitaaEvents();


        /*
         * Sessions
         */

        await loadEitaaSessions();


        /*
         * Polling
         */

        startEitaaPolling();

    }


    /* =========================================================
       OPEN EITAA CHAT PAGE
       ========================================================= */

    async function openEitaaChatPage() {
    if (typeof guardPage === 'function' && !guardPage('eitaa.chats', 'read')) return;

        if (!canRead("eitaa_chat")) {
        showPermissionDenied();
        return;
        }        

        hideSettingsNav();
        console.log(
            'Opening Eitaa Chat Page...'
        );


        const content =
            getEl(
                'settingsContent'
            );


        if (!content) {

            console.error(
                'settingsContent پیدا نشد.'
            );

            return;
        }


        /*
         * Dashboard
         */

        const mainContent =
            document.querySelector(
                '.main-content'
            );


        if (mainContent) {

            mainContent.classList.add(
                'eitaa-chat-host'
            );

        }


        /*
         * Settings Layout
         */

        const layout =
            document.querySelector(
                '.settings-layout'
            );


        if (layout) {

            layout.classList.add(
                'eitaa-chat-active'
            );

        }


        /*
         * Hide Settings Navigation
         */

        const settingsNav =
            getEl(
                'settingsNav'
            );


        if (settingsNav) {

            settingsNav.style.display =
                'none';

        }


        const settingsNavOverlay =
            getEl(
                'settingsNavOverlay'
            );


        if (settingsNavOverlay) {

            settingsNavOverlay.style.display =
                'none';

        }


        /*
         * Hide Settings Toggle
         */

        const settingsToggleBtn =
            getEl(
                'settingsToggleBtn'
            );


        if (settingsToggleBtn) {

            settingsToggleBtn.style.display =
                'none';

        }


        /*
         * Header
         */

        const headerTitle =
            getEl(
                'headerTitle'
            );


        if (headerTitle) {

            headerTitle.textContent =
                'صفحه چت ربات ایتا';

        }


        /*
         * App State
         */

        if (
            typeof window.AppState !==
            'undefined'
        ) {

            window.AppState.currentPage =
                'eitaa-chat';

        }


        /*
         * Render
         */

        await renderEitaaChat();

    }


    /* =========================================================
       CLOSE EITAA CHAT PAGE
       ========================================================= */

    function closeEitaaChatPage() {

        stopEitaaPolling();


        currentSession =
            null;

        currentUserId =
            null;

        lastMessageCount =
            0;

        isInitialLoad =
            true;


        /*
         * Remove Host
         */

        const mainContent =
            document.querySelector(
                '.main-content'
            );


        if (mainContent) {

            mainContent.classList.remove(
                'eitaa-chat-host'
            );

        }


        /*
         * Remove Layout State
         */

        const layout =
            document.querySelector(
                '.settings-layout'
            );


        if (layout) {

            layout.classList.remove(
                'eitaa-chat-active'
            );

        }


        /*
         * Restore Navigation
         */

        const settingsNav =
            getEl(
                'settingsNav'
            );


        if (settingsNav) {

            settingsNav.style.display =
                '';

        }


        const settingsNavOverlay =
            getEl(
                'settingsNavOverlay'
            );


        if (settingsNavOverlay) {

            settingsNavOverlay.style.display =
                '';

        }


        /*
         * Restore Toggle
         */

        const settingsToggleBtn =
            getEl(
                'settingsToggleBtn'
            );


        if (settingsToggleBtn) {

            settingsToggleBtn.style.display =
                '';

        }


        /*
         * Restore Header
         */

        const headerTitle =
            getEl(
                'headerTitle'
            );


        if (headerTitle) {

            headerTitle.textContent =
                'تنظیمات سیستم';

        }


        /*
         * Return Overview
         */

        if (
            typeof window.navigateTo ===
            'function'
        ) {

            window.navigateTo(
                'overview'
            );

        }

    }


    /* =========================================================
       PUBLIC API
       ========================================================= */

    window.EitaaUI = {

        open:
            openEitaaChatPage,

        close:
            closeEitaaChatPage,

        sendMessage:
            sendEitaaMessage,

        loadSessions:
            loadEitaaSessions,

        loadMessages:
            loadEitaaMessages,

        openSearch:
            openEitaaSearch,

        closeSearch:
            closeEitaaSearch,

        performSearch:
            performEitaaSearch,

        openModal:
            openEitaaModal,

        closeModal:
            closeEitaaModal,

        createChat:
            createEitaaChat,

        toggleTheme:
            toggleEitaaTheme,

        goBackToSidebar:
            goBackToEitaaSidebar

    };


    /* =========================================================
       GLOBAL SIDEBAR FUNCTIONS
       ========================================================= */

    window.openEitaaChatPage =
        openEitaaChatPage;


    window.closeEitaaChatPage =
        closeEitaaChatPage;


})();
