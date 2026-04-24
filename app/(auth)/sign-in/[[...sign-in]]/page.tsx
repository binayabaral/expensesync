import type { Metadata } from 'next';
import { Loader2 } from 'lucide-react';
import { SignIn, ClerkLoaded, ClerkLoading } from '@clerk/nextjs';
import { shadcn } from '@clerk/themes';

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to your XpenseSync account to track expenses, split bills, and manage your finances.',
  robots: { index: false, follow: false }
};

export default function Page() {
  return (
    <>
      <ClerkLoaded>
        <SignIn
          path='/sign-in'
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
