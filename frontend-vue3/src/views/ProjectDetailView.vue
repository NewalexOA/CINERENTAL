<template>
  <div class="project-detail-view">
    <div v-if="projectStore.loading">Loading project...</div>
    <div v-else-if="projectStore.error">{{ projectStore.error }}</div>
    <div v-else-if="projectStore.currentProject">
      <div class="flex justify-between items-center">
        <h1>{{ projectStore.currentProject.name }}</h1>
        <BaseButton @click="generateDocument">Print Document</BaseButton>
      </div>
      <p><strong>Client:</strong> {{ projectStore.currentProject.client_name }}</p>
      <p><strong>Status:</strong> {{ projectStore.currentProject.status }}</p>

      <div class="mt-8">
        <h2>Equipment & Bookings</h2>
        <UniversalCart mode="embedded" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useProjectStore } from '@/stores/project';
import { useCartStore } from '@/stores/cart';
import UniversalCart from '@/components/cart/UniversalCart.vue';
import BaseButton from '@/components/common/BaseButton.vue';
import { httpClient } from '@/services/api/http-client';

const route = useRoute();
const projectStore = useProjectStore();
const cartStore = useCartStore();

const projectId = Number(route.params.id);

async function generateDocument() {
  if (!projectId) return;
  try {
    // The backend should return a response with the PDF file
    const response = await httpClient.get(`/projects/${projectId}/document`, {
      responseType: 'blob', // Important to handle binary file data
    });
    const blob = new Blob([response], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    window.open(url, '_blank');
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to generate document:', error);
    // TODO: Show a user-friendly error notification
  }
}

onMounted(() => {
  projectStore.fetchProject(projectId);
  cartStore.loadCartForProject(projectId);
});

watch(() => projectStore.currentProject, (newProject) => {
  if (newProject) {
    cartStore.setItemsFromBookings(newProject.bookings);
  }
});

</script>

<style scoped>
.project-detail-view {
  @apply p-4;
}
</style>
