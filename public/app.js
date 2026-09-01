/* ═══════════════════════════════════════════════════════════════════════════
   MEMORA — Frontend Application
   SPA connecting to the Memora REST API
   ═══════════════════════════════════════════════════════════════════════════ */

(() => {
  'use strict';

  // ─── API Client ──────────────────────────────────────────────────────────
  const API_BASE = '/api';

  const api = {
    token: localStorage.getItem('memora_token'),

    headers() {
      const h = { 'Content-Type': 'application/json' };
      if (this.token) h['Authorization'] = `Bearer ${this.token}`;
      return h;
    },

    async request(method, path, body) {
      const opts = { method, headers: this.headers() };
      if (body) opts.body = JSON.stringify(body);

      const res = await fetch(`${API_BASE}${path}`, opts);
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const msg = data?.error?.message || data?.message || `Request failed (${res.status})`;
        throw new Error(msg);
      }
      return data;
    },

    get(path) { return this.request('GET', path); },
    post(path, body) { return this.request('POST', path, body); },
    patch(path, body) { return this.request('PATCH', path, body); },
    del(path) { return this.request('DELETE', path); },

    setToken(token) {
      this.token = token;
      if (token) {
        localStorage.setItem('memora_token', token);
      } else {
        localStorage.removeItem('memora_token');
      }
    }
  };

  // ─── State ───────────────────────────────────────────────────────────────
  const state = {
    user: null,
    reminders: [],
    notes: [],
    currentView: 'dashboard',
    aiMode: null,       // 'ask-reminder' | 'ask-note' | 'categorize' | 'enhance'
    aiMessages: [],
  };

  // ─── DOM Helpers ─────────────────────────────────────────────────────────
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  function show(el) { el.classList.add('active'); }
  function hide(el) { el.classList.remove('active'); }

  // ─── Toast Notifications ─────────────────────────────────────────────────
  function toast(message, type = 'info') {
    const container = $('#toast-container');
    const icons = { success: '✓', error: '✕', info: 'ℹ' };
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `<span class="toast-icon">${icons[type]}</span><span>${message}</span>`;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }

  // ─── Date Formatting ────────────────────────────────────────────────────
  function formatDate(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = d - now;
    const days = Math.floor(diff / 86400000);

    if (days === 0) {
      return `Today at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (days === 1) {
      return `Tomorrow at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (days === -1) {
      return `Yesterday at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (days > 1 && days <= 7) {
      return `In ${days} days`;
    } else if (days < -1 && days >= -7) {
      return `${Math.abs(days)} days ago`;
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatDateShort(dateStr) {
    return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  function toDatetimeLocal(dateStr) {
    const d = new Date(dateStr);
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  }

  // ─── Priority & Status Helpers ───────────────────────────────────────────
  function priorityBadge(priority) {
    const cls = { URGENT: 'badge-urgent', HIGH: 'badge-high', MEDIUM: 'badge-medium', LOW: 'badge-low' };
    return `<span class="card-badge ${cls[priority] || 'badge-medium'}">${priority}</span>`;
  }

  function statusBadge(status) {
    const cls = {
      PENDING: 'badge-medium', COMPLETED: 'badge-completed',
      SNOOZED: 'badge-snoozed', CANCELLED: 'badge-cancelled'
    };
    return `<span class="card-badge ${cls[status] || 'badge-medium'}">${status}</span>`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTH
  // ═══════════════════════════════════════════════════════════════════════════

  function initAuth() {
    // Tab switching
    $$('.auth-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        $$('.auth-tab').forEach(t => t.classList.remove('active'));
        $$('.auth-form').forEach(f => f.classList.remove('active'));
        tab.classList.add('active');
        $(`#${tab.dataset.tab}-form`).classList.add('active');
      });
    });

    // Login
    $('#login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = $('#login-submit');
      btn.classList.add('loading');

      try {
        const res = await api.post('/auth/login', {
          email: $('#login-email').value,
          password: $('#login-password').value,
        });
        api.setToken(res.data.token);
        state.user = res.data.user;
        toast('Welcome back!', 'success');
        showDashboard();
      } catch (err) {
        toast(err.message, 'error');
      } finally {
        btn.classList.remove('loading');
      }
    });

    // Register
    $('#register-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = $('#register-submit');
      btn.classList.add('loading');

      try {
        const res = await api.post('/auth/register', {
          name: $('#register-name').value,
          email: $('#register-email').value,
          password: $('#register-password').value,
        });
        api.setToken(res.data.token);
        state.user = res.data.user;
        toast('Account created! Welcome to Memora ✨', 'success');
        showDashboard();
      } catch (err) {
        toast(err.message, 'error');
      } finally {
        btn.classList.remove('loading');
      }
    });
  }

  async function checkAuth() {
    if (!api.token) return false;
    try {
      const res = await api.get('/auth/me');
      state.user = res.data;
      return true;
    } catch {
      api.setToken(null);
      return false;
    }
  }

  function showAuth() {
    hide($('#dashboard-screen'));
    show($('#auth-screen'));
  }

  async function showDashboard() {
    hide($('#auth-screen'));
    show($('#dashboard-screen'));
    updateUserUI();
    navigateTo('dashboard');
    await loadAllData();
  }

  function updateUserUI() {
    if (!state.user) return;
    const name = state.user.name || 'User';
    $('#user-name').textContent = name;
    $('#user-email').textContent = state.user.email;
    $('#user-avatar').textContent = name.charAt(0).toUpperCase();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NAVIGATION
  // ═══════════════════════════════════════════════════════════════════════════

  const viewTitles = {
    dashboard: 'Dashboard',
    reminders: 'Reminders',
    notes: 'Notes',
    ai: 'AI Assistant',
  };

  function navigateTo(view) {
    state.currentView = view;

    // Update nav
    $$('.nav-item').forEach(n => n.classList.remove('active'));
    $(`.nav-item[data-view="${view}"]`)?.classList.add('active');

    // Update views
    $$('.view').forEach(v => v.classList.remove('active'));
    $(`#view-${view}`)?.classList.add('active');

    // Update topbar
    $('#topbar-title').textContent = viewTitles[view] || 'Memora';

    // Trigger data refresh for the view
    if (view === 'dashboard') refreshDashboard();
    else if (view === 'reminders') refreshReminders();
    else if (view === 'notes') refreshNotes();
  }

  function initNavigation() {
    $$('.nav-item').forEach(nav => {
      nav.addEventListener('click', () => navigateTo(nav.dataset.view));
    });

    // "View All" buttons on dashboard
    $$('[data-navigate]').forEach(btn => {
      btn.addEventListener('click', () => navigateTo(btn.dataset.navigate));
    });

    // Sidebar toggle (mobile)
    $('#sidebar-toggle').addEventListener('click', () => {
      $('#sidebar').classList.toggle('open');
    });

    // Logout
    $('#logout-btn').addEventListener('click', () => {
      api.setToken(null);
      state.user = null;
      state.reminders = [];
      state.notes = [];
      showAuth();
      toast('Signed out', 'info');
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA LOADING
  // ═══════════════════════════════════════════════════════════════════════════

  async function loadAllData() {
    try {
      const [remindersRes, notesRes] = await Promise.all([
        api.get('/reminders?limit=100'),
        api.get('/notes?limit=100'),
      ]);
      state.reminders = remindersRes.data.reminders || remindersRes.data || [];
      state.notes = notesRes.data.notes || notesRes.data || [];
    } catch (err) {
      console.error('Failed to load data:', err);
      // If auth failed, go to login
      if (err.message.includes('401') || err.message.includes('token') || err.message.includes('Unauthorized')) {
        api.setToken(null);
        showAuth();
        return;
      }
    }
    refreshDashboard();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DASHBOARD VIEW
  // ═══════════════════════════════════════════════════════════════════════════

  function refreshDashboard() {
    const pending = state.reminders.filter(r => r.status === 'PENDING');
    const urgent = state.reminders.filter(r => r.priority === 'URGENT' && r.status === 'PENDING');
    const completed = state.reminders.filter(r => r.status === 'COMPLETED');

    $('#stat-reminders-count').textContent = pending.length;
    $('#stat-notes-count').textContent = state.notes.length;
    $('#stat-urgent-count').textContent = urgent.length;
    $('#stat-completed-count').textContent = completed.length;

    // Upcoming reminders (next 5 pending sorted by remindAt)
    const upcoming = [...pending]
      .sort((a, b) => new Date(a.remindAt) - new Date(b.remindAt))
      .slice(0, 6);

    const upcomingEl = $('#upcoming-reminders');
    if (upcoming.length === 0) {
      upcomingEl.innerHTML = '<div class="empty-state-mini">No upcoming reminders</div>';
    } else {
      upcomingEl.innerHTML = upcoming.map(r => renderReminderCard(r)).join('');
    }

    // Recent notes (last 4)
    const recent = [...state.notes]
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 4);

    const recentEl = $('#recent-notes');
    if (recent.length === 0) {
      recentEl.innerHTML = '<div class="empty-state-mini">No notes yet</div>';
    } else {
      recentEl.innerHTML = recent.map(n => renderNoteCard(n)).join('');
    }

    bindCardListeners();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // REMINDERS VIEW
  // ═══════════════════════════════════════════════════════════════════════════

  function refreshReminders() {
    const status = $('#reminder-status-filter').value;
    const priority = $('#reminder-priority-filter').value;
    const search = $('#reminder-search').value.toLowerCase();

    let filtered = state.reminders;

    if (status) filtered = filtered.filter(r => r.status === status);
    if (priority) filtered = filtered.filter(r => r.priority === priority);
    if (search) {
      filtered = filtered.filter(r =>
        r.title.toLowerCase().includes(search) ||
        r.rawInput.toLowerCase().includes(search) ||
        (r.aiSummary && r.aiSummary.toLowerCase().includes(search))
      );
    }

    // Sort by remindAt ascending for pending, descending otherwise
    filtered.sort((a, b) => {
      if (status === 'COMPLETED' || status === 'CANCELLED') {
        return new Date(b.updatedAt) - new Date(a.updatedAt);
      }
      return new Date(a.remindAt) - new Date(b.remindAt);
    });

    const list = $('#reminders-list');
    if (filtered.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🔔</div>
          <h3>No reminders found</h3>
          <p>${search || status || priority ? 'Try adjusting your filters' : 'Create your first AI-powered reminder'}</p>
        </div>`;
    } else {
      list.innerHTML = filtered.map(r => renderReminderListItem(r)).join('');
    }

    bindCardListeners();
  }

  function renderReminderCard(r) {
    const tags = (r.tags || []).map(t => `<span class="tag">${t.name || t}</span>`).join('');
    const summary = r.aiSummary
      ? r.aiSummary.replace(/[*#]/g, '').substring(0, 120) + (r.aiSummary.length > 120 ? '...' : '')
      : r.rawInput.substring(0, 120);

    return `
      <div class="reminder-card" data-id="${r.id}" data-priority="${r.priority}" data-type="reminder">
        <div class="card-header">
          <span class="card-title">${escapeHtml(r.title)}</span>
          ${priorityBadge(r.priority)}
        </div>
        <div class="card-summary">${escapeHtml(summary)}</div>
        <div class="card-meta">
          <span class="card-meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            ${formatDate(r.remindAt)}
          </span>
          ${r.category ? `<span class="card-meta-item">${r.category}</span>` : ''}
        </div>
        ${tags ? `<div class="card-tags">${tags}</div>` : ''}
      </div>`;
  }

  function renderReminderListItem(r) {
    const tags = (r.tags || []).map(t => `<span class="tag">${t.name || t}</span>`).join('');
    const summary = r.aiSummary
      ? r.aiSummary.replace(/[*#]/g, '').substring(0, 200)
      : r.rawInput.substring(0, 200);

    return `
      <div class="reminder-card" data-id="${r.id}" data-priority="${r.priority}" data-type="reminder">
        <div class="card-header">
          <span class="card-title">${escapeHtml(r.title)}</span>
          <div style="display:flex;gap:6px;">
            ${statusBadge(r.status)}
            ${priorityBadge(r.priority)}
          </div>
        </div>
        <div class="card-summary">${escapeHtml(summary)}</div>
        <div class="card-meta">
          <span class="card-meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            ${formatDate(r.remindAt)}
          </span>
          ${r.category ? `<span class="card-meta-item">${r.category}</span>` : ''}
        </div>
        ${tags ? `<div class="card-tags">${tags}</div>` : ''}
        <div class="card-actions" onclick="event.stopPropagation()">
          ${r.status === 'PENDING' ? `
            <button class="btn btn-success btn-xs" data-action="complete" data-id="${r.id}">✓ Complete</button>
            <button class="btn btn-ghost btn-xs" data-action="snooze" data-id="${r.id}">⏰ Snooze</button>
          ` : ''}
          <button class="btn btn-ghost btn-xs" data-action="edit-reminder" data-id="${r.id}">✎ Edit</button>
          <button class="btn btn-danger btn-xs" data-action="delete-reminder" data-id="${r.id}">✕ Delete</button>
        </div>
      </div>`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NOTES VIEW
  // ═══════════════════════════════════════════════════════════════════════════

  function refreshNotes() {
    const search = $('#note-search').value.toLowerCase();

    let filtered = state.notes;
    if (search) {
      filtered = filtered.filter(n =>
        n.title.toLowerCase().includes(search) ||
        n.rawContent.toLowerCase().includes(search) ||
        (n.aiSummary && n.aiSummary.toLowerCase().includes(search))
      );
    }

    filtered.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    const list = $('#notes-list');
    if (filtered.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📝</div>
          <h3>No notes found</h3>
          <p>${search ? 'Try a different search term' : 'Capture your first idea'}</p>
        </div>`;
    } else {
      list.innerHTML = filtered.map(n => renderNoteListItem(n)).join('');
    }

    bindCardListeners();
  }

  function renderNoteCard(n) {
    const summary = n.aiSummary || n.rawContent.substring(0, 150);
    const tags = (n.tags || []).map(t => `<span class="tag">${t.name || t}</span>`).join('');

    return `
      <div class="note-card" data-id="${n.id}" data-type="note">
        <div class="card-header">
          <span class="card-title">${escapeHtml(n.title)}</span>
          ${n.category ? `<span class="card-badge badge-medium">${n.category}</span>` : ''}
        </div>
        <div class="card-summary">${escapeHtml(summary)}</div>
        ${n.aiKeyPoints && n.aiKeyPoints.length > 0 ? `
          <div class="card-meta">
            <span class="card-meta-item">📌 ${n.aiKeyPoints.length} key points</span>
          </div>
        ` : ''}
        ${tags ? `<div class="card-tags">${tags}</div>` : ''}
      </div>`;
  }

  function renderNoteListItem(n) {
    const summary = n.aiSummary || n.rawContent.substring(0, 250);
    const tags = (n.tags || []).map(t => `<span class="tag">${t.name || t}</span>`).join('');

    return `
      <div class="note-card" data-id="${n.id}" data-type="note">
        <div class="card-header">
          <span class="card-title">${escapeHtml(n.title)}</span>
          ${n.category ? `<span class="card-badge badge-medium">${n.category}</span>` : ''}
        </div>
        <div class="card-summary">${escapeHtml(summary)}</div>
        <div class="card-meta">
          <span class="card-meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            ${formatDate(n.updatedAt)}
          </span>
          ${n.aiKeyPoints && n.aiKeyPoints.length > 0 ? `<span class="card-meta-item">📌 ${n.aiKeyPoints.length} key points</span>` : ''}
        </div>
        ${tags ? `<div class="card-tags">${tags}</div>` : ''}
        <div class="card-actions" onclick="event.stopPropagation()">
          <button class="btn btn-ghost btn-xs" data-action="edit-note" data-id="${n.id}">✎ Edit</button>
          <button class="btn btn-danger btn-xs" data-action="delete-note" data-id="${n.id}">✕ Delete</button>
        </div>
      </div>`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CARD INTERACTIONS (click to view details, action buttons)
  // ═══════════════════════════════════════════════════════════════════════════

  function bindCardListeners() {
    // Card click → open detail
    $$('.reminder-card, .note-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.id;
        const type = card.dataset.type;
        if (type === 'reminder') showReminderDetail(id);
        else showNoteDetail(id);
      });
    });

    // Action buttons
    $$('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleAction(btn.dataset.action, btn.dataset.id);
      });
    });
  }

  async function handleAction(action, id) {
    try {
      switch (action) {
        case 'complete':
          await api.post(`/reminders/${id}/complete`);
          toast('Reminder completed!', 'success');
          await loadAllData();
          if (state.currentView === 'reminders') refreshReminders();
          break;

        case 'snooze': {
          const snoozeDate = new Date(Date.now() + 3600000); // 1 hour from now
          await api.post(`/reminders/${id}/snooze`, {
            snoozeUntil: snoozeDate.toISOString(),
          });
          toast('Snoozed for 1 hour', 'success');
          await loadAllData();
          if (state.currentView === 'reminders') refreshReminders();
          break;
        }

        case 'edit-reminder':
          openEditReminder(id);
          break;

        case 'delete-reminder':
          if (confirm('Delete this reminder?')) {
            await api.del(`/reminders/${id}`);
            toast('Reminder deleted', 'success');
            state.reminders = state.reminders.filter(r => r.id !== id);
            closeAllModals();
            if (state.currentView === 'reminders') refreshReminders();
            else refreshDashboard();
          }
          break;

        case 'edit-note':
          openEditNote(id);
          break;

        case 'delete-note':
          if (confirm('Delete this note?')) {
            await api.del(`/notes/${id}`);
            toast('Note deleted', 'success');
            state.notes = state.notes.filter(n => n.id !== id);
            closeAllModals();
            if (state.currentView === 'notes') refreshNotes();
            else refreshDashboard();
          }
          break;
      }
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  // ─── Detail Modals ──────────────────────────────────────────────────────
  function showReminderDetail(id) {
    const r = state.reminders.find(rem => rem.id === id);
    if (!r) return;

    const tags = (r.tags || []).map(t => `<span class="tag">${t.name || t}</span>`).join('');

    $('#detail-modal-title').textContent = r.title;
    $('#detail-modal-body').innerHTML = `
      <div class="detail-content">
        ${r.aiSummary ? `
          <div class="detail-section">
            <h4>🧠 AI Summary</h4>
            <div class="detail-ai-summary">${escapeHtml(r.aiSummary)}</div>
          </div>
        ` : ''}
        <div class="detail-section">
          <h4>Original Input</h4>
          <p>${escapeHtml(r.rawInput)}</p>
        </div>
        <div class="detail-section">
          <div class="detail-meta-grid">
            <div class="detail-meta-item">
              <div class="detail-meta-label">Status</div>
              <div class="detail-meta-value">${r.status}</div>
            </div>
            <div class="detail-meta-item">
              <div class="detail-meta-label">Priority</div>
              <div class="detail-meta-value">${r.priority}</div>
            </div>
            <div class="detail-meta-item">
              <div class="detail-meta-label">Remind At</div>
              <div class="detail-meta-value">${formatDate(r.remindAt)}</div>
            </div>
            <div class="detail-meta-item">
              <div class="detail-meta-label">Category</div>
              <div class="detail-meta-value">${r.category || '—'}</div>
            </div>
          </div>
        </div>
        ${tags ? `
          <div class="detail-section">
            <h4>Tags</h4>
            <div class="card-tags">${tags}</div>
          </div>
        ` : ''}
        <div class="detail-actions">
          ${r.status === 'PENDING' ? `
            <button class="btn btn-success btn-sm" data-action="complete" data-id="${r.id}">✓ Complete</button>
            <button class="btn btn-ghost btn-sm" data-action="snooze" data-id="${r.id}">⏰ Snooze 1h</button>
          ` : ''}
          <button class="btn btn-ghost btn-sm" data-action="edit-reminder" data-id="${r.id}">✎ Edit</button>
          <button class="btn btn-danger btn-sm" data-action="delete-reminder" data-id="${r.id}">✕ Delete</button>
        </div>
      </div>`;

    show($('#detail-modal'));
    // Rebind action buttons in detail modal
    $$('#detail-modal [data-action]').forEach(btn => {
      btn.addEventListener('click', () => handleAction(btn.dataset.action, btn.dataset.id));
    });
  }

  function showNoteDetail(id) {
    const n = state.notes.find(note => note.id === id);
    if (!n) return;

    const tags = (n.tags || []).map(t => `<span class="tag">${t.name || t}</span>`).join('');
    const keyPoints = (n.aiKeyPoints || []).map(kp => `<li>${escapeHtml(kp)}</li>`).join('');

    $('#detail-modal-title').textContent = n.title;
    $('#detail-modal-body').innerHTML = `
      <div class="detail-content">
        ${n.aiSummary ? `
          <div class="detail-section">
            <h4>🧠 AI Summary</h4>
            <div class="detail-ai-summary">${escapeHtml(n.aiSummary)}</div>
          </div>
        ` : ''}
        ${keyPoints ? `
          <div class="detail-section">
            <h4>📌 Key Points</h4>
            <ul class="detail-key-points">${keyPoints}</ul>
          </div>
        ` : ''}
        <div class="detail-section">
          <h4>Content</h4>
          <div class="detail-text">${escapeHtml(n.rawContent)}</div>
        </div>
        <div class="detail-section">
          <div class="detail-meta-grid">
            <div class="detail-meta-item">
              <div class="detail-meta-label">Category</div>
              <div class="detail-meta-value">${n.category || '—'}</div>
            </div>
            <div class="detail-meta-item">
              <div class="detail-meta-label">Updated</div>
              <div class="detail-meta-value">${formatDate(n.updatedAt)}</div>
            </div>
          </div>
        </div>
        ${tags ? `
          <div class="detail-section">
            <h4>Tags</h4>
            <div class="card-tags">${tags}</div>
          </div>
        ` : ''}
        <div class="detail-actions">
          <button class="btn btn-ghost btn-sm" data-action="edit-note" data-id="${n.id}">✎ Edit</button>
          <button class="btn btn-danger btn-sm" data-action="delete-note" data-id="${n.id}">✕ Delete</button>
        </div>
      </div>`;

    show($('#detail-modal'));
    $$('#detail-modal [data-action]').forEach(btn => {
      btn.addEventListener('click', () => handleAction(btn.dataset.action, btn.dataset.id));
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // REMINDER CRUD MODALS
  // ═══════════════════════════════════════════════════════════════════════════

  function initReminderModal() {
    // New reminder buttons
    $('#new-reminder-btn').addEventListener('click', openNewReminder);

    // Form submit
    $('#reminder-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = $('#reminder-save-btn');
      btn.classList.add('loading');

      const editId = $('#reminder-edit-id').value;
      const body = {
        title: $('#reminder-title').value,
        rawInput: $('#reminder-input').value,
        remindAt: new Date($('#reminder-datetime').value).toISOString(),
        priority: $('#reminder-priority').value,
        tags: $('#reminder-tags').value
          .split(',')
          .map(t => t.trim())
          .filter(Boolean),
      };

      try {
        if (editId) {
          await api.patch(`/reminders/${editId}`, body);
          toast('Reminder updated!', 'success');
        } else {
          await api.post('/reminders', body);
          toast('Reminder created!', 'success');
        }
        closeAllModals();
        await loadAllData();
        if (state.currentView === 'reminders') refreshReminders();
      } catch (err) {
        toast(err.message, 'error');
      } finally {
        btn.classList.remove('loading');
      }
    });
  }

  function openNewReminder() {
    closeAllModals();
    $('#reminder-modal-title').textContent = 'New Reminder';
    $('#reminder-save-btn .btn-text').textContent = 'Create Reminder';
    $('#reminder-form').reset();
    $('#reminder-edit-id').value = '';
    // Default to 1 hour from now
    const d = new Date(Date.now() + 3600000);
    $('#reminder-datetime').value = toDatetimeLocal(d.toISOString());
    show($('#reminder-modal'));
  }

  function openEditReminder(id) {
    closeAllModals();
    const r = state.reminders.find(rem => rem.id === id);
    if (!r) return;

    $('#reminder-modal-title').textContent = 'Edit Reminder';
    $('#reminder-save-btn .btn-text').textContent = 'Save Changes';
    $('#reminder-edit-id').value = r.id;
    $('#reminder-title').value = r.title;
    $('#reminder-input').value = r.rawInput;
    $('#reminder-datetime').value = toDatetimeLocal(r.remindAt);
    $('#reminder-priority').value = r.priority;
    $('#reminder-tags').value = (r.tags || []).map(t => t.name || t).join(', ');

    show($('#reminder-modal'));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NOTE CRUD MODALS
  // ═══════════════════════════════════════════════════════════════════════════

  function initNoteModal() {
    $('#new-note-btn').addEventListener('click', openNewNote);

    $('#note-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = $('#note-save-btn');
      btn.classList.add('loading');

      const editId = $('#note-edit-id').value;
      const body = {
        title: $('#note-title').value,
        rawContent: $('#note-content').value,
        tags: $('#note-tags').value
          .split(',')
          .map(t => t.trim())
          .filter(Boolean),
      };

      try {
        if (editId) {
          await api.patch(`/notes/${editId}`, body);
          toast('Note updated!', 'success');
        } else {
          await api.post('/notes', body);
          toast('Note created!', 'success');
        }
        closeAllModals();
        await loadAllData();
        if (state.currentView === 'notes') refreshNotes();
      } catch (err) {
        toast(err.message, 'error');
      } finally {
        btn.classList.remove('loading');
      }
    });
  }

  function openNewNote() {
    closeAllModals();
    $('#note-modal-title').textContent = 'New Note';
    $('#note-save-btn .btn-text').textContent = 'Create Note';
    $('#note-form').reset();
    $('#note-edit-id').value = '';
    show($('#note-modal'));
  }

  function openEditNote(id) {
    closeAllModals();
    const n = state.notes.find(note => note.id === id);
    if (!n) return;

    $('#note-modal-title').textContent = 'Edit Note';
    $('#note-save-btn .btn-text').textContent = 'Save Changes';
    $('#note-edit-id').value = n.id;
    $('#note-title').value = n.title;
    $('#note-content').value = n.rawContent;
    $('#note-tags').value = (n.tags || []).map(t => t.name || t).join(', ');

    show($('#note-modal'));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // QUICK ADD (+ New button on topbar)
  // ═══════════════════════════════════════════════════════════════════════════

  function initQuickAdd() {
    $('#quick-add-btn').addEventListener('click', () => {
      if (state.currentView === 'notes') {
        openNewNote();
      } else {
        openNewReminder();
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AI ASSISTANT
  // ═══════════════════════════════════════════════════════════════════════════

  function initAI() {
    $('#ai-ask-reminder').addEventListener('click', () => startAI('ask-reminder'));
    $('#ai-ask-note').addEventListener('click', () => startAI('ask-note'));
    $('#ai-categorize').addEventListener('click', () => startAI('categorize'));
    $('#ai-enhance').addEventListener('click', () => startAI('enhance'));

    $('#ai-send').addEventListener('click', sendAI);
    $('#ai-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendAI();
      }
    });
  }

  function startAI(mode) {
    state.aiMode = mode;
    state.aiMessages = [];
    $('#ai-chat').classList.remove('hidden');
    $('#ai-messages').innerHTML = '';

    const prompts = {
      'ask-reminder': '✨ Describe your reminder and I\'ll ask smart follow-up questions to make it perfect.',
      'ask-note': '📝 Share your note content and I\'ll generate insights, summaries, and key points.',
      'categorize': '🏷️ Paste any text and I\'ll auto-categorize it with suggested tags.',
      'enhance': '✨ Share your note content and I\'ll enhance it with AI-powered insights.',
    };

    const placeholders = {
      'ask-reminder': 'Describe your reminder... e.g., "Dentist appointment next Tuesday"',
      'ask-note': 'Write or paste your note content...',
      'categorize': 'Paste text to categorize...',
      'enhance': 'Paste your note content to enhance...',
    };

    addAIMessage('assistant', prompts[mode]);
    $('#ai-input').placeholder = placeholders[mode] || 'Type here...';
    $('#ai-input').focus();
  }

  async function sendAI() {
    const input = $('#ai-input').value.trim();
    if (!input) return;

    addAIMessage('user', input);
    $('#ai-input').value = '';

    // Show loading
    const loadingEl = document.createElement('div');
    loadingEl.className = 'ai-message ai-message-assistant ai-message-loading';
    loadingEl.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
    $('#ai-messages').appendChild(loadingEl);
    scrollAIChat();

    try {
      let result;

      switch (state.aiMode) {
        case 'ask-reminder':
          result = await api.post('/ai/ask', { input, type: 'reminder' });
          if (result.data?.questions) {
            const questions = Array.isArray(result.data.questions) ? result.data.questions : [result.data.questions];
            addAIMessage('assistant', '**Follow-up questions:**\n\n' + questions.map((q, i) => `${i + 1}. ${q}`).join('\n'));
          } else {
            addAIMessage('assistant', JSON.stringify(result.data, null, 2));
          }
          break;

        case 'ask-note':
          result = await api.post('/ai/ask', { input, type: 'note' });
          if (result.data?.questions) {
            const questions = Array.isArray(result.data.questions) ? result.data.questions : [result.data.questions];
            addAIMessage('assistant', '**Follow-up questions:**\n\n' + questions.map((q, i) => `${i + 1}. ${q}`).join('\n'));
          } else {
            addAIMessage('assistant', JSON.stringify(result.data, null, 2));
          }
          break;

        case 'categorize':
          result = await api.post('/ai/categorize', { input });
          if (result.data) {
            const d = result.data;
            let text = `**Category:** ${d.category || 'Unknown'}\n`;
            if (d.tags && d.tags.length) text += `**Tags:** ${d.tags.join(', ')}\n`;
            if (d.confidence) text += `**Confidence:** ${d.confidence}`;
            addAIMessage('assistant', text);
          }
          break;

        case 'enhance':
          result = await api.post('/ai/enhance-note', { content: input });
          if (result.data) {
            const d = result.data;
            let text = '';
            if (d.summary) text += `**Summary:**\n${d.summary}\n\n`;
            if (d.keyPoints && d.keyPoints.length) {
              text += `**Key Points:**\n${d.keyPoints.map(kp => `• ${kp}`).join('\n')}\n\n`;
            }
            if (d.enhanced) text += `**Enhanced:**\n${d.enhanced}`;
            addAIMessage('assistant', text || JSON.stringify(d, null, 2));
          }
          break;
      }
    } catch (err) {
      addAIMessage('assistant', `❌ ${err.message}\n\n_Note: Make sure an AI API key is configured in your .env file._`);
    } finally {
      loadingEl.remove();
    }
  }

  function addAIMessage(role, content) {
    state.aiMessages.push({ role, content });
    const el = document.createElement('div');
    el.className = `ai-message ai-message-${role === 'user' ? 'user' : 'assistant'}`;
    // Simple markdown-like bold
    const formatted = escapeHtml(content)
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
    el.innerHTML = formatted;
    $('#ai-messages').appendChild(el);
    scrollAIChat();
  }

  function scrollAIChat() {
    const el = $('#ai-messages');
    el.scrollTop = el.scrollHeight;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MODALS MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  function initModals() {
    // Close buttons
    $$('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', closeAllModals);
    });

    // Click outside to close
    $$('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeAllModals();
      });
    });

    // Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeAllModals();
    });
  }

  function closeAllModals() {
    $$('.modal-overlay').forEach(m => m.classList.remove('active'));
  }

  // ─── Filters ────────────────────────────────────────────────────────────
  function initFilters() {
    $('#reminder-status-filter').addEventListener('change', refreshReminders);
    $('#reminder-priority-filter').addEventListener('change', refreshReminders);

    let searchTimeout;
    $('#reminder-search').addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(refreshReminders, 300);
    });

    $('#note-search').addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(refreshNotes, 300);
    });
  }

  // ─── Utility ────────────────────────────────────────────────────────────
  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════════════════════════════

  async function init() {
    initAuth();
    initNavigation();
    initReminderModal();
    initNoteModal();
    initQuickAdd();
    initAI();
    initModals();
    initFilters();

    // Check if already logged in
    const isAuthed = await checkAuth();
    if (isAuthed) {
      showDashboard();
    } else {
      showAuth();
      // Pre-fill demo credentials
      $('#login-email').value = 'demo@memora.app';
      $('#login-password').value = 'password123';
    }
  }

  // Start the app
  init();
})();
