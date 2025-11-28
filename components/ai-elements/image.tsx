import { cn } from "@/lib/utils";
import type { Experimental_GeneratedImage } from "ai";
import NextImage from "next/image";

export type ImageProps = Experimental_GeneratedImage & {
  className?: string;
  alt?: string;
  width?: number;
  height?: number;
};

export const Image = ({
  base64,
  mediaType,
  className,
  alt = "Generated image",
  width,
  height,
  ...props
}: ImageProps) => (
  <NextImage
    {...props}
    alt={alt}
    className={cn("h-auto max-w-full overflow-hidden rounded-md", className)}
    height={height ?? 1024}
    src={`data:${mediaType};base64,${base64}`}
    unoptimized
    width={width ?? 1024}
  />
);
