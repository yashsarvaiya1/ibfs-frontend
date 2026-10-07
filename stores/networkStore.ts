import { create } from 'zustand'
export const useNetworkStore = create<{ pending: number; start: () => void; finish: () => void }>(set => ({
  pending: 0,
  start: () => set(s => ({ pending: s.pending + 1 })),
  finish: () => set(s => ({ pending: Math.max(0, s.pending - 1) })),
}))
