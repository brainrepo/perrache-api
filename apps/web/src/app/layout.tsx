import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Perrache - API Catalog',
  description: 'Automated API catalog with semantic search and breaking change detection'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
