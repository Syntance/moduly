import { useCallback, useRef, useState } from "react";
import type { EmailTemplate, EmailTemplateType } from "./template-types";

const MAX_HISTORY = 100;

function cloneTemplate(template: EmailTemplate): EmailTemplate {
	return structuredClone(template);
}

export function useTemplateHistory() {
	const pastRef = useRef<Partial<Record<EmailTemplateType, EmailTemplate[]>>>({});
	const futureRef = useRef<Partial<Record<EmailTemplateType, EmailTemplate[]>>>({});
	const [version, setVersion] = useState(0);

	const bump = useCallback(() => { setVersion((v) => v + 1); }, []);

	const recordBeforeChange = useCallback(
		(type: EmailTemplateType, current: EmailTemplate) => {
			const stack = pastRef.current[type] ?? [];
			stack.push(cloneTemplate(current));
			if (stack.length > MAX_HISTORY) stack.shift();
			pastRef.current[type] = stack;
			futureRef.current[type] = [];
			bump();
		},
		[bump],
	);

	const canUndo = useCallback(
		(type: EmailTemplateType) => {
			void version;
			return (pastRef.current[type]?.length ?? 0) > 0;
		},
		[version],
	);

	const canRedo = useCallback(
		(type: EmailTemplateType) => {
			void version;
			return (futureRef.current[type]?.length ?? 0) > 0;
		},
		[version],
	);

	const undo = useCallback(
		(type: EmailTemplateType, current: EmailTemplate): EmailTemplate | null => {
			const stack = pastRef.current[type];
			if (!stack?.length) return null;

			const previous = stack.pop()!;
			pastRef.current[type] = stack;

			const future = futureRef.current[type] ?? [];
			future.push(cloneTemplate(current));
			futureRef.current[type] = future;

			bump();
			return previous;
		},
		[bump],
	);

	const redo = useCallback(
		(type: EmailTemplateType, current: EmailTemplate): EmailTemplate | null => {
			const stack = futureRef.current[type];
			if (!stack?.length) return null;

			const next = stack.pop()!;
			futureRef.current[type] = stack;

			const past = pastRef.current[type] ?? [];
			past.push(cloneTemplate(current));
			pastRef.current[type] = past;

			bump();
			return next;
		},
		[bump],
	);

	const clear = useCallback(
		(type: EmailTemplateType) => {
			delete pastRef.current[type];
			delete futureRef.current[type];
			bump();
		},
		[bump],
	);

	return { recordBeforeChange, canUndo, canRedo, undo, redo, clear };
}
