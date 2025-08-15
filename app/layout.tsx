import './globals.css'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'WoW Crafting Tracker',
  description: 'Mists of Pandaria Classic',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <head>
        {/* Favicon dérivé du logo */}
        <link rel="icon" href="/favicon.png" />
        <meta name="theme-color" content="#0b0b0b" />
      </head>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
