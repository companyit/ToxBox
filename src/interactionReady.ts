import type { InjectionKey, Ref } from 'vue'
export const interactionReadyKey: InjectionKey<Ref<boolean>> = Symbol('interactionReady')
