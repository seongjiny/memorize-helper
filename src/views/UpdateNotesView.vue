<template>
  <section class="updateNotesView">
    <h1 class="practiceHeading">업데이트 노트</h1>
    <p v-if="isLoading" class="practicePanel" role="status">업데이트 노트를 불러오고 있습니다.</p>
    <section v-else-if="errorMessage" class="practicePanel" role="alert">
      <p>{{ errorMessage }}</p>
      <button class="practiceAction" type="button" @click="reload">다시 시도</button>
    </section>
    <p v-else-if="!notes.length" class="practicePanel">아직 공개된 업데이트 노트가 없습니다.</p>
    <div v-else class="releaseHistory">
      <UpdateNotesContent
        v-for="note in notes"
        :key="note.id"
        class="practicePanel"
        :note="note"
        :heading-level="2"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import UpdateNotesContent from '@/components/UpdateNotesContent.vue'
import { onMounted } from 'vue'
import { useUpdateNotes } from '@/composables/useUpdateNotes'

const { notes, isLoading, errorMessage, load, reload } = useUpdateNotes()
onMounted(() => {
  void load()
})
</script>

<style scoped>
.updateNotesView > h1 {
  margin-bottom: 16px;
}

.updateNotesView {
  padding: 22px 14px 40px;
}
</style>
