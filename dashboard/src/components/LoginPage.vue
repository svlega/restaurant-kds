<template>
  <div class="login-wrap">
    <div class="login-box">
      <h1>🍕 {{ restaurantName }}</h1>
      <p class="subtitle">Kitchen Display</p>
      <form @submit.prevent="submit">
        <div class="field">
          <label>Username</label>
          <input v-model="username" type="text" autocomplete="username" required />
        </div>
        <div class="field">
          <label>Password</label>
          <input v-model="password" type="password" autocomplete="current-password" required />
        </div>
        <p v-if="error" class="error">{{ error }}</p>
        <button type="submit" :disabled="loading">
          {{ loading ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useOrdersStore } from '@/stores/orders';

const store = useOrdersStore();
const restaurantName = import.meta.env.VITE_RESTAURANT_NAME || 'KDS';
const username = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

async function submit() {
  error.value = '';
  loading.value = true;
  try {
    await store.login(username.value, password.value);
  } catch {
    error.value = 'Invalid username or password';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #111827;
}

.login-box {
  background: #1f2937;
  border: 1px solid #374151;
  border-radius: 12px;
  padding: 40px;
  width: 100%;
  max-width: 360px;
}

h1 { font-size: 1.4rem; font-weight: 700; color: #f9fafb; margin-bottom: 4px; }
.subtitle { color: #9ca3af; font-size: 0.9rem; margin-bottom: 28px; }

.field { margin-bottom: 16px; }
label { display: block; font-size: 0.8rem; color: #9ca3af; margin-bottom: 6px; }

input {
  width: 100%;
  background: #111827;
  border: 1px solid #374151;
  border-radius: 6px;
  padding: 10px 12px;
  color: #f9fafb;
  font-size: 0.95rem;
  box-sizing: border-box;
}
input:focus { outline: none; border-color: #6366f1; }

button {
  width: 100%;
  background: #6366f1;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 11px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  margin-top: 8px;
  transition: background 0.2s;
}
button:hover:not(:disabled) { background: #4f46e5; }
button:disabled { opacity: 0.6; cursor: not-allowed; }

.error { color: #f87171; font-size: 0.85rem; margin-bottom: 8px; }
</style>
