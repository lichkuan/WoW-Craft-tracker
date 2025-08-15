"use client";

import Image from "next/image";

export default function SiteHeader() {
  return (
    <header className="relative z-30 border-b-2 border-red-700 bg-black/70">
      {/* bande image de fond */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-40"
        style={{
            backgroundImage: "url(/banner.png)",
            backgroundSize: "cover",
            backgroundPosition: "center",
        }}
      />
      {/* contenu compact (un poil plus grand que le logo) */}
      <div className="mx-auto max-w-6xl px-4 py-3">
        {/* Logo à droite, titre en dessous (aligné à droite) */}
        <div className="flex h-full w-full items-end justify-end">
          <div className="flex flex-col items-end gap-1">
            <Image
              src="/raid-tisane-dodo-logo-512.png"
              alt="Logo de la guilde"
              width={110}
              height={110}
              priority
              className="h-[88px] w-[88px] rounded-md ring-1 ring-black/20 shadow"
            />
            <h1 className="text-right text-[15px] sm:text-base font-semibold tracking-tight text-yellow-100 drop-shadow">
              Craft Tracker by Ostie
            </h1>
          </div>
        </div>
      </div>
    </header>
  );
}
