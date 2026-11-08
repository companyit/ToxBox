<template>
  <svg class="brand-symbol" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><path d="M16 8h-3a5 5 0 0 0-5 5v38a5 5 0 0 0 5 5h3m32-48h3a5 5 0 0 1 5 5v38a5 5 0 0 1-5 5h-3" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"/><rect x="21" y="18" width="9" height="12" rx="2" fill="currentColor"/><rect x="34" y="18" width="9" height="12" rx="2" fill="var(--brand-tile-accent)"/><rect x="21" y="34" width="9" height="12" rx="2" fill="currentColor"/><rect x="34" y="34" width="9" height="12" rx="2" fill="currentColor"/></svg>
</template>
<style scoped>
.brand-symbol { display: block; width: 100%; height: 100%; color: var(--color-accent); --brand-tile-accent: #4c9c7b; }
@media (prefers-color-scheme: dark) { .brand-symbol { --brand-tile-accent: #c1f0dc; } }
</style>
