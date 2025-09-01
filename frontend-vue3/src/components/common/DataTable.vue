<template>
  <div class="overflow-x-auto">
    <table class="min-w-full bg-white">
      <thead class="bg-gray-800 text-white">
        <tr>
          <th
            v-for="column in columns"
            :key="column.key"
            class="text-left py-3 px-4 uppercase font-semibold text-sm"
          >
            {{ column.label }}
          </th>
        </tr>
      </thead>
      <tbody class="text-gray-700">
        <tr v-for="(item, index) in data" :key="index" class="border-b">
          <td v-for="column in columns" :key="column.key" class="py-3 px-4">
            <slot :name="`cell-${column.key}`" :item="item">
              {{ item[column.key] }}
            </slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';

interface Column {
  key: string;
  label: string;
}

defineProps({
  columns: {
    type: Array as PropType<Column[]>,
    required: true,
  },
  data: {
    type: Array as PropType<any[]>,
    required: true,
  },
});
</script>
