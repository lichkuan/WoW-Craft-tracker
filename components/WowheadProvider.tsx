"use client";
import { useEffect } from "react";
import Script from "next/script";

export default function WowheadProvider() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      // @ts-ignore
      window.whTooltips = {
        colorLinks: true,
        iconizeLinks: true,
        renameLinks: true,
        locale: "fr_fr",
      };
    }
  }, []);

  return (
    <Script id="wowhead-tooltips" src="https://wow.zamimg.com/widgets/power.js" strategy="afterInteractive" />
  );
}
