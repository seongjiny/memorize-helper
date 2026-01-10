<!-- src\views\HomeView.vue -->
<template>
  <section class="mx-auto max-w-[520px] px-[14px] py-3" :style="{ '--scale': String(fontPx / 15) }">
    <ul class="mt-3 grid gap-3">
      <li
        v-for="s in scripts"
        :key="s.id"
        class="overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm"
      >
        <RouterLink
          :to="`/script/${s.id}`"
          class="block p-4 text-inherit no-underline active:scale-[0.995]"
        >
          <div class="cardTitle">{{ s.title }}</div>

          <div v-if="s.description" class="cardDesc">
            {{ s.description }}
          </div>

          <div v-if="s.meta?.length" class="flex flex-wrap gap-2">
            <span v-for="(m, i) in s.meta" :key="i" class="tag">
              {{ m }}
            </span>
          </div>
        </RouterLink>
      </li>
    </ul>
  </section>
</template>
<script setup lang="ts">
import { listScripts } from '@/data/database'
import { useFontScale } from '@/composables/useFontScale'
const { fontPx } = useFontScale()

const scripts = listScripts()
</script>

<style scoped>
.cardTitle {
  margin-bottom: 4px;
  font-weight: 700;
  font-size: calc(17px * var(--scale, 1));
}

.cardDesc {
  margin-bottom: 8px;
  color: rgba(0, 0, 0, 0.6);
  line-height: 1.3;
  font-size: calc(13px * var(--scale, 1));
}

.tag {
  border-radius: 999px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  background: rgba(0, 0, 0, 0.02);
  padding: 4px 10px;
  color: rgba(0, 0, 0, 0.7);
  font-size: calc(12px * var(--scale, 1));
}
</style>
