import "server-only";

import { requireDataStore } from "@moduly/data-store";
import type {
	AdminReturnRow,
	ClaimRemedy,
	CreateReturnInput,
	ReturnRequest,
	ReturnRequestType,
	ReturnStatus,
	UpdateReturnStatusExtra,
} from "@moduly/types";

export async function createReturnRequest(
	data: CreateReturnInput,
): Promise<ReturnRequest> {
	const store = requireDataStore();
	return store.createReturn(data);
}

export async function getAllReturns(): Promise<AdminReturnRow[]> {
	const store = requireDataStore();
	return store.listReturns();
}

export async function getReturnById(id: string): Promise<ReturnRequest | undefined> {
	const store = requireDataStore();
	return store.getReturn(id);
}

export async function getReturnRequestsByCustomerEmail(
	email: string,
): Promise<ReturnRequest[]> {
	const store = requireDataStore();
	return store.getReturnsByCustomerEmail(email);
}

export async function getActiveClaimForOrder(
	customerEmail: string,
	orderId: string,
): Promise<ReturnRequest | undefined> {
	const store = requireDataStore();
	return store.getActiveClaimForOrder(customerEmail, orderId);
}

export async function getActiveWithdrawalForOrder(
	customerEmail: string,
	orderId: string,
): Promise<ReturnRequest | undefined> {
	const store = requireDataStore();
	return store.getActiveWithdrawalForOrder(customerEmail, orderId);
}

export async function updateReturnStatus(
	id: string,
	status: ReturnStatus,
	extra?: UpdateReturnStatusExtra,
): Promise<ReturnRequest> {
	const store = requireDataStore();
	return store.updateReturnStatus(id, status, extra);
}

export type {
	ReturnRequestType,
	ClaimRemedy,
	ReturnStatus,
	ReturnRequest,
	AdminReturnRow,
	CreateReturnInput,
};
