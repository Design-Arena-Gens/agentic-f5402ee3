import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Product Pic Designer',
  description: 'Create standout product photos in your browser',
  metadataBase: new URL('https://agentic-f5402ee3.vercel.app')
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </div>
      </body>
    </html>
  )
}
