import React, { useEffect, useRef } from 'react';
import { ReactFlowProvider } from 'reactflow';
import { FlowCanvas } from './components/Flow/FlowCanvas';
import { ControlPanel } from './components/Panels/ControlPanel';
import { NodeInspector } from './components/Panels/NodeInspector';
import { AlignmentBar } from './components/Panels/AlignmentBar';
import { ImportDialog } from './components/Dialogs/ImportDialog';
import { ExportDialog } from './components/Dialogs/ExportDialog';
import { LayoutDialog } from './components/Dialogs/LayoutDialog';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useAutoSave } from './hooks/useAutoSave';
import { useFlowStore } from './store/useFlowStore';
import { FileText } from 'lucide-react';
import { saveAs } from 'file-saver';
import { generateTemplateCSV } from './utils/csv';

function AppContent() {
  const { projectName, unsavedChanges, nodes, addNode, setProjectName } = useFlowStore();
  const initialized = useRef(false);

  useKeyboardShortcuts();
  useAutoSave();

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (unsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };


    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [unsavedChanges]);

  useEffect(() => {
    if (!initialized.current && nodes.length === 0) {
      initialized.current = true;

      addNode({
        id: 'node-1',
        type: 'custom',
        position: { x: 512, y: 384 },
        data: {
          label: 'New Node',
          nodeShape: 'rounded',
          nodeFillColor: 'white',
          borderStyle: 'solid',
          borderWidth: 1,
          borderColor: 'black',
          width: 120,
          height: 40,
        },
      });

      setProjectName('New Project');
    }
  }, []);

  const handleDownloadTemplate = () => {
    const csv = generateTemplateCSV();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, 'tafarru3_template.csv');
  };

  return (
    <div className="w-screen h-screen overflow-hidden bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b h-16 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">Tafarru3</h1>
          <span className="text-gray-600">
            {projectName}
            {unsavedChanges && <span className="text-orange-500 ml-2">●</span>}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 px-3 py-1.5 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileText size={18} />
            Template
          </button>
          <ImportDialog />
          <ExportDialog />
          <LayoutDialog />
        </div>
      </header>

      {/* Main Content */}
      <div className="relative h-[calc(100vh-4rem)]">
        <FlowCanvas />
        <ControlPanel />
        <NodeInspector />
        <AlignmentBar />
      </div>
    </div>
  );
}

function App() {
  return (
    <ReactFlowProvider>
      <AppContent />
    </ReactFlowProvider>
  );
}

export default App;