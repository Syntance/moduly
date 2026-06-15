import type {
  AdminReturnRow,
  ClaimRemedy,
  CreateReturnInput,
  ListReturnsOptions,
  ReturnLineItem,
  ReturnRequest,
  ReturnRequestType,
  ReturnStatus,
  UpdateReturnStatusExtra,
} from "../../types/moduly";
import { MedusaService } from "@medusajs/framework/utils";
import ReturnRequestModel from "./models/return-request";

export const RETURNS_MODULE = "returns";

const TERMINAL_STATUSES: ReturnStatus[] = [
  "refunded",
  "rejected",
  "canceled",
];

type ReturnRecord = {
  id: string;
  request_type: string;
  order_id: string;
  order_display_id: number;
  customer_email: string;
  status: string;
  reason: string;
  claim_remedy?: string | null;
  claim_reference_id?: string | null;
  items: ReturnLineItem[] | Record<string, unknown> | null;
  total_to_refund: number;
  approved_at?: string | Date | null;
  shipped_at?: string | Date | null;
  received_at?: string | Date | null;
  refunded_at?: string | Date | null;
  rejected_at?: string | Date | null;
  rejection_reason?: string | null;
  admin_notes?: string | null;
  created_at?: string | Date;
  updated_at?: string | Date;
};

function asReturnRecord(row: unknown): ReturnRecord {
  return row as ReturnRecord;
}

function asReturnRecords(rows: unknown): ReturnRecord[] {
  return rows as ReturnRecord[];
}

function toIso(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : value;
}

function parseItems(raw: ReturnRecord["items"]): ReturnLineItem[] {
  if (!Array.isArray(raw)) return [];
  return raw;
}

function mapRecord(row: ReturnRecord): ReturnRequest {
  return {
    id: row.id,
    requestType: row.request_type as ReturnRequestType,
    orderId: row.order_id,
    orderDisplayId: row.order_display_id,
    customerEmail: row.customer_email,
    status: row.status as ReturnStatus,
    reason: row.reason,
    claimRemedy: (row.claim_remedy as ClaimRemedy | null) ?? null,
    claimReferenceId: row.claim_reference_id ?? null,
    items: parseItems(row.items),
    totalToRefund: row.total_to_refund,
    createdAt: toIso(row.created_at) ?? new Date().toISOString(),
    updatedAt: toIso(row.updated_at) ?? new Date().toISOString(),
    approvedAt: toIso(row.approved_at),
    shippedAt: toIso(row.shipped_at),
    receivedAt: toIso(row.received_at),
    refundedAt: toIso(row.refunded_at),
    rejectedAt: toIso(row.rejected_at),
    rejectionReason: row.rejection_reason ?? null,
    adminNotes: row.admin_notes ?? null,
  };
}

function isActiveStatus(status: ReturnStatus): boolean {
  return (
    status === "pending_approval" ||
    status === "approved" ||
    status === "shipped" ||
    status === "received"
  );
}

export default class ReturnsModuleService extends MedusaService({
  ReturnRequest: ReturnRequestModel,
}) {
  async createReturn(input: CreateReturnInput): Promise<ReturnRequest> {
    const created = await this.createReturnRequests({
      request_type: input.requestType,
      order_id: input.orderId,
      order_display_id: input.orderDisplayId,
      customer_email: input.customerEmail.toLowerCase(),
      status: "pending_approval",
      reason: input.reason,
      claim_remedy: input.claimRemedy ?? null,
      claim_reference_id: input.claimReferenceId ?? null,
      items: input.items as unknown as Record<string, unknown>,
      total_to_refund: input.totalToRefund,
    });

    return mapRecord(asReturnRecord(created));
  }

  async listReturns(options: ListReturnsOptions = {}): Promise<AdminReturnRow[]> {
    const limit = options.limit ?? 50;
    const offset = options.offset ?? 0;
    const filters = options.status ? { status: options.status } : {};

    const rows = await this.listReturnRequests(filters, {
      take: limit,
      skip: offset,
      order: { created_at: "DESC" },
    });

    return asReturnRecords(rows).map((row) => {
      const items = parseItems(row.items);
      return {
        id: row.id,
        requestType: row.request_type as ReturnRequestType,
        orderDisplayId: row.order_display_id,
        customerEmail: row.customer_email,
        status: row.status as ReturnStatus,
        totalToRefund: row.total_to_refund,
        itemCount: items.length,
        createdAt: mapRecord(row).createdAt,
      };
    });
  }

  async getReturn(returnId: string): Promise<ReturnRequest | null> {
    const row = await this.retrieveReturnRequest(returnId).catch(() => null);
    if (!row) return null;
    return mapRecord(asReturnRecord(row));
  }

  async updateReturn(
    returnId: string,
    status: ReturnStatus,
    extra: UpdateReturnStatusExtra = {},
  ): Promise<ReturnRequest> {
    const now = new Date();
    const patch: Record<string, unknown> = {
      id: returnId,
      status,
    };

    if (extra.adminNotes !== undefined) {
      patch.admin_notes = extra.adminNotes;
    }
    if (extra.rejectionReason !== undefined) {
      patch.rejection_reason = extra.rejectionReason;
    }

    if (status === "approved") patch.approved_at = now;
    if (status === "shipped") patch.shipped_at = now;
    if (status === "received") patch.received_at = now;
    if (status === "refunded") patch.refunded_at = now;
    if (status === "rejected") patch.rejected_at = now;

    const updated = await this.updateReturnRequests(patch);
    return mapRecord(asReturnRecord(updated));
  }

  async getByCustomerEmail(email: string): Promise<ReturnRequest[]> {
    const rows = await this.listReturnRequests(
      { customer_email: email.toLowerCase() },
      { order: { created_at: "DESC" } },
    );
    return asReturnRecords(rows).map(mapRecord);
  }

  async getActiveClaimForOrder(orderId: string): Promise<ReturnRequest | null> {
    const rows = await this.listReturnRequests(
      { order_id: orderId, request_type: "claim" },
      { order: { created_at: "DESC" } },
    );

    const active = asReturnRecords(rows).find((row) =>
      isActiveStatus(row.status as ReturnStatus),
    );
    return active ? mapRecord(active) : null;
  }

  async getActiveWithdrawalForOrder(
    orderId: string,
  ): Promise<ReturnRequest | null> {
    const rows = await this.listReturnRequests(
      { order_id: orderId, request_type: "withdrawal" },
      { order: { created_at: "DESC" } },
    );

    const active = asReturnRecords(rows).find((row) =>
      isActiveStatus(row.status as ReturnStatus),
    );
    return active ? mapRecord(active) : null;
  }

  isTerminalStatus(status: ReturnStatus): boolean {
    return TERMINAL_STATUSES.includes(status);
  }
}
