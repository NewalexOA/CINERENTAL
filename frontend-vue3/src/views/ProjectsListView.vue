<template>
  <div class="project-list-view p-4">
    <header class="flex justify-between items-center mb-4">
      <h1 class="text-2xl font-bold">Projects</h1>
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

    <div v-if="projectsStore.loading" class="loading">
      Loading projects...
    </div>

    <div v-else-if="projectsStore.error" class="error text-red-500">
      {{ projectsStore.error }}
    </div>

    <div v-else>
      <!-- Grid View -->
      <div v-if="viewMode === 'grid'" class="project-grid">
        <div v-for="item in projectsStore.projects" :key="item.id" class="p-4 border rounded shadow hover:shadow-lg transition-shadow">
          <h2 class="font-bold text-lg">{{ item.name }}</h2>
          <p class="text-gray-600">{{ item.client_name }}</p>
          <p class="text-sm mt-2">Status: <span class="font-semibold">{{ item.status }}</span></p>
          <router-link :to="{ name: 'project-detail', params: { id: item.id } }" class="text-blue-500 hover:underline mt-2 inline-block">View</router-link>
        </div>
      </div>

      <!-- Table View -->
      <DataTable
        v-else-if="viewMode === 'table'"
        :columns="columns"
        :data="projectsStore.projects"
      >
        <template #cell-actions="{ item }">
          <router-link :to="{ name: 'project-detail', params: { id: item.id } }" class="text-blue-500 hover:underline">View</router-link>
        </template>
      </DataTable>

      <div class="pagination mt-4 flex justify-center items-center">
        <BaseButton @click="prevPage" :disabled="projectsStore.pagination.page <= 1">Previous</BaseButton>
        <span class="mx-4">Page {{ projectsStore.pagination.page }} of {{ projectsStore.pagination.totalPages }}</span>
        <BaseButton @click="nextPage" :disabled="projectsStore.pagination.page >= projectsStore.pagination.totalPages">Next</BaseButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useProjectsStore } from '@/stores/projects';
import BaseButton from '@/components/common/BaseButton.vue';
import DataTable from '@/components/common/DataTable.vue';
import { debounce } from 'lodash-es';

const projectsStore = useProjectsStore();
const viewMode = ref<'grid' | 'table'>('grid');

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'client_name', label: 'Client' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: '' },
];

onMounted(() => {
  projectsStore.fetchProjects();
});

const updateSearchQuery = debounce((query: string) => {
  projectsStore.setFilters({ query });
}, 300);

function prevPage() {
  projectsStore.setPage(projectsStore.pagination.page - 1);
}

function nextPage() {
  projectsStore.setPage(projectsStore.pagination.page + 1);
}
</script>

<style scoped>
.project-grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4;
}
</style>
