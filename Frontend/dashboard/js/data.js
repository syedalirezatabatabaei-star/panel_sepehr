/**
 * Sepher Management Panel - Data Layer
 * All mock data structured to be directly replaceable with API responses
 */

// ─── Permission Definitions ────────────────────────────────────────
const PERMISSIONS = [
  // Users
  { id: 'users.view', group: 'users', label: 'مشاهده کاربران', icon: '👥' },
  { id: 'users.create', group: 'users', label: 'ایجاد کاربر', icon: '👤' },
  { id: 'users.edit', group: 'users', label: 'ویرایش کاربر', icon: '✏️' },
  { id: 'users.delete', group: 'users', label: 'حذف کاربر', icon: '🗑️' },
  { id: 'users.change_role', group: 'users', label: 'تغییر سطح دسترسی', icon: '🔑' },

  // Notifications
  { id: 'notifications.view', group: 'notifications', label: 'مشاهده اعلان‌ها', icon: '🔔' },
  { id: 'notifications.create', group: 'notifications', label: 'ایجاد اعلان', icon: '➕' },
  { id: 'notifications.edit', group: 'notifications', label: 'ویرایش اعلان', icon: '✏️' },
  { id: 'notifications.delete', group: 'notifications', label: 'حذف اعلان', icon: '🗑️' },

  // Reports
  { id: 'reports.view', group: 'reports', label: 'مشاهده گزارش‌ها', icon: '📋' },
  { id: 'reports.create', group: 'reports', label: 'ایجاد گزارش', icon: '📝' },
  { id: 'reports.send', group: 'reports', label: 'ارسال گزارش', icon: '📤' },
  { id: 'reports.edit', group: 'reports', label: 'ویرایش گزارش', icon: '✏️' },
  { id: 'reports.delete', group: 'reports', label: 'حذف گزارش', icon: '🗑️' },

  // Logs
  { id: 'logs.view', group: 'logs', label: 'مشاهده لاگ سیستم', icon: '📜' },
  { id: 'logs.view_activity', group: 'logs', label: 'مشاهده فعالیت کاربران', icon: '👁️' },
  { id: 'logs.export', group: 'logs', label: 'Export لاگ', icon: '📥' },

  // Settings
  { id: 'settings.view', group: 'settings', label: 'مشاهده تنظیمات', icon: '⚙️' },
  { id: 'settings.edit', group: 'settings', label: 'تغییر تنظیمات سیستم', icon: '🔧' },

  // Roles
  { id: 'roles.view', group: 'roles', label: 'مشاهده نقش‌ها', icon: '🏷️' },
  { id: 'roles.edit', group: 'roles', label: 'ویرایش نقش‌ها', icon: '✏️' },
  { id: 'roles.create', group: 'roles', label: 'ایجاد نقش', icon: '➕' },
  { id: 'roles.delete', group: 'roles', label: 'حذف نقش', icon: '🗑️' },

  // Security
  { id: 'security.view', group: 'security', label: 'مشاهده امنیت', icon: '🔒' },
  { id: 'security.manage_sessions', group: 'security', label: 'مدیریت نشست‌ها', icon: '🖥️' },
  { id: 'security.manage_mfa', group: 'security', label: 'مدیریت احراز هویت دو مرحله‌ای', icon: '🔐' },
];

const PERMISSION_GROUPS = {
  users: { label: 'کاربران', icon: '👥', order: 1 },
  notifications: { label: 'اعلان‌ها', icon: '🔔', order: 2 },
  reports: { label: 'گزارش‌ها', icon: '📋', order: 3 },
  logs: { label: 'لاگ‌ها', icon: '📜', order: 4 },
  settings: { label: 'تنظیمات', icon: '⚙️', order: 5 },
  roles: { label: 'نقش‌ها', icon: '🏷️', order: 6 },
  security: { label: 'امنیت', icon: '🔒', order: 7 },
};

// ─── Roles ─────────────────────────────────────────────────────────
const ROLES = [
  {
    id: 'owner',
    name: 'OWNER',
    label: 'مالک',
    level: 3,
    description: 'دسترسی کامل به تمامی بخش‌های سیستم',
    userCount: 0,
    color: '#e74c3c',
    permissions: PERMISSIONS.map(p => p.id),
    isSystem: true,
  },
  {
    id: 'admin',
    name: 'ADMIN',
    label: 'مدیر سیستم',
    level: 3,
    description: 'مدیریت سیستم با دسترسی‌های گسترده',
    userCount: 0,
    color: '#e67e22',
    permissions: [
      'users.view', 'users.create', 'users.edit', 'users.delete', 'users.change_role',
      'notifications.view', 'notifications.create', 'notifications.edit', 'notifications.delete',
      'reports.view', 'reports.create', 'reports.send', 'reports.edit', 'reports.delete',
      'logs.view', 'logs.view_activity', 'logs.export',
      'settings.view', 'settings.edit',
      'roles.view', 'roles.edit', 'roles.create',
      'security.view', 'security.manage_sessions', 'security.manage_mfa',
    ],
    isSystem: true,
  },
  {
    id: 'manager',
    name: 'MANAGER',
    label: 'مدیر',
    level: 2,
    description: 'مدیریت عملیاتی با دسترسی به گزارش‌ها و اعلان‌ها',
    userCount: 0,
    color: '#3498db',
    permissions: [
      'users.view', 'notifications.view', 'notifications.create',
      'reports.view', 'reports.create', 'reports.send',
      'logs.view',
      'settings.view',
    ],
    isSystem: false,
  },
  {
    id: 'user',
    name: 'USER',
    label: 'کاربر',
    level: 2,
    description: 'کاربر عادی با دسترسی عملیاتی',
    userCount: 0,
    color: '#2ecc71',
    permissions: [
      'notifications.view', 'reports.view', 'reports.create',
    ],
    isSystem: false,
  },
  {
    id: 'viewer',
    name: 'VIEWER',
    label: 'بازدیدکننده',
    level: 1,
    description: 'فقط مشاهده اطلاعات',
    userCount: 0,
    color: '#95a5a6',
    permissions: [
      'notifications.view', 'reports.view',
    ],
    isSystem: false,
  },
];

// ─── Users ─────────────────────────────────────────────────────────
let USERS = [];

// ─── Notifications ─────────────────────────────────────────────────
const NOTIFICATION_TYPES = [
  { id: 'info', label: 'اطلاع‌رسانی', color: '#3498db' },
  { id: 'warning', label: 'هشدار', color: '#f39c12' },
  { id: 'success', label: 'موفقیت', color: '#2ecc71' },
  { id: 'error', label: 'خطا', color: '#e74c3c' },
  { id: 'system', label: 'سیستمی', color: '#9b59b6' },
];

const NOTIFICATION_TARGETS = [
  { id: 'all', label: 'همه کاربران' },
  { id: 'level_3', label: 'سطح ۳' },
  { id: 'level_2', label: 'سطح ۲' },
  { id: 'level_1', label: 'سطح ۱' },
  { id: 'role', label: 'نقش خاص' },
  { id: 'specific', label: 'کاربران انتخابی' },
];

const NOTIFICATIONS = [];

// ─── Audit Logs ────────────────────────────────────────────────────
const AUDIT_LOG_TYPES = [
  { id: 'login', label: 'ورود به سیستم', icon: '🔐' },
  { id: 'logout', label: 'خروج از سیستم', icon: '🚪' },
  { id: 'create_user', label: 'ایجاد کاربر', icon: '👤' },
  { id: 'edit_user', label: 'ویرایش کاربر', icon: '✏️' },
  { id: 'delete_user', label: 'حذف کاربر', icon: '🗑️' },
  { id: 'change_role', label: 'تغییر سطح دسترسی', icon: '🔑' },
  { id: 'permission_change', label: 'تغییر Permission', icon: '⚙️' },
  { id: 'create_notification', label: 'ایجاد اعلان', icon: '🔔' },
  { id: 'send_report', label: 'ارسال گزارش', icon: '📤' },
  { id: 'settings_change', label: 'تغییر تنظیمات', icon: '🔧' },
  { id: 'account_disable', label: 'غیرفعال کردن کاربر', icon: '🚫' },
  { id: 'account_enable', label: 'فعال کردن کاربر', icon: '✅' },
  { id: 'export', label: 'خروجی داده', icon: '📥' },
  { id: 'login_failed', label: 'ورود ناموفق', icon: '❌' },
];

const AUDIT_LOGS = [];

// ─── Activities ────────────────────────────────────────────────────
const ACTIVITIES = [];

// ─── Security Events ───────────────────────────────────────────────
const SECURITY_EVENTS = [];

// ─── System Settings ───────────────────────────────────────────────
const SYSTEM_SETTINGS = {
  general: {
    siteName: 'پنل مدیریتی سپهر',
    siteUrl: 'https://admin.sepehr.com',
    supportEmail: 'support@sepehr.com',
    timezone: 'Asia/Tehran',
    language: 'fa',
    dateFormat: 'jalali',
  },
  security: {
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    lockoutDuration: 15,
    passwordMinLength: 8,
    requireSpecialChars: true,
    requireNumbers: true,
    mfaEnabled: false,
    ipWhitelist: [],
  },
  notifications: {
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    notifyOnLogin: true,
    notifyOnPasswordChange: true,
    notifyOnRoleChange: true,
  },
  maintenance: {
    maintenanceMode: false,
    maintenanceMessage: 'سیستم در حال به‌روزرسانی است. لطفاً دقایقی دیگر مراجعه کنید.',
    allowedIPs: ['192.168.1.0/24'],
  },
};

// ─── Helper Functions ──────────────────────────────────────────────
function getUserRole(userId) {
  const user = USERS.find(u => u.id === userId);
  if (!user) return null;
  return ROLES.find(r => r.id === user.role);
}

function getEffectivePermissions(userId) {
  const user = USERS.find(u => u.id === userId);
  if (!user) return [];
  const role = ROLES.find(r => r.id === user.role);
  const rolePermissions = role ? role.permissions : [];
  const customPermissions = user.customPermissions || [];
  const effective = new Set([...rolePermissions]);
  customPermissions.forEach(p => {
    if (effective.has(p)) {
      effective.delete(p);
    } else {
      effective.add(p);
    }
  });
  return Array.from(effective);
}

function getEffectivePermissionsDetail(userId) {
  const user = USERS.find(u => u.id === userId);
  if (!user) return { role: [], custom: [], effective: [], overrides: [] };
  const role = ROLES.find(r => r.id === user.role);
  const rolePermissions = role ? role.permissions : [];
  const customPermissions = user.customPermissions || [];
  const effective = new Set([...rolePermissions]);
  const overrides = [];

  customPermissions.forEach(p => {
    const isRolePermission = rolePermissions.includes(p);
    if (isRolePermission) {
      effective.delete(p);
      overrides.push({ id: p, action: 'removed' });
    } else {
      effective.add(p);
      overrides.push({ id: p, action: 'added' });
    }
  });

  return {
    role: rolePermissions,
    custom: customPermissions,
    effective: Array.from(effective),
    overrides,
  };
}

function getPermissionLabel(id) {
  const perm = PERMISSIONS.find(p => p.id === id);
  return perm ? perm.label : id;
}

function getPermissionGroup(id) {
  const perm = PERMISSIONS.find(p => p.id === id);
  return perm ? perm.group : 'unknown';
}

function formatTimeAgo(timestamp) {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'همین الان';
  if (minutes < 60) return `${minutes} دقیقه قبل`;
  if (hours < 24) return `${hours} ساعت قبل`;
  return `${days} روز قبل`;
}

function getUserInitials(user) {
  return (user.firstName.charAt(0) + user.lastName.charAt(0));
}

function generateId() {
  return Math.max(...USERS.map(u => u.id), 0) + 1;
}

function generateNotifId() {
  return Math.max(...NOTIFICATIONS.map(n => n.id), 0) + 1;
}
