// src/stores/orders.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { io } from 'socket.io-client';

const API = import.meta.env.VITE_API_URL || '';

export const useOrdersStore = defineStore('orders', () => {
  const orders = ref([]);
  const printers = ref([]);
  const connected = ref(false);
  const soundEnabled = ref(false);
  const token = ref(localStorage.getItem('kds_token') || null);

  // ── Auth ─────────────────────────────────────────────────────────────────
  const isAuthenticated = computed(() => !!token.value);

  async function login(username, password) {
    const res = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) throw new Error('Invalid credentials');

    const data = await res.json();
    token.value = data.token;
    localStorage.setItem('kds_token', data.token);
  }

  function logout() {
    token.value = null;
    localStorage.removeItem('kds_token');
    if (socket) socket.disconnect();
    connected.value = false;
    orders.value = [];
  }

  function authHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.value}`,
    };
  }

  // ── Derived state ────────────────────────────────────────────────────────
  const byStatus = computed(() => ({
    new: sorted.value.filter((o) => o.status === 'new'),
    preparing: sorted.value.filter((o) => o.status === 'preparing'),
    ready: sorted.value.filter((o) => o.status === 'ready'),
  }));

  const sorted = computed(() => {
    return [...orders.value].sort((a, b) => getTimeValue(a) - getTimeValue(b));
  });

  function getTimeValue(order) {
    const msg = (order.messages || []).find((m) => m.includes('🕒 Heure:'));
    if (!msg) return 9999;
    const part = msg.split('Heure: ')[1]?.split(' |')[0] ?? '';
    if (part === 'ASAP' || part.includes('possible')) return 0;
    return parseInt(part.replace(':', ''), 10) || 9999;
  }

  // ── Socket ───────────────────────────────────────────────────────────────
  let socket = null;
  const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');

  function initSocket() {
    socket = io(API, { auth: { token: token.value } });

    socket.on('connect', () => {
      connected.value = true;
    });

    socket.on('connect_error', (err) => {
      if (err.message === 'Unauthorized') logout();
    });

    socket.on('disconnect', () => {
      connected.value = false;
    });

    socket.on('state-update', (updatedOrders) => {
      const prevIds = new Set(orders.value.map((o) => o.orderNum));
      const hasNew = updatedOrders.some(
        (o) => o.status === 'new' && !prevIds.has(o.orderNum)
      );
      if (hasNew && soundEnabled.value) {
        audio.play().catch(() => {});
      }
      orders.value = updatedOrders;
    });

    socket.on('orders-reset', () => {
      orders.value = [];
    });
  }

  // ── API calls ─────────────────────────────────────────────────────────────
  async function fetchOrders() {
    const res = await fetch(`${API}/api/orders`, { headers: authHeaders() });
    if (res.status === 401) { logout(); return; }
    orders.value = await res.json();
  }

  async function updateStatus(orderNum, status) {
    await fetch(`${API}/api/orders/${orderNum}/status`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ status }),
    });
  }

  async function reprint(orderNum) {
    await fetch(`${API}/api/orders/${orderNum}/reprint`, {
      method: 'POST',
      headers: authHeaders(),
    });
  }

  async function fetchPrinterStatus() {
    const res = await fetch(`${API}/api/printer/status`);
    printers.value = await res.json();
  }

  function enableSound() {
    soundEnabled.value = true;
  }

  return {
    orders,
    printers,
    connected,
    soundEnabled,
    token,
    isAuthenticated,
    byStatus,
    login,
    logout,
    initSocket,
    fetchOrders,
    updateStatus,
    reprint,
    fetchPrinterStatus,
    enableSound,
  };
});
