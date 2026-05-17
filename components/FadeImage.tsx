"use client";

import { useEffect, useRef, useState } from "react";
import Image, { type ImageProps } from "next/image";

/**
 * Wraps next/image with a 200ms opacity fade once the underlying <img>
 * fires `onLoad` (or is already complete from cache on mount). The card
 * background (typically `bg-bg2` with a cuisine gradient) shows through
 * while opacity is 0, so there's no flash of white.
 *
 * - Error handler also sets `loaded=true` so a broken image isn't stuck
 *   invisible.
 * - Forwarded `priority` is honored; the fade is purely cosmetic and runs
 *   after decode regardless.
 * - Caller-provided `onLoad` / `onError` still fire.
 */
type Props = Omit<ImageProps, "ref"> & {
  /**
   * Extra classes appended after the fade classes. Use this for things like
   * `object-cover`, hover transforms, etc.
   */
  className?: string;
};

// Inline CSS so a caller's Tailwind `transition-*` utility doesn't clobber the
// opacity transition (Tailwind's `transition-transform` would otherwise win
// since they all set the same `transition-property` declaration). Listing both
// opacity and transform keeps `group-hover:scale-*` smooth as well.
const FADE_STYLE: React.CSSProperties = {
  transition: "opacity 200ms ease, transform 300ms ease",
};

export default function FadeImage({
  className = "",
  onLoad,
  onError,
  style,
  ...rest
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Handle the already-cached case: if the browser already has the image
  // decoded, `onLoad` may fire before React attaches the handler. Check
  // `.complete` on mount and flip the state synchronously.
  useEffect(() => {
    if (imgRef.current?.complete) setLoaded(true);
  }, []);

  return (
    <Image
      {...rest}
      ref={imgRef}
      onLoad={(e) => {
        setLoaded(true);
        onLoad?.(e);
      }}
      onError={(e) => {
        // Don't leave broken images at opacity-0.
        setLoaded(true);
        onError?.(e);
      }}
      style={{ ...FADE_STYLE, ...style }}
      className={`${loaded ? "opacity-100" : "opacity-0"} ${className}`}
    />
  );
}
