import type { Metadata } from 'next';
import {
  Bricolage_Grotesque,
  Geist,
  IBM_Plex_Mono,
} from 'next/font/google';
import { Toaster } from 'sonner';

import { TooltipProvider } from '@/components/ui/tooltip';
import './globals.css';

const geist = Geist({
  variable: '--font-geist',
  subsets: ['latin'],
});

const bricolageGrotesque = Bricolage_Grotesque({
  variable: '--font-bricolage',
  subsets: ['latin'],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: '--font-ibm-plex-mono',
  weight: ['400', '500'],
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Prompt Tool',
  description: 'Structured build plan and system prompt authoring workspace',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang='en'
      className={`${geist.variable} ${bricolageGrotesque.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className='flex min-h-full flex-col'>
        <TooltipProvider>
          {children}
          <Toaster position='bottom-right' richColors />
        </TooltipProvider>
      </body>
    </html>
  );
}
