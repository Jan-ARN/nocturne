import { useEffect, useRef, useState } from 'react'
import { isUnlocked, setUnlocked } from './storage'

const CODE = 'motherload'

/**
 * The easter-egg gate. Listens for the word "motherload" typed anywhere outside a
 * text field; on a match it persists the unlock and flips `unlocked`. `celebrate`
 * pulses true once per fresh unlock so the UI can show a brief toast.
 */
export function useMotherload() {
  const [unlocked, setUnlockedState] = useState(() => isUnlocked())
  const [celebrate, setCelebrate] = useState(false)
  const buffer = useRef('')

  useEffect(() => {
    if (unlocked) return
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return
      if (e.key.length !== 1 || !/[a-z]/i.test(e.key)) return

      buffer.current = (buffer.current + e.key.toLowerCase()).slice(-CODE.length)
      if (buffer.current === CODE) {
        setUnlocked(true)
        setUnlockedState(true)
        setCelebrate(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [unlocked])

  // Auto-dismiss the celebration toast.
  useEffect(() => {
    if (!celebrate) return
    const id = window.setTimeout(() => setCelebrate(false), 4000)
    return () => window.clearTimeout(id)
  }, [celebrate])

  return { unlocked, celebrate }
}
