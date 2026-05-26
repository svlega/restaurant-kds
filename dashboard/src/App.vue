<template>
  <LoginPage v-if="!store.isAuthenticated" />

  <div v-else class="app">
    <header class="app-header">
      <h1>🍕 {{ restaurantName }} — KDS</h1>
      <div class="header-right">
        <PrinterStatus />
        <button
          class="sound-btn"
          :class="{ active: store.soundEnabled }"
          @click="store.enableSound()"
          :title="store.soundEnabled ? 'Son activé' : 'Activer le son'"
        >
          {{ store.soundEnabled ? '🔔' : '🔕' }}
        </button>
        <span class="ws-badge" :class="{ online: store.connected }">
          {{ store.connected ? '● Live' : '○ Offline' }}
        </span>
        <button class="hours-btn" @click="showHours = true">⏰ Hours</button>
        <button class="logout-btn" @click="store.logout()">Logout</button>
      </div>
    </header>

    <main class="kds-grid">
      <KdsColumn title="Nouvelles" status="new" accent="#e67e22" />
      <KdsColumn title="En Préparation" status="preparing" accent="#2980b9" />
      <KdsColumn title="Prêtes" status="ready" accent="#27ae60" />
    </main>

    <OpeningHoursModal v-if="showHours" @close="showHours = false" />
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, watch, ref } from 'vue';
import { useOrdersStore } from '@/stores/orders';
import KdsColumn from '@/components/KdsColumn.vue';
import PrinterStatus from '@/components/PrinterStatus.vue';
import LoginPage from '@/components/LoginPage.vue';
import OpeningHoursModal from '@/components/OpeningHoursModal.vue';

const store = useOrdersStore();
const showHours = ref(false);
const restaurantName = import.meta.env.VITE_RESTAURANT_NAME || 'KDS';

let printerInterval;

async function initDashboard() {
  await store.fetchOrders();
  store.initSocket();
  store.fetchPrinterStatus();
  printerInterval = setInterval(store.fetchPrinterStatus, 5000);
}

onMounted(() => {
  if (store.isAuthenticated) initDashboard();
});

watch(() => store.isAuthenticated, (authenticated) => {
  if (authenticated) initDashboard();
  else clearInterval(printerInterval);
});

onUnmounted(() => clearInterval(printerInterval));
</script>

<style>
* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'Segoe UI', system-ui, sans-serif;
  background: #111827;
  color: #f9fafb;
  min-height: 100vh;
}

.app { display: flex; flex-direction: column; height: 100vh; }

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background: #1f2937;
  border-bottom: 1px solid #374151;
  flex-shrink: 0;
}

.app-header h1 { font-size: 1.25rem; font-weight: 700; }

.header-right { display: flex; align-items: center; gap: 16px; }

.sound-btn {
  background: none;
  border: 1px solid #4b5563;
  border-radius: 6px;
  padding: 4px 10px;
  cursor: pointer;
  font-size: 1.1rem;
  transition: background 0.2s;
}
.sound-btn.active { background: #374151; }

.ws-badge { font-size: 0.8rem; color: #9ca3af; }
.ws-badge.online { color: #34d399; }

.hours-btn {
  background: none;
  border: 1px solid #4b5563;
  border-radius: 6px;
  padding: 4px 10px;
  color: #9ca3af;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s;
}
.hours-btn:hover { border-color: #6366f1; color: #6366f1; }

.logout-btn {
  background: none;
  border: 1px solid #4b5563;
  border-radius: 6px;
  padding: 4px 10px;
  color: #9ca3af;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s;
}
.logout-btn:hover { border-color: #f87171; color: #f87171; }

.kds-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  padding: 16px;
  flex: 1;
  overflow: hidden;
}

@media (max-width: 900px) {
  .kds-grid { grid-template-columns: 1fr; overflow-y: auto; }
}
</style>
