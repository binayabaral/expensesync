import type { Metadata } from 'next';
import { Loader2 } from 'lucide-react';
import { SignUp, ClerkLoaded, ClerkLoading } from '@clerk/nextjs';
import { shadcn } from '@clerk/themes';

export const metadata: Metadata = {
  title: 'Create Account',
  description: 'Create your free XpenseSync account and start tracking expenses, splitting bills, and managing your finances.',
  robots: { index: false, follow: false }
};

export default function Page() {
  return (
    <>
      <ClerkLoaded>
        <SignUp
          path='/sign-up'
          appearance={{
            baseTheme: shadcn,
            elements: {
              rootBox: 'w-full',
              card: 'w-full shadow-none border-0 bg-transparent',
              socialButtonsBlockButton: 'border-border/60 bg-background hover:bg-muted transition-colors',
              formFieldInput: 'bg-background border-border/60',
              footerActionLink: 'text-primary hover:text-primary/80'
            }
          }}
        />
      </ClerkLoaded>
      <ClerkLoading>
        <div className='flex items-center justify-center py-16'>
          <Loader2 className='animate-spin text-muted-foreground h-5 w-5' />
        </div>
      </ClerkLoading>
    </>
  );
}
