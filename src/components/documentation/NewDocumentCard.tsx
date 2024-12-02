import React, { useState, useCallback } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { uploadMultipleDocuments } from '../../services/documentService';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface NewDocumentCardProps {
  onUpload: () => void;
  selectedCategoryId?: string;
  clubId: string;
}

const NewDocumentCard: React.FC<NewDocumentCardProps> = ({
  onUpload,
  selectedCategoryId,
  clubId,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { user } = useAuth();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || !selectedCategoryId || !user) return;

    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      return [
        'pdf', 'doc', 'docx',
        'jpg', 'jpeg', 'png', 'gif',
        'mp4', 'mov', 'avi'
      ].includes(ext || '');
    });

    if (validFiles.length === 0) {
      toast.error('Aucun fichier valide sélectionné');
      return;
    }

    if (validFiles.some(file => file.size > 50 * 1024 * 1024)) {
      toast.error('Certains fichiers dépassent 50MB');
      return;
    }

    try {
      setIsUploading(true);
      await uploadMultipleDocuments(validFiles, clubId, selectedCategoryId);
      toast.success(`${validFiles.length} fichier(s) ajouté(s)`);
      onUpload();
    } catch (error: any) {
      console.error('Error uploading files:', error);
      toast.error(error.message || 'Erreur lors de l\'upload');
    } finally {
      setIsUploading(false);
      setIsDragging(false);
    }
  }, [selectedCategoryId, clubId, user, onUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    handleFiles(e.clipboardData.files);
  }, [handleFiles]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  }, [handleFiles]);

  if (!selectedCategoryId) {
    return null;
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onPaste={handlePaste}
      className={`
        relative p-4 border-2 border-dashed rounded-lg transition-all
        ${isDragging
          ? 'border-sky-500 bg-sky-50'
          : 'border-slate-300 hover:border-sky-500 hover:bg-sky-50'
        }
      `}
    >
      <label className="block cursor-pointer">
        <input
          type="file"
          className="sr-only"
          onChange={handleChange}
          multiple
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.mp4,.mov,.avi"
        />
        <div className="flex items-center justify-center gap-4">
          {isUploading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin text-sky-600" />
              <span className="text-sm text-slate-600">Upload en cours...</span>
            </>
          ) : (
            <>
              <Upload className="h-5 w-5 text-sky-600" />
              <span className="text-sm text-slate-600">
                Glissez des fichiers ici ou cliquez pour sélectionner
              </span>
            </>
          )}
        </div>
      </label>
    </div>
  );
};

export default NewDocumentCard;
