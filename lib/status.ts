export type PRStatus = "Draft" | "Generated" | "Printed" | "Signed" | "Cancelled" | "Reissued";

export type StatusTone = "neutral" | "info" | "warning" | "success" | "danger" | "purple";

export const statusConfig: Record<PRStatus, { label: string; tone: StatusTone }> = {
  Draft: { label: "Draft", tone: "neutral" },
  Generated: { label: "Generated", tone: "info" },
  Printed: { label: "Printed", tone: "warning" },
  Signed: { label: "Signed", tone: "success" },
  Cancelled: { label: "Cancelled", tone: "danger" },
  Reissued: { label: "Reissued", tone: "purple" },
};

export function getStatusConfig(status: PRStatus) {
  return statusConfig[status];
}
