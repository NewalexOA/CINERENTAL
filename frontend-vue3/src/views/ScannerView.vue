<template>
  <div class="scanner-view p-4">
    <h1>Scanner Interface</h1>

    <div class="session-manager my-4">
      <h2>Sessions</h2>
      <div class="flex items-center gap-2">
        <input
          v-model="newSessionName"
          @keyup.enter="createNewSession"
          placeholder="New session name"
          class="p-2 border rounded"
        />
        <BaseButton @click="createNewSession">Create Session</BaseButton>
      </div>
      <div class="session-list mt-2">
        <BaseButton
          v-for="session in scannerStore.sessions"
          :key="session.id"
          @click="scannerStore.activeSessionId = session.id"
          :variant="scannerStore.activeSessionId === session.id ? 'primary' : 'outline'"
          class="mr-2 mb-2"
        >
          {{ session.name }}
        </BaseButton>
      </div>
    </div>

    <div v-if="scannerStore.activeSession" class="active-session mt-4">
      <h2>Active Session: {{ scannerStore.activeSession.name }}</h2>
      <p>Scan equipment to add it to this session.</p>
      <div class="scanned-items-list border rounded p-4 bg-gray-50 min-h-[200px]">
        <div v-if="scannerStore.activeSession.items.length === 0" class="text-gray-500">
          No items scanned yet.
        </div>
        <div
          v-for="(item, index) in scannerStore.activeSession.items"
          :key="index"
          class="scanned-item flex justify-between items-center p-2 border-b"
        >
          <span>{{ item.equipment.name }} ({{ item.equipment.barcode }})</span>
          <span>Qty: {{ item.quantity }}</span>
        </div>
      </div>
    </div>
    <div v-else class="text-gray-600 mt-4">
      <p>No active session. Please create or select a session to begin scanning.</p>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useScannerStore } from '@/stores/scanner';
import { useScanner } from '@/composables/useScanner';
import { httpClient } from '@/services/api/http-client';
import type { EquipmentResponse } from '@/types/equipment';
import BaseButton from '@/components/common/BaseButton.vue';

const scannerStore = useScannerStore();
const newSessionName = ref('');

async function handleScan(barcode: string) {
  console.log(`Scanned barcode: ${barcode}`);
  const equipment = await equipmentStore.findEquipmentByBarcode(barcode);
  if (equipment) {
    scannerStore.addEquipmentToSession(equipment);
  } else {
    console.error(`Equipment with barcode ${barcode} not found.`);
    // TODO: Add user-facing error feedback
  }
}

// Initialize the scanner listener
useScanner({ onScan: handleScan });

function createNewSession() {
  if (newSessionName.value.trim()) {
    scannerStore.createSession(newSessionName.value.trim());
    newSessionName.value = '';
  }
}
</script>

<style scoped>
/* Using Tailwind utility classes via @apply for brevity */
.scanner-view {
  @apply max-w-4xl mx-auto;
}
.session-manager input {
  @apply w-64;
}
.session-list {
  @apply flex flex-wrap;
}
.active-session h2 {
  @apply text-2xl font-bold;
}
</style>
