<template>
  <div class="booking-list-view p-4">
    <header class="flex justify-between items-center mb-4">
      <h1 class="text-2xl font-bold">Bookings</h1>
      <div class="view-switcher flex items-center gap-2">
        <BaseButton @click="viewMode = 'grid'" :class="{ 'bg-gray-300': viewMode === 'grid' }">Grid</BaseButton>
        <BaseButton @click="viewMode = 'table'" :class="{ 'bg-gray-300': viewMode === 'table' }">Table</BaseButton>
      </div>
    </header>

    <div class="filters mb-4">
      <input
        type="text"
        placeholder="Search..."
        @input="updateSearchQuery($event.target.value)"
        class="p-2 border rounded w-full md:w-1/3"
      />
    </div>

    <div v-if="bookingsStore.loading" class="loading">
      Loading bookings...
    </div>

    <div v-else-if="bookingsStore.error" class="error text-red-500">
      {{ bookingsStore.error }}
    </div>

    <div v-else>
      <!-- Grid View -->
      <div v-if="viewMode === 'grid'" class="booking-grid">
        <div v-for="item in bookingsStore.bookings" :key="item.id" class="p-4 border rounded shadow hover:shadow-lg transition-shadow">
          <h2 class="font-bold text-lg">{{ item.equipment.name }}</h2>
          <p class="text-gray-600">Quantity: {{ item.quantity }}</p>
          <p class="text-sm mt-2">Start: <span class="font-semibold">{{ item.start_date }}</span></p>
          <p class="text-sm">End: <span class="font-semibold">{{ item.end_date }}</span></p>
        </div>
      </div>

      <!-- Table View -->
      <DataTable
        v-else-if="viewMode === 'table'"
        :columns="columns"
        :data="bookingsStore.bookings"
      >
        <template #cell-equipment="{ item }">
          {{ item.equipment.name }}
        </template>
      </DataTable>

      <div class="pagination mt-4 flex justify-center items-center">
        <BaseButton @click="prevPage" :disabled="bookingsStore.pagination.page <= 1">Previous</BaseButton>
        <span class="mx-4">Page {{ bookingsStore.pagination.page }} of {{ bookingsStore.pagination.totalPages }}</span>
        <BaseButton @click="nextPage" :disabled="bookingsStore.pagination.page >= bookingsStore.pagination.totalPages">Next</BaseButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useBookingsStore } from '@/stores/bookings';
import BaseButton from '@/components/common/BaseButton.vue';
import DataTable from '@/components/common/DataTable.vue';
import { debounce } from 'lodash-es';

const bookingsStore = useBookingsStore();
const viewMode = ref<'grid' | 'table'>('grid');

const columns = [
  { key: 'equipment', label: 'Equipment' },
  { key: 'quantity', label: 'Quantity' },
  { key: 'start_date', label: 'Start Date' },
  { key: 'end_date', label: 'End Date' },
];

onMounted(() => {
  bookingsStore.fetchBookings();
});

const updateSearchQuery = debounce((query: string) => {
  bookingsStore.setFilters({ query });
}, 300);

function prevPage() {
  bookingsStore.setPage(bookingsStore.pagination.page - 1);
}

function nextPage() {
  bookingsStore.setPage(bookingsStore.pagination.page + 1);
}
</script>

<style scoped>
.booking-grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4;
}
</style>
