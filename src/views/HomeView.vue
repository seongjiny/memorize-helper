<script setup lang="ts">
import { listScripts } from '@/data/database'

const scripts = listScripts()
</script>

<template>
  <section class="wrap">
    <h1>암송 목록</h1>

    <ul class="list">
      <li v-for="s in scripts" :key="s.id" class="card">
        <RouterLink :to="`/script/${s.id}`" class="link">
          <div class="title">{{ s.title }}</div>
          <div class="desc">{{ s.description }}</div>
          <div class="meta" v-if="s.meta?.length">
            <span v-for="(m, i) in s.meta" :key="i" class="tag">{{ m }}</span>
          </div>
        </RouterLink>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.wrap {
  padding: 12px 0;
}
.list {
  list-style: none;
  padding: 0;
  margin: 12px 0;
  display: grid;
  gap: 12px;
}
.card {
  border: 1px solid #eee;
  border-radius: 12px;
}
.link {
  display: block;
  padding: 14px;
  text-decoration: none;
  color: inherit;
}
.title {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 6px;
}
.desc {
  color: #666;
  margin-bottom: 10px;
}
.meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.tag {
  font-size: 12px;
  padding: 4px 8px;
  border: 1px solid #eee;
  border-radius: 999px;
  color: #444;
}
</style>
