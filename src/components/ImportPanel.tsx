import { useRef } from "react";

interface ImportPanelProps {
  onImportJson(file: File): void | Promise<void>;
  onImportZip(file: File): void | Promise<void>;
  disabled?: boolean;
}

export function ImportPanel({ onImportJson, onImportZip, disabled }: ImportPanelProps) {
  const jsonRef = useRef<HTMLInputElement | null>(null);
  const zipRef = useRef<HTMLInputElement | null>(null);

  return (
    <section className="surface-card animate-rise p-4 sm:p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          className="action-button min-h-[3.5rem] bg-brand text-white hover:bg-brand-deep"
          onClick={() => jsonRef.current?.click()}
          disabled={disabled}
        >
          Import JSON
        </button>
        <button
          type="button"
          className="action-button min-h-[3.5rem] bg-ink text-white hover:bg-ink/90"
          onClick={() => zipRef.current?.click()}
          disabled={disabled}
        >
          Import ZIP
        </button>
      </div>

      <input
        ref={jsonRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void onImportJson(file);
          }
          event.target.value = "";
        }}
      />
      <input
        ref={zipRef}
        type="file"
        accept=".zip,application/zip"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void onImportZip(file);
          }
          event.target.value = "";
        }}
      />
    </section>
  );
}
