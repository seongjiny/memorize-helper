<template>
  <article class="updateContent">
    <div class="releaseBadge">UPDATE · v{{ note.appVersion }}</div>
    <component :is="headingLevel === 2 ? 'h2' : 'h1'" class="releaseTitle">{{
      note.title
    }}</component>
    <p class="releaseDate">{{ publishedDate }}</p>
    <p class="intro">{{ note.introduction }}</p>
    <section v-for="(item, index) in note.items" :key="index">
      <div class="icon" aria-hidden="true">{{ item.icon }}</div>
      <div>
        <component :is="headingLevel === 2 ? 'h3' : 'h2'" class="itemTitle">{{
          item.title
        }}</component>
        <p>{{ item.description }}</p>
      </div>
    </section>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { UpdateNote } from '@/types/updateNote'

const props = withDefaults(defineProps<{ note: UpdateNote; headingLevel?: 1 | 2 }>(), {
  headingLevel: 1,
})
const publishedDate = computed(() => new Date(props.note.publishedAt).toLocaleDateString('ko-KR'))
</script>

<style scoped>
.updateContent {
  color: var(--practice-text);
}

.releaseBadge {
  width: fit-content;
  margin-bottom: 10px;
  border-radius: 999px;
  background: #e9f7ef;
  padding: 5px 9px;
  color: #168553;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.05em;
}

.releaseTitle {
  font-size: calc(23px * var(--scale, 1));
  font-weight: 900;
  letter-spacing: -0.03em;
}

.releaseDate {
  margin-top: 6px;
  color: var(--practice-muted);
  font-size: 12px;
}

.intro {
  margin: 7px 0 22px;
  color: #6b7280;
  font-size: 14px;
  line-height: 1.55;
}

section {
  display: grid;
  grid-template-columns: 38px 1fr;
  gap: 12px;
  padding: 15px 0;
  border-top: 1px solid rgba(0, 0, 0, 0.07);
}

.icon {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: #f3f4f6;
  color: #374151;
  font-weight: 900;
}

.itemTitle {
  margin-bottom: 4px;
  font-size: 15px;
  font-weight: 900;
}

section p {
  color: #6b7280;
  font-size: 13px;
  line-height: 1.55;
}
</style>
