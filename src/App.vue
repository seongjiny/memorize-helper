<template>
  <main class="app">
    <header class="top">
      <RouterLink to="/" class="brand">Memorize Helper</RouterLink>
    </header>

    <RouterView />
  </main>
</template>

<style scoped>
.app {
  max-width: 900px;
  margin: 0 auto;
  padding: 16px;
}
.top {
  position: sticky;
  top: 0;
  background: white;
  padding: 12px 0;
  border-bottom: 1px solid #eee;
}
.brand {
  text-decoration: none;
  color: inherit;
  font-weight: 700;
}
</style>
