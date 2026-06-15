"use client";

import Image from "next/image";

/** Miniatura z bezpiecznym fallbackiem gdy obraz nie zdoła się załadować. */
export function ProductThumbnail({ url }: { url: string }) {
	return (
		<>
			<div className="absolute inset-0 bg-brand-50" aria-hidden />
			<Image src={url} alt="" fill loading="lazy" quality={75} sizes="44px" className="relative z-10 object-cover" />
		</>
	);
}
