import type { ReactNode } from "react";

interface SettingsSectionProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}

export function SettingsSection({ title, description, action, children }: SettingsSectionProps) {
  return (
    <section className="space-y-section-header-gap">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-section-header text-foreground">{title}</h2>
          {description ? <p className="text-body text-muted-foreground">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      <div className="space-y-item-gap">{children}</div>
    </section>
  );
}

