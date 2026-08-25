export const WEBHOOK_EVENTS = [
  "charge.created",
  "charge.pending",
  "charge.processing",
  "charge.paid",
  "charge.failed",
  "charge.refunded",
  "charge.canceled",
  "charge.expired",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];
