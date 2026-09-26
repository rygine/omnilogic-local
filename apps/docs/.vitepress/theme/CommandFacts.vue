<script setup lang="ts">
import { useData } from "vitepress";
import { computed } from "vue";

import { data as commands } from "../loaders/commands.data.js";
import Pill from "./Pill.vue";
import StatusPill from "./StatusPill.vue";

const { frontmatter, page } = useData();

// the page's row: its frontmatter plus what the spec says
const facts = computed(() => {
  const name = page.value.relativePath
    .replace(/^commands\//, "")
    .replace(/\.md$/, "");
  return commands.find((c) => c.name === name);
});

// the note, with every command it names linked to its page and `code` shown as code
const noteParts = computed(() => {
  const note = facts.value?.note;
  if (!note) {
    return [];
  }
  const names = new Set(commands.map((c) => c.name));
  const pattern = new RegExp(
    `(\`[^\`]+\`|\\b(?:${[...names].join("|")})\\b)`,
    "g",
  );
  return note
    .split(pattern)
    .filter((text) => text !== "")
    .map((text) =>
      text.startsWith("`")
        ? { kind: "code", text: text.slice(1, -1) }
        : { kind: names.has(text) ? "link" : "text", text },
    );
});
</script>

<template>
  <section class="facts">
    <div class="pills">
      <StatusPill :status="String(frontmatter.status)" />
      <Pill label="Opcode" :value="frontmatter.opcode" />
      <Pill v-if="facts?.type" label="Type" :value="facts.type" />
    </div>
    <div v-if="noteParts.length > 0" class="custom-block tip">
      <p class="custom-block-title">NOTE</p>
      <p>
        <template v-for="(part, i) in noteParts" :key="i">
          <a v-if="part.kind === 'link'" :href="`/commands/${part.text}`">{{
            part.text
          }}</a>
          <code v-else-if="part.kind === 'code'">{{ part.text }}</code>
          <template v-else>{{ part.text }}</template>
        </template>
      </p>
    </div>
  </section>
</template>

<style scoped>
.facts {
  margin: 0.75rem 0 1.5rem;
}

.pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.custom-block {
  margin-top: 0.75rem;
}
</style>
