import type { Metadata } from "next";
import "./globals.css";
import SiteHeader from "../components/SiteHeader"; // chemin relatif

export const metadata: Metadata = {
  title: "Wow Craft TRacker by Ostie",
  description: "Partagez et explorez les métiers de WoW MoP Classic.",
  icons: {
    icon: [{ url: "/favicon-64.png", sizes: "64x64", type: "image/png" }],
    shortcut: ["/favicon-64.png"],
    apple: [{ url: "/raid-tisane-dodo-logo-512.png", sizes: "512x512", type: "image/png" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      {/* Le padding-top du body est ajusté dynamiquement via --header-h */}
      <body>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
