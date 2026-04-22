'use client';

import { useEffect, useState } from 'react';
import { FaDownload, FaXmark } from 'react-icons/fa6';

import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PwaInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.error('SW registration failed:', err);
      });
    }
  }, []);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true);

    if (isStandalone) return;

    const stored = sessionStorage.getItem('pwa-prompt-dismissed');
    if (stored) {
      setDismissed(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!installEvent || dismissed) return null;

  const handleInstall = async () => {
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === 'accepted' || outcome === 'dismissed') {
      setInstallEvent(null);
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem('pwa-prompt-dismissed', '1');
    setDismissed(true);
  };

  return (
    <div className='fixed bottom-4 left-4 right-4 z-50 flex items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-lg sm:left-auto sm:right-4 sm:w-80'>
      <div className='flex flex-1 flex-col gap-0.5'>
        <p className='text-sm font-semibold'>Install ExpenseSync</p>
        <p className='text-muted-foreground text-xs'>Add to home screen for quick access</p>
      </div>
      <Button size='sm' onClick={handleInstall} className='shrink-0 gap-1.5'>
        <FaDownload className='size-3' />
        Install
      </Button>
      <button
        onClick={handleDismiss}
        className='text-muted-foreground hover:text-foreground shrink-0'
        aria-label='Dismiss install prompt'
      >
        <FaXmark className='size-4' />
      </button>
    </div>
  );
}
