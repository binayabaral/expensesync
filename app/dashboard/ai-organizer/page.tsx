import { Suspense } from 'react';
import AiOrganizer from '@/features/ai-advisor/components/AiOrganizer';

export default function AiOrganizerPage() {
  return (
    <Suspense>
      <AiOrganizer />
    </Suspense>
  );
}
