"use client";

import Image from "next/image";
import { useState } from "react";

export default function ProductGallery({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = useState(0);
  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-[2rem] bg-coffret-soft">
        <Image src={images[active]} alt={alt} fill loading="eager" fetchPriority="high" sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
      </div>
      {images.length > 1 ? (
        <div className="mt-4 grid grid-cols-5 gap-3">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`${alt}, ${i + 1}/${images.length}`}
              aria-current={i === active ? "true" : undefined}
              className={`relative aspect-square overflow-hidden rounded-xl ring-2 ring-offset-2 ring-offset-paper transition ${i === active ? "ring-ink" : "ring-transparent hover:ring-ink/20"}`}
            >
              <Image src={src} alt="" fill sizes="120px" className="object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
