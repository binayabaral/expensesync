import { Loader2 } from 'lucide-react';
import { SignIn, ClerkLoaded, ClerkLoading } from '@clerk/nextjs';

export default function Page() {
  return (
    <div className='min-h-screen'>
      <div className='h-full flex-col items-center justify-center'>
        <div className='text-center space-y-4 pt-[10vh]'>
          <h1 className='font-bold text-3xl'>Welcome back!</h1>
          <p className='text-base text-muted-foreground'>Log in or create account to get back to your dashboard</p>
        </div>
        <div className='flex items-center justify-center mt-8'>
          <ClerkLoaded>
            <SignIn path='/sign-in' />
          </ClerkLoaded>
          <ClerkLoading>
            <Loader2 className='animate-spin text-muted-foreground' />
          </ClerkLoading>
        </div>
      </div>
    </div>
  );
}
