/** Lokalne kopie kontraktów @moduly/types — unikamy kompilacji workspace w `medusa build`. */

export type ReturnRequestType = "withdrawal" | "claim";

export type ClaimRemedy = "repair" | "price_reduction" | "withdrawal";

export type ReturnStatus =
  | "pending_approval"
  | "approved"
  | "shipped"
  | "received"
  | "refunded"
  | "rejected"
  | "canceled";

export type ReturnLineItem = {
  orderLineItemId: string;
  productTitle: string;
  quantity: number;
  unitPrice: number;
  thumbnail: string | null;
};

export type ReturnRequest = {
  id: string;
  requestType: ReturnRequestType;
  orderId: string;
  orderDisplayId: number;
  customerEmail: string;
  status: ReturnStatus;
  reason: string;
  claimRemedy: ClaimRemedy | null;
  claimReferenceId: string | null;
  items: ReturnLineItem[];
  totalToRefund: number;
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
  shippedAt: string | null;
  receivedAt: string | null;
  refundedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  adminNotes: string | null;
};

export type AdminReturnRow = {
  id: string;
  requestType: ReturnRequestType;
  orderDisplayId: number;
  customerEmail: string;
  status: ReturnStatus;
  totalToRefund: number;
  itemCount: number;
  createdAt: string;
};

export type CreateReturnInput = {
  requestType: ReturnRequestType;
  orderId: string;
  orderDisplayId: number;
  customerEmail: string;
  items: ReturnLineItem[];
  reason: string;
  totalToRefund: number;
  claimRemedy?: ClaimRemedy | null;
  claimReferenceId?: string | null;
};

export type UpdateReturnStatusExtra = {
  rejectionReason?: string;
  adminNotes?: string;
};

export type ListReturnsOptions = {
  limit?: number;
  offset?: number;
  status?: ReturnStatus;
};

export type FormSubmissionFieldValue = string | boolean;

export type FormSubmission = {
  id: string;
  formId: string;
  formSlug: string;
  fields: Record<string, FormSubmissionFieldValue>;
  ipHash?: string;
  userAgent?: string;
  createdAt: string;
};

export type CreateFormSubmissionInput = {
  formId: string;
  formSlug: string;
  fields: Record<string, FormSubmissionFieldValue>;
  ipHash?: string;
  userAgent?: string;
};

export type ListSubmissionsOptions = {
  limit?: number;
  offset?: number;
};
