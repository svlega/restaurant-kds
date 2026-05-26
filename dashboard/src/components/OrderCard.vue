<template>
  <div class="card" :class="{ asap: isAsap }">
    <div class="card-top">
      <span class="order-num">#{{ order.orderNum }}</span>
      <span class="time">{{ order.time }}</span>
    </div>

    <div class="phone">📞 {{ order.phone }}</div>

    <ul class="items">
      <li v-for="item in order.items" :key="item">{{ item }}</li>
    </ul>

    <div v-if="order.messages.length" class="messages">
      <div
        v-for="(msg, i) in order.messages"
        :key="i"
        class="msg"
        :class="{ 'msg-flow': msg.includes('🕒') }"
      >
        {{ msg }}
      </div>
    </div>

    <div class="card-footer">
      <span class="total">{{ order.total }}€</span>
      <div class="actions">
        <button
          v-if="status === 'new'"
          class="btn btn-prep"
          @click="advance('preparing')"
        >
          En préparation →
        </button>
        <button
          v-else-if="status === 'preparing'"
          class="btn btn-ready"
          @click="advance('ready')"
        >
          Prête ✅
        </button>
        <button class="btn btn-print" @click="reprint" :disabled="reprinting">
          {{ reprinting ? '...' : '🖨️' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useOrdersStore } from '@/stores/orders';

const props = defineProps({
  order: { type: Object, required: true },
  status: { type: String, required: true },
});

const store = useOrdersStore();
const reprinting = ref(false);

const isAsap = computed(() =>
  (props.order.messages || []).some(
    (m) => m.includes('ASAP') || m.includes('possible')
  )
);

async function advance(newStatus) {
  await store.updateStatus(props.order.orderNum, newStatus);
}

async function reprint() {
  reprinting.value = true;
  await store.reprint(props.order.orderNum);
  setTimeout(() => (reprinting.value = false), 1500);
}
</script>

<style scoped>
.card {
  background: #fff;
  color: #111827;
  border-radius: 8px;
  padding: 14px;
  margin-bottom: 12px;
  border-left: 4px solid transparent;
}

.card.asap { border-left-color: #ef4444; }

.card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }

.order-num { font-size: 1.6rem; font-weight: 800; color: #e67e22; }
.time { font-size: 0.75rem; color: #9ca3af; }

.phone { font-size: 0.85rem; font-weight: 600; color: #2563eb; margin-bottom: 8px; }

.items { list-style: none; margin: 0 0 8px; font-size: 1rem; }
.items li { padding: 2px 0; }

.messages { border-left: 3px solid #f59e0b; padding-left: 8px; margin-bottom: 10px; font-size: 0.82rem; color: #4b5563; }

.msg { margin-bottom: 2px; }
.msg-flow { color: #d97706; font-weight: 600; }

.card-footer { display: flex; justify-content: space-between; align-items: center; }

.total { font-weight: 700; font-size: 1rem; }

.actions { display: flex; gap: 6px; }

.btn {
  border: none;
  padding: 6px 12px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.82rem;
  font-weight: 600;
  transition: opacity 0.15s;
}
.btn:disabled { opacity: 0.5; cursor: default; }
.btn-prep { background: #e67e22; color: white; }
.btn-ready { background: #16a34a; color: white; }
.btn-print { background: #374151; color: white; }
</style>
