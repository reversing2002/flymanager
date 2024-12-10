import React from 'react';
import Editor from '@monaco-editor/react';
import { X } from 'lucide-react';

interface JsonEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  value: string;
  onChange?: (value: string) => void;
  onImport?: (data: any) => void;
  readOnly?: boolean;
  mode?: 'view' | 'import';
}

export default function JsonEditorModal({
  isOpen,
  onClose,
  value,
  onChange,
  onImport,
  readOnly = false,
  mode = 'view',
}: JsonEditorModalProps) {
  const [currentValue, setCurrentValue] = React.useState(value);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  const handleImport = () => {
    try {
      const data = JSON.parse(currentValue);
      onImport?.(data);
      onClose();
    } catch (error) {
      setError('Format JSON invalide');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl my-4">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {mode === 'import' ? 'Importer un module de formation' : 'Voir le JSON'}
            </h2>
            {error && (
              <p className="text-sm text-red-500 mt-1">{error}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="h-[600px] border-b">
          <Editor
            height="100%"
            defaultLanguage="json"
            value={currentValue}
            onChange={value => {
              setCurrentValue(value || '');
              setError(null);
              onChange?.(value || '');
            }}
            options={{
              readOnly,
              minimap: { enabled: false },
              formatOnPaste: true,
              formatOnType: true,
              automaticLayout: true,
            }}
          />
        </div>
        <div className="p-4 flex justify-end gap-3">
          {mode === 'import' && (
            <button
              onClick={handleImport}
              className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors"
            >
              Importer
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
