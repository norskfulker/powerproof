import { cn } from "@/lib/utils";

type SkeletonProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: "pulse" | "shimmer";
};

function Skeleton({ className, variant = "shimmer", ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-muted",
        variant === "pulse" && "animate-pulse",
        variant === "shimmer" &&
          "before:absolute before:inset-0 before:-translate-x-full before:animate-[skeleton-shimmer_1.35s_ease-in-out_infinite] before:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.42),transparent)]",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
