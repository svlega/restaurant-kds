<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal">
      <div class="modal-header">
        <h2>Opening Hours</h2>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>

      <div v-if="loading" class="loading">Loading…</div>

      <div v-else class="modal-body">
        <div v-for="(day, index) in days" :key="index" class="day-row">
          <div class="day-name">{{ day }}</div>
          <div class="slots">
            <div v-for="(slot, si) in hours[index]" :key="si" class="slot">
              <input v-model="slot.start" type="time" />
              <span>–</span>
              <input v-model="slot.end" type="time" />
              <button class="remove-btn" @click="removeSlot(index, si)" title="Remove slot">✕</button>
            </div>
            <div v-if="!hours[index] || hours[index].length === 0" class="closed-label">
              Closed
            </div>
          </div>
          <button class="add-btn" @click="addSlot(index)">+ Add slot</button>
        </div>
      </div>

      <div class="modal-footer">
        <p v-if="error" class="error">{{ error }}</p>
        <p v-if="saved" class="success">Saved!</p>
        <button class="save-btn" :disabled="saving" @click="save">
          {{ saving ? 'Saving…' : 'Save' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useOrdersStore } from '@/stores/orders';

defineEmits(['close']);
const store = useOrdersStore();
const API = import.meta.env.VITE_API_URL || '';

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const hours = ref({});
const loading = ref(true);
const saving = ref(false);
const error = ref('');
const saved = ref(false);

onMounted(async () => {
  const res = await fetch(`${API}/api/settings/hours`, {
    headers: { Authorization: `Bearer ${store.token}` },
  });
  const data = await res.json();
  // Ensure all 7 days exist
  for (let i = 0; i < 7; i++) {
    hours.value[i] = data[i] ? data[i].map((s) => ({ ...s })) : [];
  }
  loading.value = false;
});

function addSlot(dayIndex) {
  if (!hours.value[dayIndex]) hours.value[dayIndex] = [];
  hours.value[dayIndex].push({ start: '12:00', end: '14:00' });
}

function removeSlot(dayIndex, slotIndex) {
  hours.value[dayIndex].splice(slotIndex, 1);
}

async function save() {
  saving.value = true;
  error.value = '';
  saved.value = false;
  try {
    const res = await fetch(`${API}/api/settings/hours`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${store.token}`,
      },
      body: JSON.stringify(hours.value),
    });
    if (!res.ok) throw new Error('Failed to save');
    saved.value = true;
    setTimeout(() => (saved.value = false), 3000);
  } catch {
    error.value = 'Failed to save. Please try again.';
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal {
  background: #1f2937;
  border: 1px solid #374151;
  border-radius: 12px;
  width: 100%;
  max-width: 560px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #374151;
}

.modal-header h2 { font-size: 1.1rem; font-weight: 700; }

.close-btn {
  background: none;
  border: none;
  color: #9ca3af;
  font-size: 1rem;
  cursor: pointer;
  padding: 4px 8px;
}
.close-btn:hover { color: #f9fafb; }

.modal-body {
  overflow-y: auto;
  padding: 16px 24px;
  flex: 1;
}

.loading { padding: 32px; text-align: center; color: #9ca3af; }

.day-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid #374151;
  flex-wrap: wrap;
}

.day-name {
  width: 90px;
  font-size: 0.85rem;
  color: #d1d5db;
  flex-shrink: 0;
}

.slots { display: flex; flex-direction: column; gap: 6px; flex: 1; }

.slot {
  display: flex;
  align-items: center;
  gap: 6px;
}

.slot span { color: #6b7280; }

input[type='time'] {
  background: #111827;
  border: 1px solid #374151;
  border-radius: 6px;
  color: #f9fafb;
  padding: 4px 8px;
  font-size: 0.85rem;
}
input[type='time']:focus { outline: none; border-color: #6366f1; }

.remove-btn {
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  font-size: 0.8rem;
  padding: 2px 6px;
}
.remove-btn:hover { color: #f87171; }

.closed-label { font-size: 0.8rem; color: #6b7280; }

.add-btn {
  background: none;
  border: 1px dashed #4b5563;
  border-radius: 6px;
  color: #9ca3af;
  cursor: pointer;
  font-size: 0.75rem;
  padding: 3px 10px;
  white-space: nowrap;
}
.add-btn:hover { border-color: #6366f1; color: #6366f1; }

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid #374151;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
}

.save-btn {
  background: #6366f1;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 8px 24px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
}
.save-btn:hover:not(:disabled) { background: #4f46e5; }
.save-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.error { color: #f87171; font-size: 0.85rem; }
.success { color: #34d399; font-size: 0.85rem; }
</style>
