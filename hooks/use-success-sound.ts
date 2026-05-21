'use client'

import { useCallback } from 'react'

export function useSuccessSound() {
  return useCallback(() => {
    try {
      const audio = new Audio('/sound/FAHHH (Meme Sound Effect).mp3')
      audio.volume = 0.6
      audio.play().catch(() => {/* autoplay policy — silently ignore */})
    } catch {
      // noop
    }
  }, [])
}
