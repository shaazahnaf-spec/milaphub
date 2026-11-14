import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MilapHub',
  description: "Hyderabad's own community platform",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
