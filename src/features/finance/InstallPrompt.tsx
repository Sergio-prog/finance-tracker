import { MonitorDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  prompt: () => Promise<{ outcome: 'accepted' | 'dismissed' }>
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent
  }
}

export function InstallPrompt() {
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches)

    function handleBeforeInstall(event: BeforeInstallPromptEvent) {
      event.preventDefault()
      deferredPrompt.current = event
      setIsInstallable(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
    }
  }, [])

  async function handleInstall() {
    if (!deferredPrompt.current) return

    void deferredPrompt.current.prompt()
    deferredPrompt.current = null
    setIsInstallable(false)
  }

  if (isStandalone || !isInstallable) return null

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={handleInstall}
      aria-label="Install app"
    >
      <MonitorDown />
    </Button>
  )
}
