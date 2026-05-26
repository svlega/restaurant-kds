<template>
  <div class="column">
    <div class="column-header" :style="{ borderColor: accent }">
      <h2>{{ title }}</h2>
      <span class="count">{{ orders.length }}</span>
    </div>
    <div class="column-body">
      <TransitionGroup name="card">
        <OrderCard
          v-for="order in orders"
          :key="order.orderNum"
          :order="order"
          :status="status"
        />
      </TransitionGroup>
      <p v-if="orders.length === 0" class="empty">Aucune commande</p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useOrdersStore } from '@/stores/orders';
import OrderCard from './OrderCard.vue';

const props = defineProps({
  title: { type: String, required: true },
  status: { type: String, required: true },
  accent: { type: String, default: '#e67e22' },
});

const store = useOrdersStore();
const orders = computed(() => store.byStatus[props.status] ?? []);
</script>

<style scoped>
.column {
  background: #1f2937;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #374151;
}

.column-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 3px solid #e67e22;
  flex-shrink: 0;
}

.column-header h2 { font-size: 0.95rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }

.count {
  background: #374151;
  border-radius: 12px;
  padding: 2px 10px;
  font-size: 0.85rem;
  font-weight: 600;
}

.column-body { flex: 1; overflow-y: auto; padding: 12px; }

.empty { color: #6b7280; text-align: center; margin-top: 40px; font-size: 0.9rem; }

.card-enter-active, .card-leave-active { transition: all 0.3s ease; }
.card-enter-from { opacity: 0; transform: translateY(-12px); }
.card-leave-to { opacity: 0; transform: scale(0.95); }
</style>
