<script setup lang="ts">
// the value comes from the prop, or from the slot for anything richer
defineProps<{ label: string; value?: string | number }>();
</script>

<template>
  <span class="pill">
    <span class="label">{{ label }}</span>
    <span class="value"
      ><slot>{{ value }}</slot></span
    >
  </span>
</template>

<style scoped>
.pill {
  display: inline-flex;
  align-items: stretch;
  overflow: hidden;
  vertical-align: middle;
  border: 1px solid var(--vp-c-divider);
  border-radius: 999px;
}

.label,
.value {
  display: inline-flex;
  align-items: center;
  padding: 0.4rem 0.8rem;
  line-height: 1;
}

/* extra padding beside the round ends */
.label {
  padding-left: 1rem;
}

.value {
  padding-right: 1rem;
}

.label {
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg-soft);
  border-right: 1px solid var(--vp-c-divider);
}

.value {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg);
}
</style>
