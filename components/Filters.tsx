import { Suspense } from 'react';

import FilterDate from '@/components/FilterDate';
import FilterAccount from '@/components/FilterAccount';

function Filters() {
  return (
    <div className='flex items-center gap-2'>
      <Suspense>
        <FilterAccount />
        <FilterDate />
      </Suspense>
    </div>
  );
}

export default Filters;
