
(function () {
    'use strict';

    /* =========================================================
       CONFIG
    ========================================================= */

    const API = "http://95.38.187.123:3000";
    const WEBHOOK = "https://n8n.sepehrsalamati.ir/webhook/seandms";
    const CREATE_CHAT_WEBHOOK = "https://n8n.sepehrsalamati.ir/webhook/plasuser";

    const BALE_LOGO = "img/navid.jpg";
    const BALE_AVATAR = "img/images.jpg";

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
        if (value === null || value === undefined) return '';

        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function notify(message) {
        alert(message);
    }

    /* =========================================================
       CSS
    ========================================================= */

    function injectBaleStyles() {
        if (getEl('baleChatStyles')) return;

        const style = document.createElement('style');
        style.id = 'baleChatStyles';

        style.textContent = `
        /* =====================================================
           BALE CHAT - DASHBOARD CONTAINER
        ===================================================== */
        /* =========================================================
   BALE CHAT - FINAL PAGE SCROLL FIX
   ========================================================= */

/* وقتی Bale باز است، خود صفحه نباید اسکرول شود */
html:has(.main-content.bale-chat-host),
body:has(.main-content.bale-chat-host) {
    overflow: hidden !important;
    height: 100% !important;
    max-height: 100% !important;
}

/* کل Layout داشبورد */
.main-content.bale-chat-host {
    height: 100vh !important;
    max-height: 100vh !important;
    min-height: 0 !important;

    display: flex !important;
    flex-direction: column !important;

    overflow: hidden !important;
}

/* Header نباید فشرده شود */
.main-content.bale-chat-host > .header {
    flex: 0 0 auto !important;
}

/* فضای زیر Header */
.main-content.bale-chat-host > .settings-layout {
    flex: 1 1 0 !important;

    width: 100% !important;
    height: auto !important;
    max-height: none !important;
    min-height: 0 !important;

    display: flex !important;

    overflow: hidden !important;
}

/* محتوای Bale */
.main-content.bale-chat-host
.settings-layout.bale-chat-active
.settings-content {
    flex: 1 1 0 !important;

    width: 100% !important;
    height: auto !important;
    max-height: none !important;
    min-height: 0 !important;

    padding: 0 !important;
    margin: 0 !important;

    overflow: hidden !important;
}

/* خود صفحه Bale */
#baleChatPageWrapper {
    position: relative !important;

    width: 100% !important;
    height: 100% !important;
    max-height: 100% !important;
    min-height: 0 !important;

    overflow: hidden !important;
}

/* کانتینر */
#baleChatPageWrapper .container {
    width: 100% !important;
    height: 100% !important;
    max-height: 100% !important;
    min-height: 0 !important;

    display: flex !important;

    overflow: hidden !important;
}

/* لیست کاربران */
#baleChatPageWrapper .users {
    height: 100% !important;
    max-height: 100% !important;
    min-height: 0 !important;

    overflow: hidden !important;

    display: flex !important;
    flex-direction: column !important;
}

/* فقط لیست Sessionها اسکرول شود */
#baleChatPageWrapper #sessions {
    flex: 1 1 0 !important;

    height: auto !important;
    min-height: 0 !important;

    overflow-y: auto !important;
    overflow-x: hidden !important;
}

/* بخش چت */
#baleChatPageWrapper .chat {
    flex: 1 1 0 !important;

    width: auto !important;
    height: 100% !important;
    max-height: 100% !important;
    min-height: 0 !important;

    display: flex !important;
    flex-direction: column !important;

    overflow: hidden !important;
}

/* Header چت */
#baleChatPageWrapper .chat-header {
    flex: 0 0 auto !important;
}

/* فقط پیام‌ها اسکرول شوند */
#baleChatPageWrapper .chat-box {
    flex: 1 1 0 !important;

    width: auto !important;
    height: auto !important;
    max-height: none !important;
    min-height: 0 !important;

    overflow-y: auto !important;
    overflow-x: hidden !important;
}

/* Input */
#baleChatPageWrapper .input-box {
    flex: 0 0 auto !important;
}
        .settings-layout.bale-chat-active {
            overflow: hidden !important;
        }

        .settings-layout.bale-chat-active .settings-nav {
            display: none !important;
        }

        .settings-layout.bale-chat-active .settings-nav-overlay {
            display: none !important;
        }

        .settings-layout.bale-chat-active .settings-content {
            width: 100% !important;
            height: 100% !important;
            max-width: none !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: hidden !important;
        }

        #baleChatPageWrapper {
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
            --msg-user: linear-gradient(135deg, #4da6ff 0%, #80c4ff 100%);
            --msg-bot: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
            --shadow-soft: 0 4px 20px rgba(0, 0, 0, 0.08);
            --shadow-glow: 0 0 30px rgba(77, 166, 255, 0.15);
            --radius: 16px;
            --radius-sm: 10px;
            --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            --border-color: rgba(0, 0, 0, 0.08);

            width: 100%;
            height: 100%;
            min-height: 0;
            position: relative;
            overflow: hidden;

            font-family: 'Vazirmatn', Tahoma, sans-serif;
            color: var(--text-primary);
        }

        #baleChatPageWrapper[data-theme="dark"] {
            --bg-dark: #0f1923;
            --bg-sidebar: #1a2634;
            --bg-chat: #0d1b2a;
            --bg-input: #1e3a5f;
            --text-primary: #ffffff;
            --text-secondary: #8899aa;
            --text-muted: #556677;
            --msg-user: linear-gradient(135deg, #4da6ff 0%, #80c4ff 100%);
            --msg-bot: linear-gradient(135deg, #1e3a5f 0%, #2a4a6f 100%);
            --shadow-soft: 0 4px 20px rgba(0, 0, 0, 0.3);
            --shadow-glow: 0 0 30px rgba(77, 166, 255, 0.2);
            --border-color: rgba(255, 255, 255, 0.08);
        }

        #baleChatPageWrapper *,
        #baleChatPageWrapper *::before,
        #baleChatPageWrapper *::after {
            box-sizing: border-box;
        }

        #baleChatPageWrapper button,
        #baleChatPageWrapper input {
            font-family: 'Vazirmatn', Tahoma, sans-serif;
        }

        /* Scrollbar */

        #baleChatPageWrapper ::-webkit-scrollbar {
            width: 6px;
        }

        #baleChatPageWrapper ::-webkit-scrollbar-track {
            background: transparent;
        }

        #baleChatPageWrapper ::-webkit-scrollbar-thumb {
            background: var(--primary-light);
            border-radius: 10px;
        }

        #baleChatPageWrapper ::-webkit-scrollbar-thumb:hover {
            background: var(--primary);
        }

        /* Container */

        #baleChatPageWrapper .container {
            display: flex;
            width: 100%;
            height: 100%;
            min-height: 0;
            position: relative;
            overflow: hidden;
            background: var(--bg-dark);
        }

        /* =====================================================
           SIDEBAR
        ===================================================== */

        #baleChatPageWrapper .users {
            width: 360px;
            min-width: 360px;
            height: 100%;
            background: var(--bg-sidebar);
            display: flex;
            flex-direction: column;
            border-left: 1px solid var(--border-color);
            position: relative;
            z-index: 10;
            box-shadow: 2px 0 20px rgba(0, 0, 0, 0.05);
            transition: background 0.3s ease;
        }

        #baleChatPageWrapper .users-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px;
            background: linear-gradient(
                135deg,
                var(--primary) 0%,
                var(--primary-dark) 100%
            );
            position: relative;
            z-index: 1;
        }

        #baleChatPageWrapper .header-content {
            display: flex;
            align-items: center;
            gap: 12px;
            min-width: 0;
        }

        #baleChatPageWrapper .logo-container {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
            border: 2px solid rgba(255, 255, 255, 0.3);
            flex-shrink: 0;
        }

        #baleChatPageWrapper .logo-container img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        #baleChatPageWrapper .header-text {
            display: flex;
            flex-direction: column;
            min-width: 0;
        }

        #baleChatPageWrapper .header-text h1 {
            font-size: 18px;
            font-weight: 700;
            color: #fff;
            text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
            margin: 0;
        }

        #baleChatPageWrapper .header-text span {
            font-size: 12px;
            color: rgba(255, 255, 255, 0.85);
            margin-top: 2px;
        }

        #baleChatPageWrapper .header-actions-sidebar {
            display: flex;
            gap: 8px;
            flex-shrink: 0;
        }

        #baleChatPageWrapper .header-btn {
            width: 42px;
            height: 42px;
            border: none;
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.2);
            color: #fff;
            font-size: 18px;
            cursor: pointer;
            transition: var(--transition);
            display: flex;
            align-items: center;
            justify-content: center;
        }

        #baleChatPageWrapper .header-btn:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: scale(1.05);
        }

        #baleChatPageWrapper #newChatBtn {
            font-size: 24px;
        }

        #baleChatPageWrapper #themeToggleBtn {
            font-size: 16px;
        }

        /* Sessions */

        #baleChatPageWrapper #sessions {
            flex: 1;
            min-height: 0;
            overflow-y: auto;
            padding: 12px;
            background: var(--bg-sidebar);
            transition: background 0.3s ease;
        }

        #baleChatPageWrapper .user {
            padding: 14px;
            border-radius: var(--radius);
            cursor: pointer;
            transition: var(--transition);
            margin-bottom: 6px;
            position: relative;
            background: transparent;
            border: 1px solid transparent;
        }

        #baleChatPageWrapper .user:hover {
            background: rgba(77, 166, 255, 0.05);
            border-color: rgba(77, 166, 255, 0.15);
        }

        #baleChatPageWrapper .user.active {
            background: linear-gradient(
                135deg,
                rgba(77, 166, 255, 0.12) 0%,
                rgba(128, 196, 255, 0.08) 100%
            );
            border-color: rgba(77, 166, 255, 0.3);
            box-shadow: 0 4px 20px rgba(77, 166, 255, 0.1);
        }

        #baleChatPageWrapper .user-content {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        #baleChatPageWrapper .user-avatar {
            width: 48px;
            height: 48px;
            border-radius: 14px;
            overflow: hidden;
            flex-shrink: 0;
            background: linear-gradient(
                135deg,
                var(--primary) 0%,
                var(--accent) 100%
            );
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            font-weight: 700;
            color: #fff;
            box-shadow: 0 4px 15px rgba(77, 166, 255, 0.3);
        }

        #baleChatPageWrapper .user-info {
            flex: 1;
            min-width: 0;
        }

        #baleChatPageWrapper .uid {
            font-size: 14px;
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 4px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        #baleChatPageWrapper .user-title {
            font-size: 12px;
            color: var(--text-secondary);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        #baleChatPageWrapper .utime {
            font-size: 11px;
            color: var(--text-muted);
            margin-top: 6px;
            display: flex;
            align-items: center;
            gap: 4px;
        }

        #baleChatPageWrapper .utime::before {
            content: '🕐';
            font-size: 10px;
        }

        #baleChatPageWrapper .unread-badge {
            position: absolute;
            left: 16px;
            top: 14px;
            min-width: 24px;
            height: 24px;
            padding: 0 8px;
            background: linear-gradient(
                135deg,
                #ff4757 0%,
                #ff6b81 100%
            );
            color: white;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            font-weight: 700;
            box-shadow: 0 4px 15px rgba(255, 71, 87, 0.4);
            animation: balePulse 2s infinite;
        }

        @keyframes balePulse {
            0%, 100% {
                transform: scale(1);
            }

            50% {
                transform: scale(1.05);
            }
        }

        /* =====================================================
           CHAT
        ===================================================== */

        #baleChatPageWrapper .chat {
            flex: 1;
            min-width: 0;
            min-height: 0;
            display: flex;
            flex-direction: column;
            background: var(--bg-chat);
            position: relative;
            transition: background 0.3s ease;
        }

        #baleChatPageWrapper .chat-header {
            background: var(--bg-sidebar);
            padding: 16px 24px;
            display: flex;
            align-items: center;
            gap: 16px;
            min-height: 81px;
            border-bottom: 1px solid var(--border-color);
            position: relative;
            z-index: 5;
            transition: background 0.3s ease;
        }

        #baleChatPageWrapper .chat-header-avatar {
            width: 48px;
            height: 48px;
            border-radius: 14px;
            overflow: hidden;
            background: linear-gradient(
                135deg,
                var(--primary) 0%,
                var(--secondary) 100%
            );
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            font-weight: 700;
            box-shadow: 0 4px 20px rgba(77, 166, 255, 0.25);
            flex-shrink: 0;
        }

        #baleChatPageWrapper .chat-header-avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        #baleChatPageWrapper .chat-header-info {
            flex: 1;
            min-width: 0;
        }

        #baleChatPageWrapper .chat-header-info h2 {
            font-size: 16px;
            font-weight: 600;
            color: var(--text-primary);
            margin: 0 0 4px;
        }

        #baleChatPageWrapper .chat-header-info span {
            font-size: 12px;
            color: var(--text-secondary);
            display: flex;
            align-items: center;
            gap: 6px;
        }

        #baleChatPageWrapper .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #00d68f;
            box-shadow: 0 0 10px rgba(0, 214, 143, 0.5);
            animation: baleStatusPulse 2s infinite;
            flex-shrink: 0;
        }

        @keyframes baleStatusPulse {
            0%, 100% {
                opacity: 1;
            }

            50% {
                opacity: 0.5;
            }
        }

        /* =====================================================
           SEARCH
        ===================================================== */

        #baleChatPageWrapper .search-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 1000;
            display: none;
            align-items: flex-start;
            justify-content: center;
            padding-top: 100px;
            backdrop-filter: blur(5px);
        }

        #baleChatPageWrapper .search-overlay.active {
            display: flex;
        }

        #baleChatPageWrapper .search-container {
            width: 90%;
            max-width: 600px;
            background: var(--bg-sidebar);
            border-radius: 20px;
            padding: 24px;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.2);
            animation: baleSlideDown 0.3s ease-out;
        }

        @keyframes baleSlideDown {
            from {
                opacity: 0;
                transform: translateY(-20px);
            }

            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        #baleChatPageWrapper .search-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 20px;
        }

        #baleChatPageWrapper .search-header h3 {
            flex: 1;
            font-size: 18px;
            font-weight: 600;
            color: var(--text-primary);
            margin: 0;
        }

        #baleChatPageWrapper .search-close-btn {
            width: 36px;
            height: 36px;
            border: none;
            border-radius: 10px;
            background: rgba(0, 0, 0, 0.05);
            color: var(--text-secondary);
            font-size: 18px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        #baleChatPageWrapper .search-close-btn:hover {
            background: rgba(0, 0, 0, 0.1);
        }

        #baleChatPageWrapper .search-input-container {
            display: flex;
            gap: 10px;
            margin-bottom: 16px;
        }

        #baleChatPageWrapper .search-input {
            flex: 1;
            padding: 14px 18px;
            border: 2px solid rgba(77, 166, 255, 0.2);
            border-radius: 12px;
            font-size: 14px;
            background: var(--bg-dark);
            color: var(--text-primary);
            outline: none;
            transition: var(--transition);
        }

        #baleChatPageWrapper .search-input:focus {
            border-color: var(--primary);
            box-shadow: 0 0 20px rgba(77, 166, 255, 0.15);
        }

        #baleChatPageWrapper .search-input::placeholder {
            color: var(--text-muted);
        }

        #baleChatPageWrapper .search-btn {
            padding: 14px 24px;
            border: none;
            border-radius: 12px;
            background: linear-gradient(
                135deg,
                var(--primary) 0%,
                var(--primary-dark) 100%
            );
            color: #fff;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: var(--transition);
        }

        #baleChatPageWrapper .search-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(77, 166, 255, 0.3);
        }

        #baleChatPageWrapper .search-results {
            max-height: 400px;
            overflow-y: auto;
            border-top: 1px solid var(--border-color);
            padding-top: 16px;
        }

        #baleChatPageWrapper .search-result-item {
            padding: 12px 16px;
            border-radius: 10px;
            cursor: pointer;
            transition: var(--transition);
            margin-bottom: 8px;
        }

        #baleChatPageWrapper .search-result-item:hover {
            background: rgba(77, 166, 255, 0.1);
        }

        #baleChatPageWrapper .search-result-user {
            font-size: 13px;
            font-weight: 600;
            color: var(--primary);
            margin-bottom: 4px;
        }

        #baleChatPageWrapper .search-result-text {
            font-size: 14px;
            color: var(--text-primary);
            line-height: 1.6;
        }

        #baleChatPageWrapper .search-highlight {
            background: rgba(255, 213, 0, 0.4);
            padding: 1px 4px;
            border-radius: 4px;
        }

        #baleChatPageWrapper .search-empty {
            text-align: center;
            padding: 40px;
            color: var(--text-muted);
        }

        #baleChatPageWrapper .search-empty-icon {
            font-size: 48px;
            margin-bottom: 12px;
            opacity: 0.5;
        }

        /* =====================================================
           CHAT BOX
        ===================================================== */

        #baleChatPageWrapper .chat-box {
            flex: 1;
            min-height: 0;
            overflow-y: auto;
            padding: 24px;
            display: flex;
            flex-direction: column;
            gap: 14px;
            position: relative;
            z-index: 1;
        }

        #baleChatPageWrapper .message {
            max-width: 70%;
            padding: 12px 16px;
            border-radius: 18px;
            direction: rtl;
            word-break: break-word;
            position: relative;
            line-height: 1.7;
        }

        #baleChatPageWrapper .me {
            margin-right: auto;
            margin-left: 60px;
            background: var(--msg-user);
            color: #fff;
            border-bottom-left-radius: 6px;
            box-shadow: 0 4px 15px rgba(77, 166, 255, 0.25);
        }

        #baleChatPageWrapper .other {
            margin-left: auto;
            margin-right: 60px;
            background: var(--msg-bot);
            color: var(--text-primary);
            border-bottom-right-radius: 6px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
            border: 1px solid var(--border-color);
        }

        #baleChatPageWrapper .message-wrapper {
            display: flex;
            align-items: flex-end;
            gap: 10px;
        }

        #baleChatPageWrapper .message-wrapper.me-wrapper {
            flex-direction: row-reverse;
        }

        #baleChatPageWrapper .message-avatar {
            width: 36px;
            height: 36px;
            border-radius: 10px;
            overflow: hidden;
            flex-shrink: 0;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
        }

        #baleChatPageWrapper .message-avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        #baleChatPageWrapper .message-time {
            font-size: 10px;
            color: rgba(255, 255, 255, 0.7);
            margin-top: 6px;
            text-align: left;
        }

        #baleChatPageWrapper .other .message-time {
            color: var(--text-muted);
        }

        /* =====================================================
           INPUT
        ===================================================== */

        #baleChatPageWrapper .input-box {
            display: flex;
            padding: 16px 24px;
            background: var(--bg-sidebar);
            gap: 12px;
            position: relative;
            z-index: 5;
            border-top: 1px solid var(--border-color);
            transition: background 0.3s ease;
        }

        #baleChatPageWrapper .input-container {
            flex: 1;
            display: flex;
            align-items: center;
            background: var(--bg-dark);
            border-radius: 14px;
            padding: 4px;
            border: 2px solid transparent;
            transition: var(--transition);
        }

        #baleChatPageWrapper .input-container:focus-within {
            border-color: rgba(77, 166, 255, 0.3);
            box-shadow: 0 0 20px rgba(77, 166, 255, 0.1);
        }

        #baleChatPageWrapper .input-box input {
            flex: 1;
            padding: 14px 18px;
            border: none;
            border-radius: 12px;
            font-size: 14px;
            background: transparent;
            color: var(--text-primary);
            outline: none;
        }

        #baleChatPageWrapper .input-box input::placeholder {
            color: var(--text-muted);
        }

        #baleChatPageWrapper .send-btn {
            width: 50px;
            height: 50px;
            border: none;
            border-radius: 14px;
            background: linear-gradient(
                135deg,
                var(--primary) 0%,
                var(--primary-light) 100%
            );
            color: #fff;
            font-size: 18px;
            cursor: pointer;
            transition: var(--transition);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 20px rgba(77, 166, 255, 0.3);
        }

        #baleChatPageWrapper .send-btn:hover {
            transform: scale(1.05);
            box-shadow: 0 6px 25px rgba(77, 166, 255, 0.4);
        }

        #baleChatPageWrapper .send-btn:active {
            transform: scale(0.95);
        }

        #baleChatPageWrapper .send-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }

        /* =====================================================
           MODAL
        ===================================================== */

        #baleChatPageWrapper .modal {
            position: fixed;
            inset: 0;
            display: none;
            justify-content: center;
            align-items: center;
            background: rgba(0, 0, 0, 0.5);
            z-index: 1000;
            backdrop-filter: blur(5px);
        }

        #baleChatPageWrapper .modal-content {
            width: 400px;
            max-width: calc(100vw - 30px);
            background: var(--bg-sidebar);
            border-radius: 20px;
            padding: 28px;
            border: 1px solid var(--border-color);
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.2);
            animation: baleModalIn 0.3s ease-out;
        }

        @keyframes baleModalIn {
            from {
                opacity: 0;
                transform: scale(0.9) translateY(20px);
            }

            to {
                opacity: 1;
                transform: scale(1) translateY(0);
            }
        }

        #baleChatPageWrapper .modal-content h3 {
            margin: 0 0 20px;
            font-size: 20px;
            font-weight: 700;
            color: var(--text-primary);
            display: flex;
            align-items: center;
            gap: 10px;
        }

        #baleChatPageWrapper .modal-content h3::before {
            content: '💬';
            font-size: 24px;
        }

        #baleChatPageWrapper .modal-content input {
            width: 100%;
            padding: 16px 18px;
            border: 2px solid rgba(77, 166, 255, 0.2);
            border-radius: 12px;
            font-size: 14px;
            background: var(--bg-dark);
            color: var(--text-primary);
            outline: none;
            transition: var(--transition);
        }

        #baleChatPageWrapper .modal-content input:focus {
            border-color: var(--primary);
            box-shadow: 0 0 20px rgba(77, 166, 255, 0.15);
        }

        #baleChatPageWrapper .modal-content input::placeholder {
            color: var(--text-muted);
        }

        #baleChatPageWrapper .modal-buttons {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            margin-top: 24px;
        }

        #baleChatPageWrapper .modal-buttons button {
            padding: 12px 24px;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: var(--transition);
        }

        #baleChatPageWrapper .modal-buttons button:first-child {
            background: linear-gradient(
                135deg,
                var(--primary) 0%,
                var(--primary-dark) 100%
            );
            color: #fff;
            box-shadow: 0 4px 15px rgba(77, 166, 255, 0.3);
        }

        #baleChatPageWrapper .modal-buttons button:first-child:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(77, 166, 255, 0.4);
        }

        #baleChatPageWrapper .modal-buttons button:last-child {
            background: rgba(0, 0, 0, 0.05);
            color: var(--text-secondary);
        }

        #baleChatPageWrapper .modal-buttons button:last-child:hover {
            background: rgba(0, 0, 0, 0.1);
        }

        /* =====================================================
           EMPTY STATE
        ===================================================== */

        #baleChatPageWrapper .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: var(--text-muted);
            text-align: center;
            padding: 40px;
        }

        #baleChatPageWrapper .empty-state-icon {
            font-size: 80px;
            margin-bottom: 20px;
            opacity: 0.6;
        }

        #baleChatPageWrapper .empty-state h3 {
            font-size: 20px;
            font-weight: 600;
            margin: 0 0 8px;
            color: var(--text-secondary);
        }

        #baleChatPageWrapper .empty-state p {
            font-size: 14px;
            line-height: 1.6;
            margin: 0;
        }

        /* =====================================================
           SPINNER
        ===================================================== */

        #baleChatPageWrapper .spinner {
            width: 20px;
            height: 20px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-top-color: #fff;
            border-radius: 50%;
            animation: baleSpin 0.8s linear infinite;
        }

        @keyframes baleSpin {
            to {
                transform: rotate(360deg);
            }
        }

        /* =====================================================
           MOBILE
        ===================================================== */

        #baleChatPageWrapper .mobile-back-btn {
            display: none;
            width: 40px;
            height: 40px;
            border: none;
            border-radius: 10px;
            background: rgba(77, 166, 255, 0.1);
            color: var(--primary);
            font-size: 18px;
            cursor: pointer;
            transition: var(--transition);
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }

        #baleChatPageWrapper .mobile-back-btn:hover {
            background: rgba(77, 166, 255, 0.2);
        }

        @media (max-width: 768px) {

            #baleChatPageWrapper .users {
                width: 100%;
                min-width: 100%;
                position: absolute;
                z-index: 100;
                height: 100%;
                transition: transform 0.3s ease;
            }

            #baleChatPageWrapper .chat {
                width: 100%;
                position: absolute;
                height: 100%;
                transform: translateX(100%);
            }

            #baleChatPageWrapper .message {
                max-width: 85%;
            }

            #baleChatPageWrapper .message-wrapper {
                margin-left: 16px;
                margin-right: 16px;
            }

            #baleChatPageWrapper .me-wrapper {
                margin-left: 16px;
                margin-right: 50px;
            }

            #baleChatPageWrapper .search-container {
                width: 95%;
                padding: 20px;
            }

            #baleChatPageWrapper .mobile-back-btn {
                display: flex !important;
            }

            #baleChatPageWrapper .users.show-chat {
                transform: translateX(100%);
            }

            #baleChatPageWrapper .chat.show-chat {
                transform: translateX(0);
            }

            #baleChatPageWrapper .chat.hide-chat {
                transform: translateX(100%);
            }

            #baleChatPageWrapper .users-header {
                padding: 14px;
            }

            #baleChatPageWrapper .header-text h1 {
                font-size: 15px;
            }

            #baleChatPageWrapper .header-actions-sidebar {
                gap: 4px;
            }

            #baleChatPageWrapper .header-btn {
                width: 38px;
                height: 38px;
            }

            #baleChatPageWrapper .chat-header {
                padding: 12px 16px;
            }

            #baleChatPageWrapper .chat-box {
                padding: 16px;
            }

            #baleChatPageWrapper .input-box {
                padding: 12px 16px;
            }
        }
        `;

        document.head.appendChild(style);
    }

    /* =========================================================
       PAGE HTML
    ========================================================= */

    function getBalePageHTML() {
        return `
            <div
                id="baleChatPageWrapper"
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
                                        src="${BALE_LOGO}"
                                        alt="سپهر سلامتی"
                                    >
                                </div>

                                <div class="header-text">
                                    <h1>سپهر سلامتی</h1>
                                    <span>بله - واحد تحول دیجیتال</span>
                                </div>

                            </div>

                            <div class="header-actions-sidebar">

                                <button
                                    id="themeToggleBtn"
                                    class="header-btn"
                                    title="تغییر تم"
                                    type="button"
                                >
                                    🌙
                                </button>

                                <button
                                    id="searchSessionsBtn"
                                    class="header-btn"
                                    title="جستجوی پیام‌ها"
                                    type="button"
                                >
                                    🔍
                                </button>

                                <button
                                    id="newChatBtn"
                                    class="header-btn"
                                    title="گفتگوی جدید"
                                    type="button"
                                >
                                    +
                                </button>

                            </div>

                        </div>

                        <div id="sessions"></div>

                    </div>


                    <!-- Chat Area -->
                    <div class="chat">

                        <div class="chat-header" id="chatHeader">

                            <div
                                class="empty-state"
                                style="width:100%; padding:60px 20px;"
                            >

                                <div class="empty-state-icon">
                                    💬
                                </div>

                                <h3>
                                    به پنل مدیریت چت خوش آمدید
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
                            id="chatBox"
                            style="display:none;"
                        ></div>


                        <div
                            class="input-box"
                            id="inputBox"
                            style="display:none;"
                        >

                            <div class="input-container">

                                <input
                                    id="msgInput"
                                    placeholder="پیام خود را بنویسید..."
                                    autocomplete="off"
                                >

                            </div>

                            <button
                                class="send-btn"
                                id="sendMessageBtn"
                                title="ارسال پیام"
                                type="button"
                            >
                                <span>➤</span>
                            </button>

                        </div>

                    </div>

                </div>


                <!-- Search Overlay -->
                <div
                    class="search-overlay"
                    id="searchOverlay"
                >

                    <div class="search-container">

                        <div class="search-header">

                            <h3>
                                🔍 جستجوی پیام‌ها
                            </h3>

                            <button
                                class="search-close-btn"
                                id="searchCloseBtn"
                                type="button"
                            >
                                ✕
                            </button>

                        </div>

                        <div class="search-input-container">

                            <input
                                type="text"
                                class="search-input"
                                id="searchInput"
                                placeholder="عبارت مورد نظر را جستجو کنید..."
                            >

                            <button
                                class="search-btn"
                                id="searchBtn"
                                type="button"
                            >
                                جستجو
                            </button>

                        </div>

                        <div
                            class="search-results"
                            id="searchResults"
                        ></div>

                    </div>

                </div>


                <!-- New Chat Modal -->
                <div
                    class="modal"
                    id="newChatModal"
                >

                    <div class="modal-content">

                        <h3>
                            ایجاد گفتگوی جدید
                        </h3>

                        <input
                            id="usernameInput"
                            type="text"
                            placeholder="نام کاربری را وارد کنید..."
                        >

                        <div class="modal-buttons">

                            <button
                                id="createChatBtn"
                                type="button"
                            >
                                ایجاد گفتگو
                            </button>

                            <button
                                id="closeModalBtn"
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

    function initTheme() {
        const wrapper = getEl('baleChatPageWrapper');

        if (!wrapper) return;

        const savedTheme =
            localStorage.getItem('chatTheme') || 'light';

        wrapper.setAttribute('data-theme', savedTheme);

        updateThemeIcon(savedTheme);
    }

    function toggleTheme() {
        const wrapper = getEl('baleChatPageWrapper');

        if (!wrapper) return;

        const currentTheme =
            wrapper.getAttribute('data-theme') || 'light';

        const newTheme =
            currentTheme === 'dark'
                ? 'light'
                : 'dark';

        wrapper.setAttribute(
            'data-theme',
            newTheme
        );

        localStorage.setItem(
            'chatTheme',
            newTheme
        );

        updateThemeIcon(newTheme);
    }

    function updateThemeIcon(theme) {
        const btn = getEl('themeToggleBtn');

        if (!btn) return;

        btn.textContent =
            theme === 'dark'
                ? '☀️'
                : '🌙';
    }

    /* =========================================================
       MODAL
    ========================================================= */

    function openModal() {
        const modal = getEl('newChatModal');
        const input = getEl('usernameInput');

        if (!modal) return;

        modal.style.display = 'flex';

        if (input) {
            input.focus();
        }
    }

    function closeModal() {
        const modal = getEl('newChatModal');
        const input = getEl('usernameInput');

        if (modal) {
            modal.style.display = 'none';
        }

        if (input) {
            input.value = '';
        }
    }

    /* =========================================================
       SEARCH
    ========================================================= */

    function openSearch() {
        const overlay = getEl('searchOverlay');
        const input = getEl('searchInput');
        const results = getEl('searchResults');

        if (!overlay) return;

        overlay.classList.add('active');

        if (results) {
            results.innerHTML = `
                <div class="search-empty">
                    <div class="search-empty-icon">🔍</div>
                    <p>عبارت مورد نظر را جستجو کنید</p>
                </div>
            `;
        }

        if (input) {
            input.focus();
        }
    }

    function closeSearch() {
        const overlay = getEl('searchOverlay');
        const input = getEl('searchInput');

        if (overlay) {
            overlay.classList.remove('active');
        }

        if (input) {
            input.value = '';
        }
    }

    async function performSearch() {
        const input = getEl('searchInput');
        const resultsContainer = getEl('searchResults');

        if (!input || !resultsContainer) return;

        const query = input.value.trim();

        if (!query) {
            notify('لطفاً عبارتی برای جستجو وارد کنید.');
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
                await fetch(API + '/sessions');

            const sessions =
                await sessionsRes.json();

            let results = [];

            for (const session of sessions) {

                const messagesRes =
                    await fetch(
                        `${API}/messages/${session.id}`
                    );

                const messages =
                    await messagesRes.json();

                messages.forEach(m => {

                    if (
                        m.message &&
                        String(m.message)
                            .toLowerCase()
                            .includes(
                                query.toLowerCase()
                            )
                    ) {

                        results.push({
                            userId: session.user_id,
                            sessionTitle: session.title,
                            message: m.message,
                            senderType: m.sender_type
                        });

                    }

                });
            }

            if (results.length === 0) {

                resultsContainer.innerHTML = `
                    <div class="search-empty">
                        <div class="search-empty-icon">
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
                results.map(r => {

                    const safeMessage =
                        escapeHtml(r.message);

                    const highlightedMessage =
                        safeMessage.replace(
                            new RegExp(
                                `(${escapeRegex(
                                    escapeHtml(query)
                                )})`,
                                'gi'
                            ),
                            '<span class="search-highlight">$1</span>'
                        );

                    return `
                        <div class="search-result-item">

                            <div class="search-result-user">
                                ${escapeHtml(r.userId)}
                                •
                                ${r.senderType === 'user'
                                    ? 'کاربر'
                                    : 'بات'}
                            </div>

                            <div class="search-result-text">
                                ${highlightedMessage}
                            </div>

                        </div>
                    `;

                }).join('');

        } catch (err) {

            console.error(
                'Bale search error:',
                err
            );

            resultsContainer.innerHTML = `
                <div class="search-empty">
                    <div class="search-empty-icon">
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

    async function createChat() {
        const input = getEl('usernameInput');

        if (!input) return;

        const username =
            input.value.trim();

        if (!username) {
            notify(
                'لطفاً نام کاربری را وارد کنید.'
            );
            return;
        }

        const btn =
            getEl('createChatBtn');

        try {

            if (btn) {
                btn.disabled = true;
                btn.innerHTML =
                    '<div class="spinner"></div>';
            }

            const res =
                await fetch(
                    CREATE_CHAT_WEBHOOK,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type':
                                'application/json'
                        },
                        body: JSON.stringify({
                            username: username
                        })
                    }
                );

            if (!res.ok) {
                throw new Error(
                    'Webhook Error'
                );
            }

            const data =
                await res.json();

            console.log(
                'Bale create chat:',
                data
            );

            closeModal();

            if (btn) {
                btn.disabled = false;
                btn.textContent =
                    'ایجاد گفتگو';
            }

            await loadSessions();

        } catch (err) {

            console.error(
                'Create chat error:',
                err
            );

            notify(
                'خطا در ایجاد گفتگو'
            );

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

    function goBackToSidebar() {

        if (window.innerWidth > 768) {
            return;
        }

        const users =
            document.querySelector(
                '#baleChatPageWrapper .users'
            );

        const chat =
            document.querySelector(
                '#baleChatPageWrapper .chat'
            );

        if (!users || !chat) {
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

        setTimeout(() => {

            chat.classList.remove(
                'hide-chat'
            );

        }, 300);
    }

    /* =========================================================
       LOAD SESSIONS
    ========================================================= */

    async function loadSessions() {

        const box =
            getEl('sessions');

        if (!box) return;

        try {

            const res =
                await fetch(
                    API + '/sessions'
                );

            let sessions =
                await res.json();

            sessions.sort(
                (a, b) =>
                    new Date(b.updated_at) -
                    new Date(a.updated_at)
            );

            box.innerHTML = '';

            if (sessions.length === 0) {

                box.innerHTML = `
                    <div
                        style="
                            padding:40px 20px;
                            text-align:center;
                            color:var(--text-muted);
                        "
                    >

                        <div
                            style="
                                font-size:48px;
                                margin-bottom:12px;
                                opacity:0.5;
                            "
                        >
                            📭
                        </div>

                        <p>
                            هنوز گفتگویی وجود ندارد
                        </p>

                    </div>
                `;

                return;
            }

            sessions.forEach(s => {

                if (lastSessionUpdate[s.id]) {

                    if (
                        lastSessionUpdate[s.id] !==
                            s.updated_at &&
                        currentSession !== s.id
                    ) {

                        unread[s.id] =
                            (unread[s.id] || 0) + 1;
                    }
                }

                lastSessionUpdate[s.id] =
                    s.updated_at;

                const div =
                    document.createElement(
                        'div'
                    );

                div.className =
                    'user' +
                    (
                        currentSession === s.id
                            ? ' active'
                            : ''
                    );

                const initial =
                    s.user_id
                        ? String(
                            s.user_id
                        ).charAt(0).toUpperCase()
                        : '?';

                div.innerHTML = `
                    <div class="user-content">

                        <div class="user-avatar">
                            ${escapeHtml(initial)}
                        </div>

                        <div class="user-info">

                            <div class="uid">
                                ${escapeHtml(
                                    s.user_id
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

                    ${
                        unread[s.id]
                            ? `
                                <div class="unread-badge">
                                    ${unread[s.id]}
                                </div>
                              `
                            : ''
                    }
                `;

                div.addEventListener(
                    'click',
                    () => {
                        selectSession(s);
                    }
                );

                box.appendChild(div);
            });

        } catch (err) {

            console.error(
                'Load sessions error:',
                err
            );

            box.innerHTML = `
                <div
                    style="
                        padding:30px 20px;
                        text-align:center;
                        color:var(--text-muted);
                    "
                >
                    ⚠️ خطا در دریافت گفتگوها
                </div>
            `;
        }
    }

    /* =========================================================
       SELECT SESSION
    ========================================================= */

    async function selectSession(s) {

        document
            .querySelectorAll(
                '#baleChatPageWrapper .user'
            )
            .forEach(x =>
                x.classList.remove('active')
            );

        const clickedUser =
            Array.from(
                document.querySelectorAll(
                    '#baleChatPageWrapper .user'
                )
            ).find(el =>
                el.querySelector('.uid')?.textContent ===
                String(s.user_id)
            );

        if (clickedUser) {
            clickedUser.classList.add('active');
        }

        currentSession = s.id;
        currentUserId = s.user_id;

        delete unread[s.id];

        lastMessageCount = 0;
        isInitialLoad = true;

        await loadSessions();

        const initial =
            s.user_id
                ? String(
                    s.user_id
                ).charAt(0).toUpperCase()
                : '?';

        const chatHeader =
            getEl('chatHeader');

        if (chatHeader) {

            chatHeader.innerHTML = `

                <button
                    class="mobile-back-btn"
                    id="mobileBackBtn"
                    title="بازگشت"
                    type="button"
                >
                    →
                </button>

                <div class="chat-header-avatar">
                    ${escapeHtml(initial)}
                </div>

                <div class="chat-header-info">

                    <h2>
                        ${escapeHtml(
                            s.user_id
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
                getEl('mobileBackBtn');

            if (backBtn) {
                backBtn.addEventListener(
                    'click',
                    goBackToSidebar
                );
            }
        }

        const chatBox =
            getEl('chatBox');

        const inputBox =
            getEl('inputBox');

        if (chatBox) {
            chatBox.style.display =
                'flex';
        }

        if (inputBox) {
            inputBox.style.display =
                'flex';
        }

        if (window.innerWidth <= 768) {

            const users =
                document.querySelector(
                    '#baleChatPageWrapper .users'
                );

            const chat =
                document.querySelector(
                    '#baleChatPageWrapper .chat'
                );

            if (users) {
                users.classList.add(
                    'show-chat'
                );
            }

            if (chat) {
                chat.classList.add(
                    'show-chat'
                );
            }
        }

        await loadMessages();
    }

    /* =========================================================
       LOAD MESSAGES
    ========================================================= */

    async function loadMessages(
        silent = false
    ) {

        if (!currentSession) {
            return;
        }

        const chatBox =
            getEl('chatBox');

        if (!chatBox) {
            return;
        }

        try {

            const res =
                await fetch(
                    `${API}/messages/${currentSession}`
                );

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

            /*
             * وضعیت اولیه را قبل از تغییر آن ذخیره می‌کنیم
             * تا اسکرول اولیه درست انجام شود.
             */
            const firstLoad =
                isInitialLoad;

            lastMessageCount =
                messages.length;

            isInitialLoad = false;

            chatBox.innerHTML = '';

            if (messages.length === 0) {

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

            messages.forEach(m => {

                const isUser =
                    m.sender_type === 'user';

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

                /*
                 * ساختار پیام اصلی حفظ شده است.
                 */
                const time =
                    m.created_at ||
                    m.timestamp ||
                    m.createdAt
                        ? new Date(
                            m.created_at ||
                            m.timestamp ||
                            m.createdAt
                        ).toLocaleTimeString(
                            'fa-IR',
                            {
                                hour: '2-digit',
                                minute: '2-digit'
                            }
                        )
                        : new Date()
                            .toLocaleTimeString(
                                'fa-IR',
                                {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                }
                            );

                const avatar =
                    isUser
                        ? BALE_AVATAR
                        : BALE_LOGO;

                const messageText =
                    escapeHtml(
                        m.message
                    ).replace(
                        /\n/g,
                        '<br>'
                    );

                wrapper.innerHTML = `

                    <div class="message-avatar">

                        <img
                            src="${avatar}"
                            alt="${
                                isUser
                                    ? 'Bale'
                                    : 'سپهر'
                            }"
                        >

                    </div>

                    <div
                        class="message ${
                            isUser
                                ? 'me'
                                : 'other'
                        }"
                    >

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
            });

            /*
             * فقط در بارگذاری اولیه یا وقتی کاربر
             * پایین چت بوده به انتها می‌رویم.
             */
            if (
                wasAtBottom ||
                firstLoad
            ) {
                chatBox.scrollTop =
                    chatBox.scrollHeight;
            }

        } catch (err) {

            console.error(
                'Load messages error:',
                err
            );
        }
    }

    /* =========================================================
       SEND MESSAGE
    ========================================================= */

    async function sendMessage() {

        const input =
            getEl('msgInput');

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
            getEl('sendMessageBtn');

        try {

            if (btn) {
                btn.disabled = true;
                btn.innerHTML =
                    '<div class="spinner"></div>';
            }

            const res =
                await fetch(
                    WEBHOOK,
                    {
                        method: 'POST',

                        headers: {
                            'Content-Type':
                                'application/json'
                        },

                        body: JSON.stringify({
                            session_id:
                                currentSession,

                            user_id:
                                currentUserId,

                            message:
                                text
                        })
                    }
                );

            if (!res.ok) {
                throw new Error(
                    'Webhook Error'
                );
            }

            input.value = '';

            await loadMessages(false);

        } catch (err) {

            console.error(
                'Send message error:',
                err
            );

            notify(
                'ارسال پیام انجام نشد.'
            );

        } finally {

            if (btn) {
                btn.disabled = false;
                btn.innerHTML =
                    '<span>➤</span>';
            }
        }
    }

    /* =========================================================
       EVENTS
    ========================================================= */

    function initializeBaleEvents() {

        const themeBtn =
            getEl('themeToggleBtn');

        if (themeBtn) {
            themeBtn.onclick =
                toggleTheme;
        }

        const newChatBtn =
            getEl('newChatBtn');

        if (newChatBtn) {
            newChatBtn.onclick =
                openModal;
        }

        const searchBtn =
            getEl('searchSessionsBtn');

        if (searchBtn) {
            searchBtn.onclick =
                openSearch;
        }

        const searchCloseBtn =
            getEl('searchCloseBtn');

        if (searchCloseBtn) {
            searchCloseBtn.onclick =
                closeSearch;
        }

        const searchPerformBtn =
            getEl('searchBtn');

        if (searchPerformBtn) {
            searchPerformBtn.onclick =
                performSearch;
        }

        const searchInput =
            getEl('searchInput');

        if (searchInput) {

            searchInput.addEventListener(
                'keypress',
                function (e) {

                    if (e.key === 'Enter') {
                        performSearch();
                    }

                }
            );
        }

        const searchOverlay =
            getEl('searchOverlay');

        if (searchOverlay) {

            searchOverlay.addEventListener(
                'click',
                function (e) {

                    if (e.target === this) {
                        closeSearch();
                    }

                }
            );
        }

        const createBtn =
            getEl('createChatBtn');

        if (createBtn) {
            createBtn.onclick =
                createChat;
        }

        const closeModalBtn =
            getEl('closeModalBtn');

        if (closeModalBtn) {
            closeModalBtn.onclick =
                closeModal;
        }

        const modal =
            getEl('newChatModal');

        if (modal) {

            modal.addEventListener(
                'click',
                function (e) {

                    if (e.target === this) {
                        closeModal();
                    }

                }
            );
        }

        const usernameInput =
            getEl('usernameInput');

        if (usernameInput) {

            usernameInput.addEventListener(
                'keypress',
                function (e) {

                    if (e.key === 'Enter') {
                        createChat();
                    }

                }
            );
        }

        const msgInput =
            getEl('msgInput');

        if (msgInput) {

            msgInput.addEventListener(
                'keypress',
                function (e) {

                    if (
                        e.key === 'Enter' &&
                        !e.shiftKey
                    ) {
                        e.preventDefault();
                        sendMessage();
                    }

                }
            );
        }

        const sendBtn =
            getEl('sendMessageBtn');

        if (sendBtn) {
            sendBtn.onclick =
                sendMessage;
        }

        initTheme();
    }

    /* =========================================================
       POLLING
    ========================================================= */

    function startBalePolling() {

        stopBalePolling();

        /*
         * دریافت Sessionها هر 15 ثانیه
         */
        sessionsInterval =
            setInterval(
                () => {

                    if (
                        getEl('baleChatPageWrapper')
                    ) {
                        loadSessions();
                    }

                },
                15000
            );

        /*
         * دریافت پیام‌ها هر 5 ثانیه
         */
        messagesInterval =
            setInterval(
                async () => {

                    if (!currentSession) {
                        return;
                    }

                    if (
                        !getEl(
                            'baleChatPageWrapper'
                        )
                    ) {
                        return;
                    }

                    try {

                        const res =
                            await fetch(
                                `${API}/messages/${currentSession}`
                            );

                        const messages =
                            await res.json();

                        if (
                            messages.length >
                            lastMessageCount
                        ) {

                            await loadMessages(
                                false
                            );
                        }

                    } catch (err) {

                        /*
                         * خطای Polling را
                         * عمداً نمایش نمی‌دهیم.
                         */

                    }

                },
                5000
            );
    }

    function stopBalePolling() {

        if (sessionsInterval) {

            clearInterval(
                sessionsInterval
            );

            sessionsInterval = null;
        }

        if (messagesInterval) {

            clearInterval(
                messagesInterval
            );

            messagesInterval = null;
        }
    }
    /* =========================================================
       RENDER
    ========================================================= */

    async function renderBaleChat() {

        const content =
            getEl('settingsContent');

        if (!content) {

            console.error(
                'settingsContent پیدا نشد.'
            );

            return;
        }

        injectBaleStyles();

        content.innerHTML =
            getBalePageHTML();

        /*
         * حالت فعلی چت را از نو تنظیم می‌کنیم.
         */
        currentSession = null;
        currentUserId = null;
        lastMessageCount = 0;
        isInitialLoad = true;

        initializeBaleEvents();

        await loadSessions();

        startBalePolling();
    }


    /* =========================================================
       OPEN BALE CHAT PAGE
       مهم:
       این تابع با openBaleMessaging() تداخل ندارد.
    ========================================================= */

    async function openBaleChatPage() {
        hideSettingsNav(); 
        console.log(
            'Opening Bale Chat Page...'
        );

        const content =
            getEl('settingsContent');

        if (!content) {

            console.error(
                'settingsContent پیدا نشد.'
            );

            return;
        }

        /* =====================================================
           DASHBOARD HEIGHT FIX
           ===================================================== */

        const mainContent =
            document.querySelector(
                '.main-content'
            );

        if (mainContent) {

            mainContent.classList.add(
                'bale-chat-host'
            );
        }


        /* =====================================================
           SETTINGS LAYOUT
           ===================================================== */

        const layout =
            document.querySelector(
                '.settings-layout'
            );

        if (layout) {

            layout.classList.add(
                'bale-chat-active'
            );
        }


        /* =====================================================
           HIDE SETTINGS NAV
           ===================================================== */

        const settingsNav =
            getEl('settingsNav');

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


        /* =====================================================
           HIDE SETTINGS TOGGLE
           ===================================================== */

        const settingsToggleBtn =
            getEl('settingsToggleBtn');

        if (settingsToggleBtn) {

            settingsToggleBtn.style.display =
                'none';
        }


        /* =====================================================
           HEADER TITLE
           ===================================================== */

        const headerTitle =
            getEl('headerTitle');

        if (headerTitle) {

            headerTitle.textContent =
                'صفحه چت ربات بله';
        }


        /* =====================================================
           APP STATE
           ===================================================== */

        if (
            typeof window.AppState !==
            'undefined'
        ) {

            window.AppState.currentPage =
                'bale-chat';
        }


        /* =====================================================
           RENDER
           ===================================================== */

        await renderBaleChat();
    }


    /* =========================================================
       CLOSE BALE CHAT PAGE
    ========================================================= */

    function closeBaleChatPage() {

        stopBalePolling();

        currentSession = null;
        currentUserId = null;
        lastMessageCount = 0;
        isInitialLoad = true;


        /* =====================================================
           REMOVE BALE CHAT HOST
           ===================================================== */

        const mainContent =
            document.querySelector(
                '.main-content'
            );

        if (mainContent) {

            mainContent.classList.remove(
                'bale-chat-host'
            );
        }


        /* =====================================================
           REMOVE BALE CHAT STATE
           ===================================================== */

        const layout =
            document.querySelector(
                '.settings-layout'
            );

        if (layout) {

            layout.classList.remove(
                'bale-chat-active'
            );
        }


        /* =====================================================
           RESTORE SETTINGS NAV
           ===================================================== */

        const settingsNav =
            getEl('settingsNav');

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


        /* =====================================================
           RESTORE SETTINGS TOGGLE
           ===================================================== */

        const settingsToggleBtn =
            getEl('settingsToggleBtn');

        if (settingsToggleBtn) {

            settingsToggleBtn.style.display =
                '';
        }


        /* =====================================================
           RESTORE HEADER
           ===================================================== */

        const headerTitle =
            getEl('headerTitle');

        if (headerTitle) {

            headerTitle.textContent =
                'تنظیمات سیستم';
        }


        /* =====================================================
           RETURN TO OVERVIEW
           ===================================================== */

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

    window.BaleUI = {

        open:
            openBaleChatPage,

        close:
            closeBaleChatPage,

        sendMessage:
            sendMessage,

        loadSessions:
            loadSessions,

        loadMessages:
            loadMessages,

        openSearch:
            openSearch,

        closeSearch:
            closeSearch,

        performSearch:
            performSearch,

        openModal:
            openModal,

        closeModal:
            closeModal,

        createChat:
            createChat,

        toggleTheme:
            toggleTheme,

        goBackToSidebar:
            goBackToSidebar
    };


    /* =========================================================
       SIDEBAR FUNCTIONS
       ========================================================= */

    window.openBaleChatPage =
        openBaleChatPage;

    window.closeBaleChatPage =
        closeBaleChatPage;

})();
