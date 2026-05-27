import { UploadCloud } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button } from '../ui/Button';

type UploadFieldProps = {
  label: string;
  accept?: string;
  onFileChange: (file: File | null) => void;
  error?: string;
};

export function UploadField({ label, accept, onFileChange, error }: UploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');

  return (
    <div>
      <span className="mb-1.5 block text-sm font-semibold text-ink-700">{label}</span>
      <div className="rounded-lg border border-dashed border-surface-200 bg-surface-50 p-4">
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            setFileName(file?.name ?? '');
            onFileChange(file);
          }}
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-sm text-ink-500">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-redde-500 shadow-sm">
              <UploadCloud size={20} />
            </span>
            <span>{fileName || 'PDF, DOC ou DOCX até 10MB'}</span>
          </div>
          <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
            Selecionar arquivo
          </Button>
        </div>
      </div>
      {error ? <span className="mt-1.5 block text-xs font-medium text-redde-700">{error}</span> : null}
    </div>
  );
}
