import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import WowheadProvider from '../components/WowheadProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'WoW Crafting Tracker',
  description: 'Mists of Pandaria Classic',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        <WowheadProvider />
        {children}
      </body>
    </html>
  )
}
