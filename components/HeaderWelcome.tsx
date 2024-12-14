'use client';

import React from 'react';
import { useUser } from '@clerk/nextjs';

function HeaderWelcome() {
  const { isLoaded, user } = useUser();

  return (
    <div className='pt-32'>
      <h1 className='text-2xl lg:text-5xl text-white font-medium mb-3'>
        Welcome Back, {isLoaded ? `${user?.firstName} 👋` : ''}
      </h1>
      <p className='text-green-300'>This is your financial overview report</p>
    </div>
  );
}

export default HeaderWelcome;
