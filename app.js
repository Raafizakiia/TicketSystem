// app.js

// Base for all endpoints (no /login at the end)
const API_BASE = 'https://raafii.app.n8n.cloud/webhook/support';

// Escape HTML helper
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ===== AUTH HELPERS =====
function getToken() {
  return localStorage.getItem('authToken');
}

function getUser() {
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setAuth(data) {
  localStorage.setItem('authToken', data.token);
  localStorage.setItem('user', JSON.stringify(data.user));
}

function clearAuth() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
}

function logout() {
  clearAuth();
  window.location.href = 'login.html';
}

function requireAuth() {
  const token = getToken();
  const user = getUser();
  if (!token || !user) {
    clearAuth();
    window.location.href = 'login.html';
  }
}

// ===== FETCH WRAPPER =====
async function apiFetch(path, options = {}) {
  const token = getToken();

  const headers = options.headers || {};
  if (!headers['Content-Type'] && options.method && options.method !== 'GET') {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const finalOptions = {
    ...options,
    headers
  };

  const res = await fetch(API_BASE + path, finalOptions);
  if (!res.ok) {
    let text = '';
    try {
      text = await res.text();
    } catch {}
    throw new Error(`API error ${res.status}: ${text}`);
  }

  const contentType = res.headers.get('Content-Type') || '';
  if (contentType.includes('application/json')) {
    return res.json();
  } else {
    return res.text();
  }
}

// ===== SITE SETTINGS =====
async function loadSiteSettings(pageSuffix) {
  try {
    const data = await apiFetch('/settings', { method: 'GET' });
    const siteName = data.site_name || 'Support Tickets';
    const faviconPath = data.favicon || 'favicon.ico';

    document.title = siteName + (pageSuffix ? ' | ' + pageSuffix : '');

    let favicon = document.querySelector('link[rel="icon"]');
    if (!favicon) {
      favicon = document.createElement('link');
      favicon.rel = 'icon';
      document.head.appendChild(favicon);
    }
    favicon.href = faviconPath;

    // also put name in sidebar logo text if element exists
    const siteNameEl = document.getElementById('sidebarSiteName');
    if (siteNameEl) {
      siteNameEl.textContent = siteName;
    }
  } catch (e) {
    console.error('Failed to load site settings', e);
  }
}

// ===== SIDEBAR USER TEXT (buttons are static in HTML) =====
function fillSidebarUserInfo() {
  const el = document.getElementById('sidebarUserInfo');
  if (!el) return;
  const user = getUser();
  if (!user) return;

  el.textContent = `${user.username} (${user.role})`;
}
