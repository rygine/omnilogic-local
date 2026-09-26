<script setup lang="ts">
import { computed } from "vue";

import type { CommandFrontmatter } from "../commands/schema.js";
import { data as commands } from "../loaders/commands.data.js";

const props = defineProps<{
  status?: CommandFrontmatter["status"];
  area?: CommandFrontmatter["area"];
}>();

const rows = computed(() =>
  commands.filter(
    (c) =>
      (props.status === undefined || c.status === props.status) &&
      (props.area === undefined || c.area === props.area),
  ),
);
</script>

<template>
  <table v-if="rows.length > 0">
    <thead>
      <tr>
        <th>Command</th>
        <th>Opcode</th>
        <th>Area</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="c in rows" :key="c.name">
        <td>
          <a :href="c.url">{{ c.name }}</a>
        </td>
        <td>{{ c.opcode }}</td>
        <td>{{ c.area }}</td>
      </tr>
    </tbody>
  </table>
  <p v-else>None.</p>
</template>
