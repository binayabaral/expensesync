import { Suspense } from "react";

import HealthChart from "@/components/HealthChart";
import HealthDataGrid from "@/components/HealthDataGrid";

export default function HealthPage() {
  return (
    <div className='h-full overflow-y-auto'>
      <Suspense>
        <HealthDataGrid/>
        <HealthChart/>
      </Suspense>
    </div>
  );
}
