import { Suspense } from 'react';

import FilterDate from '@/components/FilterDate';
import FilterAccount from '@/components/FilterAccount';

function Filters() {
  return (
    <div className='flex flex-col lg:flex-row items-center gap-y-2 lg:gap-y-0 lg:gap-x-2 pb-3 md:pb-6'>
      <Suspense>
        <FilterAccount />
        <FilterDate />
      </Suspense>
    </div>
  );
}

export default Filters;
