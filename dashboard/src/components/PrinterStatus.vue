<template>
  <div class="printers">
    <span
      v-for="p in store.printers"
      :key="p.name"
      class="printer-pill"
      :class="p.online ? 'online' : 'offline'"
      :title="`Dernière activité: ${p.lastSeen}`"
    >
      {{ p.online ? '🟢' : '🔴' }} {{ p.name }}
    </span>
    <span v-if="store.printers.length === 0" class="printer-pill offline">
      🔴 Imprimante inconnue
    </span>
  </div>
</template>

<script setup>
import { useOrdersStore } from '@/stores/orders';
const store = useOrdersStore();
</script>

<style scoped>
.printers { display: flex; gap: 8px; flex-wrap: wrap; }

.printer-pill {
  font-size: 0.78rem;
  padding: 3px 10px;
  border-radius: 12px;
  border: 1px solid #374151;
}

.printer-pill.online { color: #34d399; border-color: #34d399; }
.printer-pill.offline { color: #f87171; border-color: #f87171; }
</style>
