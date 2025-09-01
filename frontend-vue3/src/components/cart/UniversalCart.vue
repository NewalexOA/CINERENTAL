<template>
  <div :class="cartContainerClasses">
    <div v-if="!isEmbedded" class="floating-cart-toggle">
      <BaseButton @click="cartStore.toggleVisibility" icon="shopping-cart">
        <span v-if="cartStore.itemCount > 0" class="badge">{{ cartStore.itemCount }}</span>
      </BaseButton>
    </div>

    <div v-if="cartStore.isVisible || isEmbedded" class="cart-content">
      <div class="cart-header">
        <h3>Universal Cart</h3>
        <BaseButton @click="cartStore.clearCart" variant="danger" size="sm">Clear</BaseButton>
      </div>

      <div class="cart-items">
        <!-- CartItem components will go here -->
        <div v-for="item in cartStore.cartItems" :key="item.equipment.id" class="cart-item">
          {{ item.equipment.name }} - Qty: {{ item.quantity }}
        </div>
        <p v-if="!cartStore.hasItems">Your cart is empty.</p>
      </div>

      <div class="cart-footer">
        <BaseButton @click="executeAction">Execute Action</BaseButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useCartStore } from '@/stores/cart';
import BaseButton from '@/components/common/BaseButton.vue';

interface Props {
  mode?: 'floating' | 'embedded';
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'floating',
});

const cartStore = useCartStore();

const isEmbedded = computed(() => props.mode === 'embedded');

const cartContainerClasses = computed(() => ({
  'universal-cart': true,
  'cart--embedded': isEmbedded.value,
  'cart--floating': !isEmbedded.value,
  'cart--visible': cartStore.isVisible,
}));

function executeAction() {
  // Placeholder for executing the cart's primary action
  console.log('Executing cart action...');
}

</script>

<style scoped>
.cart--floating {
  @apply fixed bottom-5 right-5 z-50;
}

.cart-content {
  @apply bg-white rounded-lg shadow-lg p-4 border border-gray-200 w-96;
}

.cart-header {
  @apply flex justify-between items-center pb-2 border-b;
}

.cart-items {
  @apply my-4 max-h-96 overflow-y-auto;
}

.cart-item {
  @apply flex justify-between items-center p-2 border-b;
}

.badge {
  @apply bg-red-500 text-white rounded-full px-2 py-1 text-xs absolute -top-2 -right-2;
}
</style>
