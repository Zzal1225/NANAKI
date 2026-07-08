/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface SyncEvent extends ExtendableEvent {
  tag: string
}

interface PeriodicSyncEvent extends ExtendableEvent {
  tag: string
}
