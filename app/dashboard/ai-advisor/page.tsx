import { Suspense } from 'react';
import AiAdvisor from '@/features/ai-advisor/components/AiAdvisor';

export default function AiAdvisorPage() {
  return (
    <Suspense>
      <AiAdvisor />
    </Suspense>
  );
}
