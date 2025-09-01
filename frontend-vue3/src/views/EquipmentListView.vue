<template>
  <div class="equipment-list-view">
    <h1>Equipment Catalog</h1>

    <!-- TODO: Create and use a dedicated Filter component -->
    <div class="filters mb-4">
      <input
        type="text"
        placeholder="Search..."
        @input="updateSearchQuery($event.target.value)"
        class="p-2 border rounded"
      />
    </div>

    <div v-if="equipmentStore.loading" class="loading">
      Loading equipment...
    </div>

    <div v-else-if="equipmentStore.error" class="error text-red-500">
      {{ equipmentStore.error }}
    </div>

    <div v-else>
      <div class="equipment-grid">
        <!-- TODO: Create and use a dedicated EquipmentCard component -->
        <div v-for="item in equipmentStore.items" :key="item.id" class="p-4 border rounded shadow">
          <h2>{{ item.name }}</h2>
          <p>{{ item.category_name }}</p>
          <p>Status: {{ item.status }}</p>
          <BaseButton @click="addToCart(item)">Add to Cart</BaseButton>
        </div>
      </div>

      <!-- TODO: Create and use a dedicated Pagination component -->
      <div class="pagination mt-4">
        <BaseButton @click="prevPage" :disabled="equipmentStore.pagination.page <= 1">Previous</BaseButton>
        <span class="mx-2">Page {{ equipmentStore.pagination.page }} of {{ equipmentStore.pagination.totalPages }}</span>
        <BaseButton @click="nextPage" :disabled="equipmentStore.pagination.page >= equipmentStore.pagination.totalPages">Next</BaseButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useEquipmentStore } from '@/stores/equipment';
import { useCartStore } from '@/stores/cart';
import type { EquipmentResponse } from '@/types/equipment';
import BaseButton from '@/components/common/BaseButton.vue';
import { debounce } from 'lodash-es'; // Note: lodash-es would need to be installed

const equipmentStore = useEquipmentStore();
const cartStore = useCartStore();

onMounted(() => {
  equipmentStore.fetchEquipment();
});

const updateSearchQuery = debounce((query: string) => {
  equipmentStore.setFilters({ query });
}, 300);

function addToCart(item: EquipmentResponse) {
  const cartItem = {
    equipment: item,
    quantity: 1,
    startDate: '', // Placeholder
    endDate: '', // Placeholder
    dailyCost: item.daily_cost,
    totalCost: item.daily_cost, // Simplified for now
  };
  cartStore.addItem(cartItem);
}

function prevPage() {
  equipmentStore.setPage(equipmentStore.pagination.page - 1);
}

function nextPage() {
  equipmentStore.setPage(equipmentStore.pagination.page + 1);
}
</script>

<style scoped>
.equipment-grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4;
}
</style>
