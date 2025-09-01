<template>
  <div class="client-list-view p-4">
    <header class="flex justify-between items-center mb-4">
      <h1 class="text-2xl font-bold">Clients</h1>
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

    <div v-if="clientsStore.loading" class="loading">
      Loading clients...
    </div>

    <div v-else-if="clientsStore.error" class="error text-red-500">
      {{ clientsStore.error }}
    </div>

    <div v-else>
      <!-- Grid View -->
      <div v-if="viewMode === 'grid'" class="client-grid">
        <div v-for="item in clientsStore.clients" :key="item.id" class="p-4 border rounded shadow hover:shadow-lg transition-shadow">
          <h2 class="font-bold text-lg">{{ item.name }}</h2>
          <p class="text-gray-600">{{ item.contact_person }}</p>
          <p class="text-sm mt-2">{{ item.email }}</p>
          <p class="text-sm">{{ item.phone }}</p>
        </div>
      </div>

      <!-- Table View -->
      <DataTable
        v-else-if="viewMode === 'table'"
        :columns="columns"
        :data="clientsStore.clients"
      />

      <div class="pagination mt-4 flex justify-center items-center">
        <BaseButton @click="prevPage" :disabled="clientsStore.pagination.page <= 1">Previous</BaseButton>
        <span class="mx-4">Page {{ clientsStore.pagination.page }} of {{ clientsStore.pagination.totalPages }}</span>
        <BaseButton @click="nextPage" :disabled="clientsStore.pagination.page >= clientsStore.pagination.totalPages">Next</BaseButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useClientsStore } from '@/stores/clients';
import BaseButton from '@/components/common/BaseButton.vue';
import DataTable from '@/components/common/DataTable.vue';
import { debounce } from 'lodash-es';

const clientsStore = useClientsStore();
const viewMode = ref<'grid' | 'table'>('grid');

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'contact_person', label: 'Contact Person' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
];

onMounted(() => {
  clientsStore.fetchClients();
});

const updateSearchQuery = debounce((query: string) => {
  clientsStore.setFilters({ query });
}, 300);

function prevPage() {
  clientsStore.setPage(clientsStore.pagination.page - 1);
}

function nextPage() {
  clientsStore.setPage(clientsStore.pagination.page + 1);
}
</script>

<style scoped>
.client-grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4;
}
</style>
