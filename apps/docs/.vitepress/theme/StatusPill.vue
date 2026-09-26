<script setup lang="ts">
import Pill from "./Pill.vue";

const STATUS: Record<string, { tone: string; text: string }> = {
  verified: { tone: "ok", text: "Verified" },
  unverified: { tone: "warn", text: "Unverified" },
  unusable: { tone: "bad", text: "Unusable" },
};

const props = defineProps<{ status: string }>();
const status = STATUS[props.status];
</script>

<template>
  <Pill v-if="status" label="Status">
    <span class="dot" :data-tone="status.tone" />
    {{ status.text }}
  </Pill>
</template>

<style scoped>
.dot {
  display: inline-block;
  width: 0.55rem;
  height: 0.55rem;
  margin-right: 0.4rem;
  border-radius: 50%;
}

[data-tone="ok"] {
  background: var(--vp-c-green-1);
}

[data-tone="warn"] {
  background: var(--vp-c-yellow-1);
}

[data-tone="bad"] {
  background: var(--vp-c-red-1);
}
</style>
