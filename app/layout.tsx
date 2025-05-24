import './globals.css'
import { PostHogProvider, ThemeProvider } from './providers'
import { Toaster } from '@/components/ui/toaster'
import { Analytics } from '@vercel/analytics/next'
import type { Metadata } from 'next'
import { JetBrains_Mono } from 'next/font/google'

const mono = JetBrains_Mono({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'FRMWRK',
  description: 'AI-powered code generation',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <PostHogProvider>
        <body className={mono.className}>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-black to-zinc-900">
              {children}
            </div>
          </ThemeProvider>
          <Toaster />
          <Analytics />
        </body>
      </PostHogProvider>
    </html>
  )
}