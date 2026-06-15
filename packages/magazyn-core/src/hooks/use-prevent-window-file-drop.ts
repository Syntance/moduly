import { useEffect } from "react";

/** Zapobiega otwieraniu pliku w przeglądarce przy drop poza strefą uploadu. */
export function usePreventWindowFileDrop(enabled = true): void {
	useEffect(() => {
		if (!enabled) return;

		function hasFiles(event: DragEvent): boolean {
			return Array.from(event.dataTransfer?.types ?? []).includes("Files");
		}

		function onDragOver(event: DragEvent) {
			if (!hasFiles(event)) return;
			event.preventDefault();
		}

		function onDrop(event: DragEvent) {
			if (!hasFiles(event)) return;
			event.preventDefault();
		}

		window.addEventListener("dragover", onDragOver);
		window.addEventListener("drop", onDrop);
		return () => {
			window.removeEventListener("dragover", onDragOver);
			window.removeEventListener("drop", onDrop);
		};
	}, [enabled]);
}
