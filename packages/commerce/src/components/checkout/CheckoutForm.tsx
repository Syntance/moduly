"use client";

import type { ComponentType, ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Address } from "@moduly/types";
import { useAnalytics } from "@moduly/analytics";
import { PaymentSelector } from "./PaymentSelector";
import { TurnstileWidget } from "./TurnstileWidget";
import { isP24CircuitOpen, recordP24Failure } from "../../checkout/p24-circuit-breaker";
import { sanitizeOrderNotes } from "../../checkout/sanitize-order-notes";
import { isTurnstileEnabled, verifyTurnstileToken } from "../../checkout/turnstile";
import { resolveMedusaFetchBase } from "../../medusa/resolve-fetch-base";
import { CART_ID_STORAGE_KEY } from "../../medusa/cart-bootstrap";
import { getPolishRegionId } from "../../medusa/region";
import {
	assertCartReadyForCheckout,
	attachOrderNotes,
	clearCheckoutCompleted,
	completeCart,
	defaultCheckoutPaths,
	describeMedusaError,
	initPaymentSession,
	isCartAlreadyCompletedError,
	markCheckoutCompleted,
	markP24PaymentStarted,
	notifyBankTransferPending,
	notifyOrderPlacedAwait,
	prefetchPaymentReadiness,
	prefetchShippingOptions,
	prepareCheckout,
	PRZELEWY24_PROVIDER_ID,
	readCheckoutCompleted,
	redirectToOrderConfirmation,
	saveContactDetails,
	SYSTEM_PAYMENT_PROVIDER_ID,
	type CheckoutPaths,
} from "../../medusa/checkout";

const POSTAL_CODE_REGEX = /^\d{2}-\d{3}$/;
const NIP_REGEX = /^\d{10}$/;

function formatPolishPhone(input: string): string {
	const digits = input.replace(/\D/g, "");
	if (digits.length === 0) {
		return input.includes("+") ? "+48" : "";
	}
	const national = digits.startsWith("48") ? digits.slice(2, 11) : digits.slice(0, 9);
	if (national.length === 0) return "+48";
	let formatted = "+48";
	if (national.length > 0) formatted += ` ${national.slice(0, 3)}`;
	if (national.length > 3) formatted += ` ${national.slice(3, 6)}`;
	if (national.length > 6) formatted += ` ${national.slice(6, 9)}`;
	return formatted;
}

function validatePhone(phone: string): boolean {
	const digits = phone.replace(/\D/g, "");
	const national = digits.startsWith("48") ? digits.slice(2) : digits;
	return national.length === 9 && /^\d{9}$/.test(national);
}

function validatePostalCode(code: string): boolean {
	return POSTAL_CODE_REGEX.test(code);
}

function validateNip(nip: string): boolean {
	const cleaned = nip.replace(/[\s-]/g, "");
	if (!NIP_REGEX.test(cleaned)) return false;
	const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
	const sum = cleaned
		.slice(0, 9)
		.split("")
		.reduce((acc, digit, i) => acc + parseInt(digit, 10) * (weights[i] || 0), 0);
	const checksum = sum % 11;
	return checksum === parseInt(cleaned[9] || "0", 10);
}

type ValidatedField =
	| "email"
	| "phone"
	| "postalCode"
	| "firstName"
	| "lastName"
	| "address"
	| "city";

function getFieldValidationError(field: ValidatedField, value: string): string | null {
	switch (field) {
		case "email":
			if (!value.trim()) return "Email jest wymagany";
			if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
				return "Podaj poprawny adres email";
			}
			return null;
		case "phone":
			if (!value.trim()) return "Telefon jest wymagany";
			if (!validatePhone(value)) return "Podaj numer w formacie +48 XXX XXX XXX";
			return null;
		case "postalCode":
			if (!value.trim()) return "Kod pocztowy jest wymagany";
			if (!validatePostalCode(value)) return "Kod pocztowy: format XX-XXX";
			return null;
		case "firstName":
			return value.trim() === "" ? "Imię jest wymagane" : null;
		case "lastName":
			return value.trim() === "" ? "Nazwisko jest wymagane" : null;
		case "address":
			return value.trim() === "" ? "Adres jest wymagany" : null;
		case "city":
			return value.trim() === "" ? "Miasto jest wymagane" : null;
		default:
			return null;
	}
}

type CheckoutStep = 1 | 2 | 3;

const CHECKOUT_DRAFT_STORAGE_KEY = "moduly_checkout_draft_v1";

type CheckoutFormData = {
	email: string;
	firstName: string;
	lastName: string;
	phone: string;
	address: string;
	city: string;
	postalCode: string;
	shippingOptionId: string;
	paymentProviderId: string;
	newsletter: boolean;
	wantInvoice: boolean;
	companyName: string;
	nip: string;
	acceptTerms: boolean;
	acceptRodo: boolean;
	orderNotes: string;
};

type CheckoutDraftPayload = {
	v: 1;
	cartId: string;
	step: CheckoutStep;
	formData: CheckoutFormData;
};

function getDefaultCheckoutFormData(): CheckoutFormData {
	return {
		email: "",
		firstName: "",
		lastName: "",
		phone: "",
		address: "",
		city: "",
		postalCode: "",
		shippingOptionId: "",
		paymentProviderId: "",
		newsletter: false,
		wantInvoice: false,
		companyName: "",
		nip: "",
		acceptTerms: false,
		acceptRodo: false,
		orderNotes: "",
	};
}

function clearCheckoutDraft(): void {
	try {
		sessionStorage.removeItem(CHECKOUT_DRAFT_STORAGE_KEY);
	} catch {
		/* prywatny tryb */
	}
}

const STEPS = [
	{ number: 1, label: "Dane" },
	{ number: 2, label: "Dostawa" },
	{ number: 3, label: "Płatność" },
] as const;

const INPUT_CLASS =
	"w-full rounded-md border border-brand-200 px-4 py-2.5 text-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors";
const LABEL_CLASS = "block text-sm font-medium text-brand-700 mb-1";

export type CheckoutCartItem = {
	variant_id: string;
	title: string;
	unit_price: number;
	quantity: number;
	thumbnail?: string | null;
};

export interface CheckoutFormProps {
	cartId: string | null;
	items: CheckoutCartItem[];
	total: number;
	isInitialized: boolean;
	refreshCart: () => Promise<void>;
	getRegionId?: () => Promise<string>;
	paths?: CheckoutPaths;
	supportEmail?: string;
	currency?: string;
	components: {
		ShippingSelector: ComponentType<{
			selectedOptionId: string;
			onSelect: (id: string) => void;
		}>;
		OrderSummary: ComponentType<{ selectedShippingOptionId: string }>;
		CheckoutTrustBadges?: ComponentType;
	};
	legalLinks?: {
		termsHref?: string;
		privacyHref?: string;
	};
}

function resetStaleCartAndReload(paths: CheckoutPaths) {
	clearCheckoutDraft();
	try {
		localStorage.removeItem(CART_ID_STORAGE_KEY);
		localStorage.removeItem("moduly_express");
	} catch {
		/* prywatny tryb */
	}
	if (typeof window !== "undefined") {
		window.location.assign(paths.cart);
	}
}

export function CheckoutForm({
	cartId,
	items,
	total,
	isInitialized,
	refreshCart,
	getRegionId = getPolishRegionId,
	paths = defaultCheckoutPaths,
	supportEmail = "kontakt@example.com",
	currency = "PLN",
	components,
	legalLinks = { termsHref: "/regulamin", privacyHref: "/polityka-prywatnosci" },
}: CheckoutFormProps) {
	const { ShippingSelector, OrderSummary, CheckoutTrustBadges } = components;
	const analytics = useAnalytics();

	const [step, setStep] = useState<CheckoutStep>(1);
	const [formStarted, setFormStarted] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const submittingRef = useRef(false);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [submitSlow, setSubmitSlow] = useState(false);
	const submitSlowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const turnstileEnabled = isTurnstileEnabled();
	const [turnstileToken, setTurnstileToken] = useState("");
	const turnstileTokenRef = useRef("");
	turnstileTokenRef.current = turnstileToken;
	const staleResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const beginCheckoutFiredRef = useRef(false);
	const checkoutStartTimeRef = useRef<number | null>(null);

	useEffect(() => {
		if (typeof window === "undefined") return;
		if (!isInitialized) return;
		if (cartId && items.length > 0) {
			clearCheckoutCompleted();
			return;
		}
		const completed = readCheckoutCompleted();
		if (completed) {
			redirectToOrderConfirmation(completed.orderId, completed.displayId, undefined, paths);
		}
	}, [cartId, items.length, isInitialized, paths]);

	useEffect(() => {
		if (!isInitialized) return;
		if (!cartId || items.length > 0) return;
		if (typeof window === "undefined") return;
		if (readCheckoutCompleted()) return;
		window.location.replace(paths.cart);
	}, [cartId, items.length, isInitialized, paths.cart]);

	useEffect(() => {
		return () => {
			if (staleResetTimerRef.current) {
				clearTimeout(staleResetTimerRef.current);
				staleResetTimerRef.current = null;
			}
		};
	}, []);

	useEffect(() => {
		if (!cartId) return;
		void prefetchShippingOptions(cartId).catch(() => undefined);
		void prefetchPaymentReadiness(getRegionId, supportEmail)
			.then((r) => { setAvailableProviderIds(r.providerIds); })
			.catch(() => undefined);
	}, [cartId, getRegionId, supportEmail]);

	useEffect(() => {
		if (beginCheckoutFiredRef.current) return;
		if (!cartId || items.length === 0) return;
		beginCheckoutFiredRef.current = true;
		checkoutStartTimeRef.current = Date.now();
		analytics.beginCheckout({
			currency,
			value: total,
			items: analytics.toAnalyticsItems(items),
		});
	}, [cartId, items, total, analytics, currency]);

	const purchaseSentRef = useRef(false);
	const lastStepRef = useRef<CheckoutStep>(1);
	const abandonSnapshotRef = useRef<{ cartValue: number; hasEmail: boolean }>({
		cartValue: 0,
		hasEmail: false,
	});
	useEffect(() => {
		lastStepRef.current = step;
	}, [step]);

	const scheduleStaleReset = useCallback(() => {
		if (staleResetTimerRef.current) {
			clearTimeout(staleResetTimerRef.current);
		}
		staleResetTimerRef.current = setTimeout(() => { resetStaleCartAndReload(paths); }, 800);
	}, [paths]);

	const [preparingDelivery, setPreparingDelivery] = useState(false);
	const [contactSaveError, setContactSaveError] = useState<string | null>(null);
	const [preparingPayment, setPreparingPayment] = useState(false);
	const [shippingSaveError, setShippingSaveError] = useState<string | null>(null);
	const [availableProviderIds, setAvailableProviderIds] = useState<string[]>([]);
	const [fieldErrors, setFieldErrors] = useState<
		Partial<Record<ValidatedField, string>>
	>({});
	const [touchedFields, setTouchedFields] = useState<
		Partial<Record<ValidatedField, boolean>>
	>({});
	const [p24CircuitOpen, setP24CircuitOpen] = useState(false);
	const [formData, setFormData] = useState<CheckoutFormData>(() =>
		getDefaultCheckoutFormData(),
	);
	const formDataRef = useRef(formData);
	formDataRef.current = formData;

	useEffect(() => {
		abandonSnapshotRef.current = {
			cartValue: total,
			hasEmail: formData.email.includes("@"),
		};
	}, [total, formData.email]);

	useEffect(() => {
		if (typeof window === "undefined") return;
		const onUnload = () => {
			if (purchaseSentRef.current) return;
			if (!cartId || items.length === 0) return;
			analytics.checkoutAbandon({
				last_step: String(lastStepRef.current),
				cart_value: abandonSnapshotRef.current.cartValue,
				currency,
				has_email_domain: abandonSnapshotRef.current.hasEmail,
			});
		};
		window.addEventListener("beforeunload", onUnload);
		window.addEventListener("pagehide", onUnload);
		return () => {
			window.removeEventListener("beforeunload", onUnload);
			window.removeEventListener("pagehide", onUnload);
		};
	}, [cartId, items.length, analytics, currency]);

	const skipPersistDraftRef = useRef(false);

	useEffect(() => {
		if (!cartId) return;
		skipPersistDraftRef.current = true;
		try {
			const raw = sessionStorage.getItem(CHECKOUT_DRAFT_STORAGE_KEY);
			if (!raw) {
				queueMicrotask(() => {
					skipPersistDraftRef.current = false;
				});
				return;
			}
			const parsed = JSON.parse(raw) as Partial<CheckoutDraftPayload>;
			if (parsed.v !== 1 || !parsed.formData || typeof parsed.formData !== "object") {
				queueMicrotask(() => {
					skipPersistDraftRef.current = false;
				});
				return;
			}
			if (parsed.cartId !== cartId) {
				try {
					sessionStorage.removeItem(CHECKOUT_DRAFT_STORAGE_KEY);
				} catch {
					/* */
				}
				setStep(1);
				setFormData(getDefaultCheckoutFormData());
				queueMicrotask(() => {
					skipPersistDraftRef.current = false;
				});
				return;
			}
			setStep(1);
			setFormData({
				...getDefaultCheckoutFormData(),
				...parsed.formData,
				phone: formatPolishPhone(parsed.formData.phone ?? ""),
			});
			setSubmitError(null);
		} catch {
			/* uszkodzony JSON */
		}
		queueMicrotask(() => {
			skipPersistDraftRef.current = false;
		});
	}, [cartId]);

	useEffect(() => {
		if (!cartId || skipPersistDraftRef.current) return;
		try {
			const payload: CheckoutDraftPayload = {
				v: 1,
				cartId,
				step,
				formData,
			};
			sessionStorage.setItem(CHECKOUT_DRAFT_STORAGE_KEY, JSON.stringify(payload));
		} catch {
			/* prywatny tryb / quota */
		}
	}, [cartId, step, formData]);

	const updateField = useCallback(
		<K extends keyof CheckoutFormData>(field: K, value: CheckoutFormData[K]) => {
			setFormData((prev) => ({ ...prev, [field]: value }));
		},
		[],
	);

	useEffect(() => {
		if (typeof window === "undefined") return;
		setP24CircuitOpen(isP24CircuitOpen());
	}, [step]);

	useEffect(() => {
		if (!p24CircuitOpen) return;
		if (formData.paymentProviderId === PRZELEWY24_PROVIDER_ID) {
			updateField("paymentProviderId", SYSTEM_PAYMENT_PROVIDER_ID);
		}
	}, [p24CircuitOpen, formData.paymentProviderId, updateField]);

	const handleFieldBlur = useCallback(
		(field: ValidatedField, overrideValue?: string) => {
			setTouchedFields((prev) => ({ ...prev, [field]: true }));
			const value = overrideValue ?? formData[field];
			const error = getFieldValidationError(field, value);
			setFieldErrors((prev) => {
				const next = { ...prev };
				if (error) next[field] = error;
				else delete next[field];
				return next;
			});
			if (error) {
				analytics.formFieldError({
					form_name: "checkout_contact",
					field,
					step: 1,
				});
			}
		},
		[formData, analytics],
	);

	const showFieldError = (field: ValidatedField) =>
		touchedFields[field] && fieldErrors[field];

	const handleFocus = useCallback(() => {
		if (!formStarted) {
			setFormStarted(true);
			analytics.formStart({ form_name: "checkout_contact" });
		}
	}, [formStarted, analytics]);

	const isNipValid = validateNip(formData.nip);
	const vatValid =
		!formData.wantInvoice || (formData.companyName.trim() !== "" && isNipValid);

	const canGoToStep2 =
		formData.email.includes("@") &&
		formData.firstName.trim() !== "" &&
		formData.lastName.trim() !== "" &&
		validatePhone(formData.phone) &&
		formData.address.trim() !== "" &&
		formData.city.trim() !== "" &&
		validatePostalCode(formData.postalCode) &&
		vatValid;

	const canGoToStep3 = formData.shippingOptionId !== "";

	const canSubmit =
		formData.paymentProviderId !== "" &&
		formData.acceptTerms &&
		formData.acceptRodo &&
		!!cartId &&
		items.length > 0 &&
		formData.shippingOptionId !== "" &&
		(!turnstileEnabled || turnstileToken !== "") &&
		!submitting &&
		!submittingRef.current;

	const handleSubmit = useCallback(async () => {
		if (!cartId) return;
		if (items.length === 0) {
			setSubmitError("Koszyk jest pusty — dodaj produkty i spróbuj ponownie.");
			return;
		}
		if (!formDataRef.current.shippingOptionId) {
			setSubmitError("Wybierz sposób dostawy przed płatnością.");
			return;
		}
		if (submittingRef.current) return;
		submittingRef.current = true;
		setSubmitError(null);
		setSubmitting(true);
		setSubmitSlow(false);
		submitSlowTimerRef.current = setTimeout(() => { setSubmitSlow(true); }, 3000);
		analytics.formSubmit({ form_name: "checkout_payment" });

		const payment = formDataRef.current;

		try {
			await assertCartReadyForCheckout(cartId);

			if (isTurnstileEnabled()) {
				const ok = await verifyTurnstileToken(
					turnstileTokenRef.current,
					resolveMedusaFetchBase,
				);
				if (!ok) {
					throw new Error(
						"Weryfikacja zabezpieczająca nie powiodła się. Odśwież stronę i spróbuj ponownie.",
					);
				}
			}

			const sanitizedNotes = sanitizeOrderNotes(payment.orderNotes);

			if (payment.paymentProviderId === PRZELEWY24_PROVIDER_ID) {
				await prepareCheckout(
					cartId,
					payment.shippingOptionId,
					payment.paymentProviderId,
					sanitizedNotes,
				);
				analytics.checkoutStep({
					step_number: 3,
					cart_value: total,
					currency,
				});
				if (typeof window !== "undefined") {
					markP24PaymentStarted(cartId);
					window.location.assign(
						`${paths.p24Start}?cart_id=${encodeURIComponent(cartId)}`,
					);
					return;
				}
			}

			await prepareCheckout(
				cartId,
				payment.shippingOptionId,
				payment.paymentProviderId,
				sanitizedNotes,
			);
			await initPaymentSession(cartId, payment.paymentProviderId);

			const result = await completeCart(cartId);

			if (result.type !== "order") {
				const err = result.error;
				console.error("[checkout] complete zwrócił cart zamiast order", err, result);
				const msg = describeMedusaError(
					err,
					"Nie udało się utworzyć zamówienia (koszyk nie przeszedł w zamówienie).",
				);
				throw new Error(msg);
			}

			analytics.checkoutStep({
				step_number: 3,
				cart_value: total,
				currency,
			});

			const checkoutDurationSeconds = checkoutStartTimeRef.current
				? Math.round((Date.now() - checkoutStartTimeRef.current) / 1000)
				: undefined;

			analytics.purchase({
				transaction_id: result.order.id,
				value: total,
				currency,
				items: analytics.toAnalyticsItems(items),
				payment_method: payment.paymentProviderId,
				shipping_method: payment.shippingOptionId,
				checkout_duration_seconds: checkoutDurationSeconds,
			});
			if (payment.newsletter) {
				analytics.emailSignup({ source: "checkout" });
			}
			purchaseSentRef.current = true;

			const isBankTransfer = payment.paymentProviderId === SYSTEM_PAYMENT_PROVIDER_ID;

			if (sanitizedNotes) {
				attachOrderNotes(result.order.id, sanitizedNotes);
			}

			if (isBankTransfer) {
				await notifyBankTransferPending({
					orderId: result.order.id,
					email: payment.email,
					displayId: result.order.display_id ?? undefined,
					totalMinor: total,
					itemTotalMinor: items.reduce(
						(sum, i) => sum + i.unit_price * i.quantity,
						0,
					),
					customerName: [payment.firstName, payment.lastName]
						.filter(Boolean)
						.join(" ")
						.trim(),
					items: items.map((i) => ({
						title: i.title,
						quantity: i.quantity,
						totalMinor: i.unit_price * i.quantity,
						thumbnail: i.thumbnail ?? null,
					})),
					paymentProviderId: payment.paymentProviderId,
				});
			} else {
				await notifyOrderPlacedAwait(result.order.id);
			}

			markCheckoutCompleted(result.order.id, result.order.display_id ?? undefined);

			try {
				localStorage.removeItem(CART_ID_STORAGE_KEY);
				localStorage.removeItem("moduly_express");
			} catch {
				/* prywatny tryb */
			}
			clearCheckoutDraft();
			await refreshCart().catch(() => undefined);

			if (typeof window !== "undefined") {
				redirectToOrderConfirmation(
					result.order.id,
					result.order.display_id ?? undefined,
					isBankTransfer ? { payment: "bank_transfer" } : undefined,
					paths,
				);
				return;
			}
		} catch (e) {
			console.error("[checkout] błąd składania zamówienia", e);
			if (payment.paymentProviderId === PRZELEWY24_PROVIDER_ID) {
				recordP24Failure();
				setP24CircuitOpen(isP24CircuitOpen());
			}
			if (isCartAlreadyCompletedError(e)) {
				setSubmitError(
					"Koszyk został już sfinalizowany wcześniej. Zaraz zaczniesz od nowa…",
				);
				scheduleStaleReset();
				return;
			}
			const message = describeMedusaError(
				e,
				"Nie udało się złożyć zamówienia. Spróbuj ponownie.",
			);
			setSubmitError(message);
		} finally {
			setSubmitting(false);
			setSubmitSlow(false);
			if (submitSlowTimerRef.current) {
				clearTimeout(submitSlowTimerRef.current);
				submitSlowTimerRef.current = null;
			}
			submittingRef.current = false;
		}
	}, [cartId, items, total, refreshCart, analytics, paths, scheduleStaleReset, currency]);

	const trustBadges: ReactNode = CheckoutTrustBadges ? <CheckoutTrustBadges /> : null;

	return (
		<div className="grid gap-8 lg:grid-cols-3">
			<div className="lg:col-span-2 space-y-8">
				<nav aria-label="Postęp zamówienia" className="flex items-center gap-1">
					{STEPS.map((s, i) => (
						<div key={s.number} className="flex items-center">
							{i > 0 && (
								<div
									className={`mx-2 h-px w-8 sm:w-12 transition-colors ${
										step >= s.number ? "bg-brand-800" : "bg-brand-200"
									}`}
								/>
							)}
							<button
								type="button"
								onClick={() => {
									if (s.number < step) setStep(s.number);
								}}
								disabled={s.number > step}
								className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
									step === s.number
										? "bg-brand-800 text-white shadow-sm"
										: step > s.number
											? "bg-accent/20 text-brand-800 cursor-pointer hover:bg-accent/30"
											: "bg-brand-100 text-brand-400"
								}`}
							>
								<span
									className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold ${
										step === s.number
											? "bg-white/20 text-white"
											: step > s.number
												? "bg-brand-800 text-white"
												: "bg-white text-brand-500"
									}`}
								>
									{step > s.number ? "✓" : s.number}
								</span>
								<span className="hidden sm:inline">{s.label}</span>
							</button>
						</div>
					))}
				</nav>

				{step === 1 && (
					<section className="space-y-6">
						<h2 className="font-display text-xl font-semibold text-brand-800">
							Dane kontaktowe
						</h2>
						<div>
							<label htmlFor="email" className={LABEL_CLASS}>
								Email <span className="text-red-500">*</span>
							</label>
							<input
								id="email"
								type="email"
								autoComplete="email"
								inputMode="email"
								required
								autoFocus
								value={formData.email}
								onFocus={handleFocus}
								onBlur={() => { handleFieldBlur("email"); }}
								onChange={(e) => { updateField("email", e.target.value); }}
								className={`${INPUT_CLASS} ${showFieldError("email") ? "border-red-300" : ""}`}
								placeholder="twoj@email.pl"
								aria-invalid={showFieldError("email") ? true : undefined}
							/>
							{showFieldError("email") && (
								<p className="mt-1 text-xs text-red-500" role="alert">
									{fieldErrors.email}
								</p>
							)}
						</div>
						<div className="grid gap-4 sm:grid-cols-2">
							{(
								[
									["firstName", "Imię", "given-name"],
									["lastName", "Nazwisko", "family-name"],
								] as const
							).map(([field, label, autoComplete]) => (
								<div key={field}>
									<label htmlFor={field} className={LABEL_CLASS}>
										{label} <span className="text-red-500">*</span>
									</label>
									<input
										id={field}
										type="text"
										autoComplete={autoComplete}
										required
										value={formData[field]}
										onBlur={() => { handleFieldBlur(field); }}
										onChange={(e) => { updateField(field, e.target.value); }}
										className={`${INPUT_CLASS} ${showFieldError(field) ? "border-red-300" : ""}`}
									/>
									{showFieldError(field) && (
										<p className="mt-1 text-xs text-red-500" role="alert">
											{fieldErrors[field]}
										</p>
									)}
								</div>
							))}
							<div>
								<label htmlFor="phone" className={LABEL_CLASS}>
									Telefon <span className="text-red-500">*</span>
								</label>
								<input
									id="phone"
									type="tel"
									autoComplete="tel"
									required
									value={formData.phone}
									onBlur={() => {
										const formatted = formatPolishPhone(formData.phone);
										if (formatted !== formData.phone) updateField("phone", formatted);
										handleFieldBlur("phone", formatted);
									}}
									onChange={(e) => { updateField("phone", formatPolishPhone(e.target.value)); }}
									className={`${INPUT_CLASS} ${showFieldError("phone") ? "border-red-300" : ""}`}
									placeholder="+48 000 000 000"
								/>
							</div>
							<div>
								<label htmlFor="postalCode" className={LABEL_CLASS}>
									Kod pocztowy <span className="text-red-500">*</span>
								</label>
								<input
									id="postalCode"
									type="text"
									autoComplete="postal-code"
									required
									value={formData.postalCode}
									onBlur={() => { handleFieldBlur("postalCode"); }}
									onChange={(e) => { updateField("postalCode", e.target.value); }}
									className={`${INPUT_CLASS} ${showFieldError("postalCode") ? "border-red-300" : ""}`}
									placeholder="00-000"
								/>
							</div>
							<div className="sm:col-span-2">
								<label htmlFor="address" className={LABEL_CLASS}>
									Adres <span className="text-red-500">*</span>
								</label>
								<input
									id="address"
									type="text"
									autoComplete="street-address"
									required
									value={formData.address}
									onBlur={() => { handleFieldBlur("address"); }}
									onChange={(e) => { updateField("address", e.target.value); }}
									className={`${INPUT_CLASS} ${showFieldError("address") ? "border-red-300" : ""}`}
								/>
							</div>
							<div>
								<label htmlFor="city" className={LABEL_CLASS}>
									Miasto <span className="text-red-500">*</span>
								</label>
								<input
									id="city"
									type="text"
									autoComplete="address-level2"
									required
									value={formData.city}
									onBlur={() => { handleFieldBlur("city"); }}
									onChange={(e) => { updateField("city", e.target.value); }}
									className={`${INPUT_CLASS} ${showFieldError("city") ? "border-red-300" : ""}`}
								/>
							</div>
						</div>
						{contactSaveError && (
							<p className="text-sm text-red-600" role="alert">
								{contactSaveError}
							</p>
						)}
						<button
							type="button"
							onClick={async () => {
								if (!cartId) {
									setContactSaveError(
										"Brak koszyka — odśwież stronę i spróbuj ponownie.",
									);
									return;
								}
								setContactSaveError(null);
								setPreparingDelivery(true);
								try {
									const address: Address = {
										first_name: formData.firstName,
										last_name: formData.lastName,
										phone: formData.phone,
										address_1: formData.address,
										city: formData.city,
										postal_code: formData.postalCode,
										country_code: "pl",
										...(formData.wantInvoice && formData.companyName
											? { company: formData.companyName }
											: {}),
									};
									analytics.formSubmit({ form_name: "checkout_contact" });
									analytics.checkoutStep({
										step_number: 1,
										cart_value: total,
										currency,
									});
									if (formData.email.includes("@")) {
										analytics.leadFromEmail("checkout", formData.email);
									}
									await saveContactDetails(cartId, formData.email, address);
									setStep(2);
								} catch (e) {
									if (isCartAlreadyCompletedError(e)) {
										setContactSaveError(
											"Ten koszyk został już sfinalizowany. Za chwilę zaczniesz od nowa…",
										);
										scheduleStaleReset();
										return;
									}
									setContactSaveError(
										describeMedusaError(
											e,
											"Nie udało się zapisać danych. Sprawdź połączenie i spróbuj ponownie.",
										),
									);
								} finally {
									setPreparingDelivery(false);
								}
							}}
							disabled={!canGoToStep2 || !cartId || preparingDelivery}
							className="w-full rounded-md bg-brand-800 py-3 text-sm font-semibold text-white hover:bg-brand-900 disabled:cursor-not-allowed disabled:bg-brand-200 disabled:text-brand-500 transition-colors"
						>
							{preparingDelivery ? "Zapisywanie…" : "Przejdź do dostawy"}
						</button>
					</section>
				)}

				{step === 2 && (
					<section className="space-y-6">
						<h2 className="font-display text-xl font-semibold text-brand-800">
							Sposób dostawy
						</h2>
						<ShippingSelector
							selectedOptionId={formData.shippingOptionId}
							onSelect={(id) => { updateField("shippingOptionId", id); }}
						/>
						{shippingSaveError && (
							<p className="text-sm text-red-600" role="alert">
								{shippingSaveError}
							</p>
						)}
						<div className="flex gap-4">
							<button
								type="button"
								onClick={() => { setStep(1); }}
								className="flex-1 rounded-lg border border-brand-300 py-3 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50"
							>
								← Wróć
							</button>
							<button
								type="button"
								onClick={async () => {
									if (!cartId) return;
									setShippingSaveError(null);
									setPreparingPayment(true);
									try {
										analytics.formSubmit({ form_name: "checkout_shipping" });
										analytics.checkoutStep({
											step_number: 2,
											cart_value: total,
											currency,
										});
										const { providerId } = await prefetchPaymentReadiness(
											getRegionId,
											supportEmail,
										);
										await prepareCheckout(
											cartId,
											formData.shippingOptionId,
											providerId,
										);
										await refreshCart().catch(() => undefined);
										updateField("paymentProviderId", providerId);
										setStep(3);
									} catch (e) {
										if (isCartAlreadyCompletedError(e)) {
											setShippingSaveError(
												"Ten koszyk został już sfinalizowany. Za chwilę zaczniesz od nowa…",
											);
											scheduleStaleReset();
											return;
										}
										setShippingSaveError(
											describeMedusaError(
												e,
												"Nie udało się przygotować płatności. Spróbuj ponownie.",
											),
										);
									} finally {
										setPreparingPayment(false);
									}
								}}
								disabled={!canGoToStep3 || !cartId || preparingPayment}
								className="flex-1 rounded-lg bg-brand-800 py-3 text-sm font-semibold text-white hover:bg-brand-900 disabled:cursor-not-allowed disabled:bg-brand-200 disabled:text-brand-500 transition-colors"
							>
								{preparingPayment ? "Przygotowuję płatność…" : "Przejdź do płatności →"}
							</button>
						</div>
					</section>
				)}

				{step === 3 && (
					<section className="space-y-6">
						<h2 className="font-display text-xl font-semibold text-brand-800">Płatność</h2>
						<PaymentSelector
							selectedProviderId={formData.paymentProviderId}
							onSelect={(id) => { updateField("paymentProviderId", id); }}
							availableProviderIds={availableProviderIds}
							disabledProviderIds={
								p24CircuitOpen ? [PRZELEWY24_PROVIDER_ID] : []
							}
							p24CircuitOpen={p24CircuitOpen}
							supportEmail={supportEmail}
						/>
						{trustBadges}
						{turnstileEnabled && (
							<TurnstileWidget
								onToken={setTurnstileToken}
								className="flex justify-center"
							/>
						)}
						{submitError && (
							<div
								role="alert"
								className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
							>
								{submitError}
							</div>
						)}
						<div className="flex gap-4">
							<button
								type="button"
								onClick={() => { setStep(2); }}
								className="flex-1 rounded-lg border border-brand-300 py-3 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50"
							>
								← Wróć
							</button>
							<button
								type="button"
								onClick={handleSubmit}
								disabled={!canSubmit}
								className="flex-1 rounded-lg bg-brand-800 py-3 text-sm font-semibold text-white hover:bg-brand-900 disabled:cursor-not-allowed disabled:bg-brand-200 disabled:text-brand-500 transition-colors"
							>
								{submitting
									? formData.paymentProviderId === PRZELEWY24_PROVIDER_ID
										? "Przekierowuję do Przelewy24…"
										: "Składanie zamówienia…"
									: formData.paymentProviderId === SYSTEM_PAYMENT_PROVIDER_ID
										? "Zamawiam — opłać przelewem"
										: "Zamawiam i płacę"}
							</button>
						</div>
						{submitSlow && submitting && (
							<p className="text-center text-xs text-brand-600" role="status" aria-live="polite">
								Przetwarzamy zamówienie, nie zamykaj tego okna…
							</p>
						)}
						<label className="flex items-start gap-2 cursor-pointer">
							<input
								type="checkbox"
								checked={formData.acceptTerms}
								onChange={(e) => { updateField("acceptTerms", e.target.checked); }}
								className="mt-0.5 h-4 w-4 rounded border-brand-300 text-accent focus:ring-accent"
							/>
							<span className="text-xs text-brand-600">
								Akceptuję{" "}
								<a href={legalLinks.termsHref} className="underline hover:text-brand-900">
									regulamin sklepu
								</a>{" "}
								i{" "}
								<a href={legalLinks.privacyHref} className="underline hover:text-brand-900">
									politykę prywatności
								</a>{" "}
								<span className="text-red-500">*</span>
							</span>
						</label>
						<label className="flex items-start gap-2 cursor-pointer">
							<input
								type="checkbox"
								checked={formData.acceptRodo}
								onChange={(e) => { updateField("acceptRodo", e.target.checked); }}
								className="mt-0.5 h-4 w-4 rounded border-brand-300 text-accent focus:ring-accent"
							/>
							<span className="text-xs text-brand-600">
								Wyrażam zgodę na przetwarzanie danych osobowych w celu realizacji zamówienia
								(RODO) <span className="text-red-500">*</span>
							</span>
						</label>
					</section>
				)}
			</div>

			<div className="lg:col-span-1">
				<div className="sticky top-24">
					<OrderSummary selectedShippingOptionId={formData.shippingOptionId} />
				</div>
			</div>
		</div>
	);
}
