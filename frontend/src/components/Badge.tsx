interface BadgeProps {
  variant?: "default" | "success" | "warning" | "danger" | "info";
  children: React.ReactNode;
}

const variantClass: Record<string, string> = {
  default: "badge--default",
  success: "badge--success",
  warning: "badge--warning",
  danger: "badge--danger",
  info: "badge--info",
};

export default function Badge({ variant = "default", children }: BadgeProps) {
  return <span className={`badge ${variantClass[variant]}`}>{children}</span>;
}

export function statusVariant(status: string): BadgeProps["variant"] {
  switch (status) {
    case "active":
      return "success";
    case "pending":
      return "warning";
    case "revoked":
    case "lapsed":
      return "danger";
    default:
      return "default";
  }
}
