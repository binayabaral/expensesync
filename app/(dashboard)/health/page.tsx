import { Suspense } from "react";

import HealthChart from "@/components/HealthChart";
import HealthDataGrid from "@/components/HealthDataGrid";

export default function HealthPage() {
  return (
    <div className='max-w-full'>
      <Suspense>
        <HealthDataGrid/>
        <HealthChart/>
      </Suspense>
    </div>
  );
}
