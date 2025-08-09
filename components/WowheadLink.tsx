import React from "react";

export function WowheadLink({
  type,
  id,
  slug,
  children,
  className,
}: {
  type: "item" | "spell";
  id: number | string;
  slug?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const base = "https://www.wowhead.com/mop-classic/fr";
  const s = slug ? `/${slug}` : "";
  const href = `${base}/${type}=${id}${s}`;
  return (
    <a href={href} target="_blank" rel="noreferrer" className={className}>
      {children}
    </a>
  );
}
