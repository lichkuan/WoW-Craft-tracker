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
      <body>
        <div
          className="min-h-screen flex items-center justify-center bg-black"
          style={{
            backgroundImage: "url('/e557b46e7d5f64872f6e5ca0b9744d6c.gif')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          <span className="text-white text-4xl md:text-6xl font-extrabold text-center bg-black/70 px-8 py-6 rounded-xl shadow-lg">
            🚧 SITE EN MAINTENANCE 🚧
          </span>
        </div>
      </body>
    </html>
  );
}