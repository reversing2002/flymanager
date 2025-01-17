import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.min.mjs';
import { Document as PDFDocument } from 'pdfjs-dist';
import { PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

// Configuration du worker PDF.js avec le worker local
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.js';

interface PDFViewerProps {
  url: string;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ url, isOpen, onClose, title = 'Visualiseur PDF' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.5);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!url || !isOpen) return;

    const loadPDF = async () => {
      try {
        setLoading(true);
        
        // Vérifier d'abord si l'URL est accessible
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Erreur lors du chargement du PDF: ${response.status} ${response.statusText}`);
        }
        
        const pdfBlob = await response.blob();
        const pdfUrl = URL.createObjectURL(pdfBlob);
        
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        loadingTask.onProgress = (progress) => {
          const percent = (progress.loaded / progress.total) * 100;
          console.log(`Chargement du PDF: ${Math.round(percent)}%`);
        };
        
        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
        setCurrentPage(1);
        
        return () => {
          URL.revokeObjectURL(pdfUrl);
          pdf?.destroy();
        };
      } catch (error) {
        console.error('Erreur lors du chargement du PDF:', error);
        toast.error(error instanceof Error ? error.message : 'Erreur lors du chargement du PDF');
        onClose();
      } finally {
        setLoading(false);
      }
    };

    loadPDF();
  }, [url, isOpen, onClose]);

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    const renderPage = async () => {
      const page = await pdfDoc.getPage(currentPage);
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (!context) return;

      const viewport = page.getViewport({ scale });
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      await page.render(renderContext).promise;
    };

    renderPage();
  }, [pdfDoc, currentPage, scale]);

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < numPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex flex-col bg-white"
      >
        {/* Header avec titre et contrôles */}
        <div className="flex items-center justify-between border-b bg-white p-4 shadow-sm">
          <h1 className="text-lg font-semibold">{title}</h1>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 rounded-lg bg-gray-100 p-1">
              <button
                onClick={handleZoomOut}
                className="rounded-md p-2 hover:bg-white hover:shadow-sm"
                aria-label="Zoom arrière"
              >
                <ZoomOut className="h-5 w-5" />
              </button>
              <span className="px-2 text-sm text-gray-600">{Math.round(scale * 100)}%</span>
              <button
                onClick={handleZoomIn}
                className="rounded-md p-2 hover:bg-white hover:shadow-sm"
                aria-label="Zoom avant"
              >
                <ZoomIn className="h-5 w-5" />
              </button>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
              aria-label="Fermer le visualiseur"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Contenu principal avec navigation superposée */}
        <div className="relative flex-1 overflow-auto bg-gray-100">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          ) : (
            <div className="relative min-h-full min-w-full">
              <div className="flex justify-center p-4">
                <div className="overflow-auto">
                  <canvas 
                    ref={canvasRef}
                    style={{
                      display: 'block',
                      width: `${scale * 100}%`
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Navigation superposée */}
          <div className="pointer-events-none fixed inset-x-4 top-1/2 -translate-y-1/2 flex items-center justify-between">
            {/* Bouton page précédente */}
            <div className="pointer-events-auto">
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className="rounded-full bg-white/90 p-2 shadow-lg backdrop-blur-sm hover:bg-white disabled:opacity-50 disabled:shadow-none"
                aria-label="Page précédente"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            </div>

            {/* Bouton page suivante */}
            <div className="pointer-events-auto">
              <button
                onClick={handleNextPage}
                disabled={currentPage === numPages}
                className="rounded-full bg-white/90 p-2 shadow-lg backdrop-blur-sm hover:bg-white disabled:opacity-50 disabled:shadow-none"
                aria-label="Page suivante"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PDFViewer;
