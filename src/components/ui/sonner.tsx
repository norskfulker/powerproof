import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          success:
            "group-[.toaster]:bg-[hsl(var(--primary-50))] group-[.toaster]:text-[hsl(var(--primary))] group-[.toaster]:border-[hsl(var(--primary-200))]",
          error:
            "group-[.toaster]:bg-[hsl(var(--red-50))] group-[.toaster]:text-[hsl(var(--destructive))] group-[.toaster]:border-[hsl(var(--red-100))]",
          warning:
            "group-[.toaster]:bg-[hsl(var(--saffron-50))] group-[.toaster]:text-[hsl(var(--saffron-600))] group-[.toaster]:border-[hsl(var(--saffron-100))]",
          info:
            "group-[.toaster]:bg-[hsl(var(--badge-new-bg))] group-[.toaster]:text-[hsl(var(--badge-new-text))] group-[.toaster]:border-[hsl(var(--badge-new-bg))]",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
