// src/components/__tests__/OrderCard.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import OrderCard from '../OrderCard.vue';
import { useOrdersStore } from '@/stores/orders';

const mockOrder = {
  orderNum: '007',
  phone: '33612345678',
  items: ['2x Margherita', '1x Viking'],
  messages: ['🕒 Heure: 20:00 | ✨ Extras: Aucun | 🍕 Entière 🍕 | 📝 Note: N/A'],
  status: 'new',
  time: '19:30:00',
  total: '39.00',
};

beforeEach(() => {
  setActivePinia(createPinia());
});

describe('OrderCard', () => {
  it('renders order number', () => {
    const wrapper = mount(OrderCard, {
      props: { order: mockOrder, status: 'new' },
    });
    expect(wrapper.text()).toContain('#007');
  });

  it('renders all items', () => {
    const wrapper = mount(OrderCard, {
      props: { order: mockOrder, status: 'new' },
    });
    expect(wrapper.text()).toContain('2x Margherita');
    expect(wrapper.text()).toContain('1x Viking');
  });

  it('shows "En préparation" button when status is new', () => {
    const wrapper = mount(OrderCard, {
      props: { order: mockOrder, status: 'new' },
    });
    expect(wrapper.text()).toContain('En préparation');
  });

  it('shows "Prête" button when status is preparing', () => {
    const wrapper = mount(OrderCard, {
      props: { order: { ...mockOrder, status: 'preparing' }, status: 'preparing' },
    });
    expect(wrapper.text()).toContain('Prête');
  });

  it('calls updateStatus when advance button clicked', async () => {
    const store = useOrdersStore();
    store.updateStatus = vi.fn();

    const wrapper = mount(OrderCard, {
      props: { order: mockOrder, status: 'new' },
    });

    await wrapper.find('.btn-prep').trigger('click');
    expect(store.updateStatus).toHaveBeenCalledWith('007', 'preparing');
  });

  it('applies asap class for ASAP orders', () => {
    const asapOrder = {
      ...mockOrder,
      messages: ['🕒 Heure: ASAP | ✨ Extras: Aucun | 🍕 Entière 🍕 | 📝 Note: N/A'],
    };
    const wrapper = mount(OrderCard, {
      props: { order: asapOrder, status: 'new' },
    });
    expect(wrapper.find('.card').classes()).toContain('asap');
  });
});
