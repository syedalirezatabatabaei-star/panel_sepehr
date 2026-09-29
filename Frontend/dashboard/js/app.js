/* =========================================================
   APP JS
   ========================================================= */

/* =========================
   config
   ========================= */

const API_BASE = 'http://95.38.187.123:8005';
let CURRENT_USER = null;

/* =========================
   state
   ========================= */

const AppState = {
    currentPage: 'overview',

    selectedUserId: null,
    selectedRoleId: null,

    userSearch: '',
    userFilter: 'all',

    currentPageUsers: 1,
    usersPerPage: 10,

    permSearch: '',

    currentLogsPage: 1,
    logsPerPage: 10,

    notificationSearch: '',
    notificationFilter: 'all'
};
function toggleSettingsNav() {
    const nav = document.querySelector('.settings-nav');

    if (nav) {
        nav.classList.toggle('open');
    }
}
async function loadCurrentUser() {
    try {
        const response = await fetch(`${API_BASE}/api/auth/me`, {
            method: 'GET',
            credentials: 'include'
        });

        const text = await response.text();

        console.log('ME STATUS:', response.status);
        console.log('ME RESPONSE:', text);

        if (!response.ok) {
            throw new Error(`ME API ${response.status}: ${text}`);
        }

        const data = JSON.parse(text);

        if (data.user) {
            CURRENT_USER = {
                id: data.user.id,
                username: data.user.username,
                firstName: data.user.first_name,
                lastName: data.user.last_name,
                email: data.user.email,
                phone: data.user.phone,
                role: data.user.role,
                level: data.user.level,
                organizationalPosition: data.user.organizational_position,
                isActive: data.user.is_active,
                avatar: data.user.avatar
            };

            updateUserUI();
        }

    } catch (error) {
        console.error('loadCurrentUser:', error);
    }
}


async function loadUsers() {
    try {
        const response = await fetch(`${API_BASE}/api/auth/users`, {
            method: 'GET',
            credentials: 'include'
        });

        const text = await response.text();

        console.log('USERS STATUS:', response.status);
        console.log('USERS RESPONSE:', text);

        if (!response.ok) {
            throw new Error(`USERS API ${response.status}: ${text}`);
        }

        const data = JSON.parse(text);

        if (Array.isArray(data)) {
            USERS = data;
        } else if (Array.isArray(data.users)) {
            USERS = data.users;
        } else {
            USERS = [];
        }

        updateUserUI();

    } catch (error) {
        console.error('loadUsers:', error);
    }
}

/*=============================

up user namaesh

=============================*/
function updateUserUI() {
    console.log('CURRENT_USER:', CURRENT_USER);

    if (!CURRENT_USER) return;

    const fullName =
        `${CURRENT_USER.firstName || ''} ${CURRENT_USER.lastName || ''}`.trim();

    const name =
        fullName || CURRENT_USER.username || 'کاربر';

    const role =
        CURRENT_USER.organizationalPosition ||
        CURRENT_USER.role ||
        '';

    document.querySelectorAll('.user-name').forEach(el => {
        el.textContent = name;
    });

    document.querySelectorAll('.user-role').forEach(el => {
        el.textContent = role;
    });

    document.querySelectorAll('.name').forEach(el => {
        el.textContent = name;
    });

    document.querySelectorAll('.role-badge').forEach(el => {
        el.textContent = role;
    });
}
/* =========================
   helper ها
   ========================= */

function formatTimeAgo(timestamp) {
    if (!timestamp) return '';

    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
        return timestamp;
    }

    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) {
        return 'همین الان';
    }

    if (diff < 3600) {
        return `${Math.floor(diff / 60)} دقیقه پیش`;
    }

    if (diff < 86400) {
        return `${Math.floor(diff / 3600)} ساعت پیش`;
    }

    if (diff < 604800) {
        return `${Math.floor(diff / 86400)} روز پیش`;
    }

    return date.toLocaleDateString('fa-IR');
}


function getEffectivePermissionsDetail(userId) {
    const user = USERS.find(u => u.id === userId);

    if (!user) {
        return [];
    }

    const role = ROLES.find(r => r.id === user.role);

    const rolePermissions = role?.permissions || [];
    const customPermissions = user.customPermissions || [];

    const permissionIds = [
        ...new Set([
            ...rolePermissions,
            ...customPermissions
        ])
    ];

    return PERMISSIONS.filter(permission =>
        permissionIds.includes(permission.id)
    );
}


function generateNotifId() {
    return `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}


/* =========================
   sidebar
   ========================= */

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');

    if (!sidebar) return;

    sidebar.classList.toggle('open');
}


function toggleUserDropdown() {
    const dropdown = document.getElementById('userDropdown');

    if (!dropdown) return;

    dropdown.classList.toggle('show');
}


function toggleUserStatus(userId) {
    const user = USERS.find(u => u.id === userId);

    if (!user) return;

    user.status =
        user.status === 'active'
            ? 'inactive'
            : 'active';

    user.isActive = user.status === 'active';

    if (typeof showToast === 'function') {
        showToast(
            user.status === 'active'
                ? 'کاربر فعال شد'
                : 'کاربر غیرفعال شد',
            'success'
        );
    }

    if (AppState.currentPage === 'users') {
        if (typeof renderPage === 'function') {
            renderPage('users');
        }
    }
}


/* =========================
   init
   ========================= */

document.addEventListener('DOMContentLoaded', () => {

    loadCurrentUser();
    loadUsers();

});

