import { Suspense } from "react";

import HealthChart from "@/components/HealthChart";
import HealthDataGrid from "@/components/HealthDataGrid";

export default function HealthPage() {
  return (
    <div className='container mx-auto px-2 pb-5'>
      <Suspense>
        <HealthDataGrid/>
        <HealthChart/>
      </Suspense>
    </div>
  );
}
