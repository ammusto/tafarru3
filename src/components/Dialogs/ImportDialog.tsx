import React, { useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Upload, FileText } from 'lucide-react';
import { parseCSV } from '../../utils/csv';
import { useFlowStore } from '../../store/useFlowStore';

export function ImportDialog() {
    const [open, setOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { importData, setProjectName } = useFlowStore();

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setError(null);

        try {
            const { nodes, edges } = await parseCSV(file);

            // Extract project name from filename
            const filename = file.name.replace('.csv', '');
            if (filename.includes('_template')) {
                const projectName = prompt('Enter project name:') || 'Untitled';
                setProjectName(projectName);
            } else {
                const projectName = filename.replace('tafarru3_', '') || 'Untitled';
                setProjectName(projectName);
            }

            importData(nodes, edges);
            setOpen(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to parse CSV file');
        }

        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger asChild>
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                    <Upload size={20} />
                    Import CSV
                </button>
            </Dialog.Trigger>

            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
                <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6 w-full max-w-md z-50">
                    <Dialog.Title className="text-lg font-semibold mb-4">Import CSV File</Dialog.Title>

                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                        <FileText size={48} className="mx-auto mb-4 text-gray-400" />
                        <p className="text-gray-600 mb-4">
                            Drag and drop a CSV file here, or click to browse
                        </p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                        >
                            Choose File
                        </button>
                    </div>

                    {error && (
                        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
                            {error}
                        </div>
                    )}

                    <Dialog.Close asChild>
                        <button
                            className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded"
                            aria-label="Close"
                        >
                            <X size={20} />
                        </button>
                    </Dialog.Close>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}