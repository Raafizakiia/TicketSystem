// app.js

// Adjust this to your n8n endpoint base
// Example: https://my-n8n.example.com/webhook/support
const API_BASE = 'https://n8ntest.synology.me/webhook/support/login';

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

// Auth helpers
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
  if (!token) {
    window.location.href = 'login.html';
  }
}

// Fetch wrapper that attaches Authorization if token exists
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
    // Optionally read error message
    let text = '';
    try {
      text = await res.text();
    } catch {}
    throw new Error(`API error ${res.status}: ${text}`);
  }

  // Try JSON, fallback plain text
  const contentType = res.headers.get('Content-Type') || '';
  if (contentType.includes('application/json')) {
    return res.json();
  } else {
    return res.text();
  }
}

// Load site settings (title + favicon)
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
  } catch (e) {
    console.error('Failed to load site settings', e);
  }
}

// Render topbar on protected pages
function renderTopbar() {
  const bar = document.getElementById('topbar');
  if (!bar) return;
  const user = getUser();
  if (!user) {
    bar.innerHTML = '';
    return;
  }

  let links = `<a href="dashboard.html">Dashboard</a> | <a href="tickets.html">Tickets</a>`;
  if (user.role === 'admin') {
    links += ' | <a href="settings.html">Settings</a>';
  }
  links += ' | <a href="#" id="logoutLink">Logout</a>';

  bar.innerHTML =
    'Logged in as: ' +
    escapeHtml(user.username) +
    ' (' +
    escapeHtml(user.role) +
    ') | ' +
    links;

  const logoutLink = document.getElementById('logoutLink');
  if (logoutLink) {
    logoutLink.addEventListener('click', function (e) {
      e.preventDefault();
      logout();
    });
  }
}
