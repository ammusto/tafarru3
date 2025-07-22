import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Download, FileText, FileJson, FileImage, FileDown } from 'lucide-react';
import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useFlowStore } from '../../store/useFlowStore';
import { generateCSV } from '../../utils/csv';

export function ExportDialog() {
    const [open, setOpen] = useState(false);
    const { nodes, edges, projectName, setUnsavedChanges } = useFlowStore();

    const handleExportCSV = () => {
        const csv = generateCSV(nodes, edges);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        saveAs(blob, `tafarru3_${projectName}.csv`);
        setUnsavedChanges(false);
        setOpen(false);
    };

    const handleExportJSON = () => {
        const data = { nodes, edges };
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        saveAs(blob, `tafarru3_${projectName}.json`);
        setOpen(false);
    };

    const handleExportPNG = async () => {
        const element = document.querySelector('.react-flow') as HTMLElement;
        if (!element) return;

        try {
            const canvas = await html2canvas(element, {
                backgroundColor: 'white',
                scale: 2,
                logging: false,
                imageTimeout: 0,
                onclone: (clonedDoc) => {
                    // Hide controls and minimap in the clone
                    const controls = clonedDoc.querySelector('.react-flow__controls');
                    const minimap = clonedDoc.querySelector('.react-flow__minimap');
                    if (controls) (controls as HTMLElement).style.display = 'none';
                    if (minimap) (minimap as HTMLElement).style.display = 'none';
                }
            });

            canvas.toBlob((blob) => {
                if (blob) {
                    saveAs(blob, `tafarru3_${projectName}.png`);
                }
            });

            setOpen(false);
        } catch (error) {
            console.error('Error exporting PNG:', error);
        }
    };

    const handleExportSVG = async () => {
        // For now, just export as PNG with higher quality
        // True SVG export would require a more complex implementation
        await handleExportPNG();
    };

    const handleExportPDF = async () => {
        const element = document.querySelector('.react-flow') as HTMLElement;
        if (!element) return;

        try {
            const canvas = await html2canvas(element, {
                backgroundColor: 'white',
                scale: 2,
                logging: false,
                imageTimeout: 0,
                onclone: (clonedDoc) => {
                    const controls = clonedDoc.querySelector('.react-flow__controls');
                    const minimap = clonedDoc.querySelector('.react-flow__minimap');
                    if (controls) (controls as HTMLElement).style.display = 'none';
                    if (minimap) (minimap as HTMLElement).style.display = 'none';
                }
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
                unit: 'px',
                format: [canvas.width, canvas.height]
            });

            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
            pdf.save(`tafarru3_${projectName}.pdf`);
            setOpen(false);
        } catch (error) {
            console.error('Error exporting PDF:', error);
        }
    };

    return (
        <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger asChild>
                <button className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
                    <Download size={20} />
                    Export
                </button>
            </Dialog.Trigger>

            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
                <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6 w-full max-w-md z-50">
                    <Dialog.Title className="text-lg font-semibold mb-4">Export Project</Dialog.Title>

                    <div className="space-y-2">
                        <button
                            onClick={handleExportCSV}
                            className="w-full flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <FileText size={24} className="text-blue-500" />
                            <div className="text-left">
                                <div className="font-medium">Export as CSV</div>
                                <div className="text-sm text-gray-600">Save data with positions</div>
                            </div>
                        </button>

                        <button
                            onClick={handleExportJSON}
                            className="w-full flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <FileJson size={24} className="text-green-500" />
                            <div className="text-left">
                                <div className="font-medium">Export as JSON</div>
                                <div className="text-sm text-gray-600">Complete data structure</div>
                            </div>
                        </button>

                        <button
                            onClick={handleExportSVG}
                            className="w-full flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <FileImage size={24} className="text-purple-500" />
                            <div className="text-left">
                                <div className="font-medium">Export as Image</div>
                                <div className="text-sm text-gray-600">High-quality PNG format</div>
                            </div>
                        </button>

                        <button
                            onClick={handleExportPDF}
                            className="w-full flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <FileDown size={24} className="text-red-500" />
                            <div className="text-left">
                                <div className="font-medium">Export as PDF</div>
                                <div className="text-sm text-gray-600">Print-ready document</div>
                            </div>
                        </button>
                    </div>

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