import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import WowheadProvider from '../components/WowheadProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'WoW Crafting Tracker',
  description: 'Mists of Pandaria Classic',
}

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem" }}>
          🚧 Site en maintenance vu que personne ne l'utilise 🚧
        </div>
      </body>
    </html>
  );
}