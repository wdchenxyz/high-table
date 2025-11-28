"use client";

import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import {
  type CSSProperties,
  type ElementType,
  type JSX,
  memo,
  useEffect,
  useMemo,
  useState,
} from "react";

export type TextShimmerProps = {
  children: string;
  as?: ElementType;
  className?: string;
  duration?: number;
  spread?: number;
};

const ShimmerComponent = ({
  children,
  as: Component = "p",
  className,
  duration = 2,
  spread = 2,
}: TextShimmerProps) => {
  const [AnimatedComponent, setAnimatedComponent] = useState<JSX.ElementType | null>(null);

  useEffect(() => {
    let isMounted = true;
    const created = motion.create(Component as keyof JSX.IntrinsicElements);

    const rafId = window.requestAnimationFrame(() => {
      if (isMounted) {
        setAnimatedComponent(() => created);
      }
    });

    return () => {
      isMounted = false;
      window.cancelAnimationFrame(rafId);
    };
  }, [Component]);

  const dynamicSpread = useMemo(
    () => (children?.length ?? 0) * spread,
    [children, spread]
  );

  const shimmerClassName = cn(
    "relative inline-block bg-[length:250%_100%,auto] bg-clip-text text-transparent",
    "[--bg:linear-gradient(90deg,#0000_calc(50%-var(--spread)),var(--color-background),#0000_calc(50%+var(--spread)))] [background-repeat:no-repeat,padding-box]",
    className
  );

  const shimmerStyle = {
    "--spread": `${dynamicSpread}px`,
    backgroundImage:
      "var(--bg), linear-gradient(var(--color-muted-foreground), var(--color-muted-foreground))",
  } as CSSProperties;

  if (!AnimatedComponent) {
    return (
      <Component className={shimmerClassName} style={shimmerStyle}>
        {children}
      </Component>
    );
  }

  return (
    <AnimatedComponent
      animate={{ backgroundPosition: "0% center" }}
      className={shimmerClassName}
      initial={{ backgroundPosition: "100% center" }}
      style={shimmerStyle}
      transition={{
        repeat: Number.POSITIVE_INFINITY,
        duration,
        ease: "linear",
      }}
    >
      {children}
    </AnimatedComponent>
  );
};

export const Shimmer = memo(ShimmerComponent);
