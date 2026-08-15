import type { ReactNode } from "react";

interface SettingsPageShellProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function SettingsPageShell({ title, description, children }: SettingsPageShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-8 py-12">
        <header className="mb-section-gap">
          <h1 className="text-page-title text-foreground">{title}</h1>
          {description ? <p className="mt-2 text-body text-muted-foreground">{description}</p> : null}
        </header>

        <div className="space-y-section-gap">{children}</div>
      </div>
    </div>
  );
}

