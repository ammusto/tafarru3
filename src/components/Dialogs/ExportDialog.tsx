import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Download, FileText, FileJson, FileImage, FileDown } from 'lucide-react';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import { useFlowStore } from '../../store/useFlowStore';
import { generateCSV } from '../../utils/csv';
import { toPng, toSvg } from 'html-to-image';
import { optimize } from 'svgo';

export function ExportDialog() {
    const [open, setOpen] = useState(false);
    const { nodes, edges, projectName, setUnsavedChanges } = useFlowStore();
    const [exporting, setExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState('');


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
            const dataUrl = await toPng(element, {
                backgroundColor: '#ffffff',
                quality: 1.0,
                pixelRatio: 2,
                filter: (node) => {
                    // Hide controls, minimap, and background pattern
                    if (node.classList?.contains('react-flow__controls') ||
                        node.classList?.contains('react-flow__minimap') ||
                        node.classList?.contains('react-flow__background')) {
                        return false;
                    }
                    return true;
                },
                style: {
                    // Ensure text is properly rendered
                    transform: 'none',
                }
            });

            // Convert data URL to blob and save
            const response = await fetch(dataUrl);
            const blob = await response.blob();
            saveAs(blob, `tafarru3_${projectName}.png`);

            setOpen(false);
        } catch (error) {
            console.error('Error exporting PNG:', error);
        }
    };



    const handleExportSVG = async () => {
        const element = document.querySelector('.react-flow') as HTMLElement;
        if (!element) return;

        try {
            const dataUrl = await toSvg(element, {
                backgroundColor: '#ffffff',
                filter: (node) => {
                    // Hide controls, minimap, background, and attribution
                    if (node.classList?.contains('react-flow__controls') ||
                        node.classList?.contains('react-flow__minimap') ||
                        node.classList?.contains('react-flow__background') ||
                        node.classList?.contains('react-flow__attribution')) {
                        return false;
                    }

                    // REMOVE HANDLES - this is the key!
                    if (node.classList?.contains('react-flow__handle')) {
                        return false;
                    }

                    // Also remove resize handles if they exist
                    if (node.classList?.contains('nodrag') &&
                        (node.classList?.contains('cursor-nw-resize') ||
                            node.classList?.contains('cursor-ne-resize') ||
                            node.classList?.contains('cursor-sw-resize') ||
                            node.classList?.contains('cursor-se-resize'))) {
                        return false;
                    }

                    return true;
                },
            });
            let svgString: string;
            if (dataUrl.includes('base64')) {
                const base64Content = dataUrl.split(',')[1];
                svgString = atob(base64Content);
            } else {
                const svgContent = dataUrl.split(',')[1];
                svgString = decodeURIComponent(svgContent);
            }

            const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
            saveAs(svgBlob, `tafarru3_${projectName}.svg`);

            setOpen(false);
        } catch (error) {
            console.error('Error exporting SVG:', error);
        }
    };



    const handleExportPDF = async () => {
        const element = document.querySelector('.react-flow') as HTMLElement;
        if (!element) return;

        try {
            const dataUrl = await toPng(element, {
                backgroundColor: '#ffffff',
                quality: 1.0,
                pixelRatio: 2,
                filter: (node) => {
                    // Hide controls, minimap, background, and attribution
                    if (node.classList?.contains('react-flow__controls') ||
                        node.classList?.contains('react-flow__minimap') ||
                        node.classList?.contains('react-flow__background') ||
                        node.classList?.contains('react-flow__attribution')) {
                        return false;
                    }
                    return true;
                },
            });

            // Create PDF with proper dimensions
            const img = new Image();
            img.src = dataUrl;

            await new Promise((resolve) => {
                img.onload = resolve;
            });

            const pdf = new jsPDF({
                orientation: img.width > img.height ? 'landscape' : 'portrait',
                unit: 'px',
                format: [img.width, img.height]
            });

            pdf.addImage(dataUrl, 'PNG', 0, 0, img.width, img.height);
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
                            disabled={exporting}
                            className="w-full flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                            <FileImage size={24} className="text-purple-500" />
                            <div className="text-left">
                                <div className="font-medium">
                                    {exporting && exportProgress === 'Optimizing SVG...' ? 'Optimizing...' :
                                        exporting ? 'Rendering...' : 'Export as SVG'}
                                </div>
                                <div className="text-sm text-gray-600">
                                    {exporting ? exportProgress : 'Vector graphics format'}
                                </div>
                            </div>
                        </button>

                        <button
                            onClick={handleExportPNG}
                            className="w-full flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <FileImage size={24} className="text-orange-500" />
                            <div className="text-left">
                                <div className="font-medium">Export as PNG</div>
                                <div className="text-sm text-gray-600">High-quality image</div>
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