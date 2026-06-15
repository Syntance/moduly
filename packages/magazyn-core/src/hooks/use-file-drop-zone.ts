import { useCallback, useRef, useState } from "react";

type Options = {
	onDropFiles: (files: File[]) => void;
	disabled?: boolean;
	accept?: (file: File) => boolean;
};

export function useFileDropZone({ onDropFiles, disabled = false, accept }: Options) {
	const dragDepthRef = useRef(0);
	const [isDragging, setIsDragging] = useState(false);

	const onDragEnter = useCallback(
		(event: React.DragEvent<HTMLElement>) => {
			if (disabled) return;
			event.preventDefault();
			dragDepthRef.current += 1;
			setIsDragging(true);
		},
		[disabled],
	);

	const onDragLeave = useCallback(
		(event: React.DragEvent<HTMLElement>) => {
			if (disabled) return;
			event.preventDefault();
			dragDepthRef.current -= 1;
			if (dragDepthRef.current <= 0) {
				dragDepthRef.current = 0;
				setIsDragging(false);
			}
		},
		[disabled],
	);

	const onDragOver = useCallback(
		(event: React.DragEvent<HTMLElement>) => {
			if (disabled) return;
			event.preventDefault();
			event.dataTransfer.dropEffect = "copy";
		},
		[disabled],
	);

	const onDrop = useCallback(
		(event: React.DragEvent<HTMLElement>) => {
			if (disabled) return;
			event.preventDefault();
			dragDepthRef.current = 0;
			setIsDragging(false);
			const files = Array.from(event.dataTransfer.files);
			const filtered = accept ? files.filter(accept) : files;
			if (filtered.length > 0) onDropFiles(filtered);
		},
		[accept, disabled, onDropFiles],
	);

	return {
		isDragging,
		dropZoneProps: { onDragEnter, onDragLeave, onDragOver, onDrop },
	};
}

export function isImageFile(file: File): boolean {
	return file.type.startsWith("image/");
}
