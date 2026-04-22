import { Suspense } from 'react';
import AiOrganization from '@/features/ai-advisor/components/AiOrganization';

export default function AiOrganizationPage() {
  return (
    <Suspense>
      <AiOrganization />
    </Suspense>
  );
}
