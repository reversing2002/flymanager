import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { X, AlertTriangle, MessageSquare, Plus, Upload, Image, Video } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import ReactPlayer from 'react-player';
import { supabase } from '../../lib/supabase';
import type { AircraftRemark, AircraftRemarkResponse } from '../../types/database';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { hasAnyGroup } from "../../lib/permissions";

interface AircraftRemarksProps {
  aircraftId: string;
  onClose: () => void;
}

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  'video/x-matroska',
  'application/x-matroska',
  'video/x-msvideo',
  'video/mpeg',
  'video/3gpp',
  'video/x-ms-wmv'
];
const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
  'application/vnd.google-apps.document',
  'application/vnd.google-apps.spreadsheet',
];

const ALLOWED_FILE_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  ...ALLOWED_VIDEO_TYPES,
  ...ALLOWED_DOCUMENT_TYPES,
];

const AircraftRemarks: React.FC<AircraftRemarksProps> = ({ aircraftId, onClose }) => {
  const { user } = useAuth();
  const [remarks, setRemarks] = useState<AircraftRemark[]>([]);
  const [responses, setResponses] = useState<Record<string, AircraftRemarkResponse[]>>({});
  const [newRemark, setNewRemark] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const canManageStatus = hasAnyGroup(user, ['MECHANIC', 'ADMIN']);
  const canAddRemark = !hasAnyGroup(user, ['MECHANIC']);
  const canAddResponse = hasAnyGroup(user, ['MECHANIC', 'ADMIN']);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop: (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (!file) return;

      if (file.size > MAX_FILE_SIZE) {
        toast.error('Le fichier ne doit pas dépasser 100MB');
        return;
      }

      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        toast.error('Format de fichier non supporté');
        return;
      }

      setSelectedFile(file);
    },
    accept: ALLOWED_FILE_TYPES.reduce((acc, type) => {
      acc[type] = [];
      return acc;
    }, {}),
    maxFiles: 1,
    multiple: false,
  });

  useEffect(() => {
    loadRemarks();
  }, [aircraftId]);

  const loadRemarks = async () => {
    try {
      const { data: remarksData, error: remarksError } = await supabase
        .from('aircraft_remarks')
        .select(`
          *,
          user:user_id (
            firstName:first_name,
            lastName:last_name
          )
        `)
        .eq('aircraft_id', aircraftId)
        .order('created_at', { ascending: false });

      if (remarksError) throw remarksError;
      if (remarksData) {
        setRemarks(remarksData);

        // Load responses for each remark
        const responsesData: Record<string, AircraftRemarkResponse[]> = {};
        for (const remark of remarksData) {
          const { data: remarkResponses } = await supabase
            .from('aircraft_remark_responses')
            .select(`
              *,
              user:user_id (
                firstName:first_name,
                lastName:last_name
              )
            `)
            .eq('remark_id', remark.id)
            .order('created_at');

          if (remarkResponses) {
            responsesData[remark.id] = remarkResponses;
          }
        }
        setResponses(responsesData);
      }
    } catch (error) {
      console.error('Error loading remarks:', error);
      toast.error('Erreur lors du chargement des remarques');
    }
  };

  const uploadFile = async (file: File): Promise<string> => {
    // Utiliser remark-attachments pour les images et vidéos, et remark-documents pour les documents
    const bucket = ALLOWED_DOCUMENT_TYPES.includes(file.type) ? 'remark-documents' : 'remark-attachments';
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${aircraftId}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        onUploadProgress: (progress) => {
          const percentage = (progress.loaded / progress.total) * 100;
          setUploadProgress(Math.round(percentage));
        },
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmitRemark = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newRemark.trim() && !selectedFile) || !user) return;

    setLoading(true);
    try {
      let fileUrl = null;
      if (selectedFile) {
        fileUrl = await uploadFile(selectedFile);
      }

      const isVideo = selectedFile && ALLOWED_VIDEO_TYPES.includes(selectedFile.type);
      const isDocument = selectedFile && ALLOWED_DOCUMENT_TYPES.includes(selectedFile.type);

      const { error } = await supabase.from('aircraft_remarks').insert([{
        aircraft_id: aircraftId,
        user_id: user.id,
        content: newRemark.trim(),
        image_url: !isVideo && !isDocument ? fileUrl : null,
        video_url: isVideo ? fileUrl : null,
        document_url: isDocument ? fileUrl : null,
        status: 'PENDING',
      }]);

      if (error) throw error;
      
      setNewRemark('');
      setSelectedFile(null);
      setUploadProgress(0);
      loadRemarks();
      toast.success('Remarque ajoutée');
    } catch (error) {
      console.error('Error creating remark:', error);
      toast.error('Erreur lors de la création de la remarque');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitResponse = async (remarkId: string, content: string) => {
    if (!content.trim() || !user) return;

    try {
      const { error } = await supabase.from('aircraft_remark_responses').insert([{
        remark_id: remarkId,
        user_id: user.id,
        content: content.trim(),
      }]);

      if (error) throw error;

      loadRemarks();
      toast.success('Réponse ajoutée');
    } catch (error) {
      console.error('Error creating response:', error);
      toast.error('Erreur lors de la création de la réponse');
    }
  };

  const handleUpdateStatus = async (remarkId: string, newStatus: AircraftRemark['status']) => {
    try {
      const { error } = await supabase
        .from('aircraft_remarks')
        .update({ status: newStatus })
        .eq('id', remarkId);

      if (error) throw error;

      loadRemarks();
      toast.success('Statut mis à jour');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Erreur lors de la mise à jour du statut');
    }
  };

  const getStatusColor = (status: AircraftRemark['status']) => {
    switch (status) {
      case 'PENDING':
        return 'bg-amber-100 text-amber-800';
      case 'IN_PROGRESS':
        return 'bg-sky-100 text-sky-800';
      case 'RESOLVED':
        return 'bg-emerald-100 text-emerald-800';
    }
  };

  const getStatusLabel = (status: AircraftRemark['status']) => {
    switch (status) {
      case 'PENDING':
        return 'En attente';
      case 'IN_PROGRESS':
        return 'En cours';
      case 'RESOLVED':
        return 'Résolu';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" aria-modal="true" role="dialog">
      <div className="flex items-start justify-center min-h-screen p-4">
        {/* Overlay */}
        <div 
          className="fixed inset-0 bg-black/50 transition-opacity" 
          aria-hidden="true" 
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-4xl mx-auto my-8">
          <div className="flex flex-col max-h-[calc(100vh-4rem)]">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">Remarques</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              {canAddRemark && (
                <form onSubmit={handleSubmitRemark} className="space-y-4 mb-6">
                  <div className="bg-white p-4 rounded-lg shadow-sm border-2 border-slate-200 focus-within:border-sky-500 transition-colors">
                    <label className="block text-base font-medium text-slate-900 mb-2">
                      Nouvelle remarque
                    </label>
                    <textarea
                      value={newRemark}
                      onChange={(e) => setNewRemark(e.target.value)}
                      className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500 min-h-[100px]"
                      placeholder="Décrivez le problème ou la remarque..."
                      required={!selectedFile}
                    />
                  </div>

                  <div {...getRootProps()} className="cursor-pointer">
                    <input {...getInputProps()} />
                    {selectedFile ? (
                      <div className="relative inline-block">
                        {ALLOWED_IMAGE_TYPES.includes(selectedFile.type) ? (
                          <div className="flex items-center gap-2 p-2 bg-slate-100 rounded-lg">
                            <Image className="h-5 w-5 text-slate-600" />
                            <span className="text-sm text-slate-600">{selectedFile.name}</span>
                          </div>
                        ) : ALLOWED_VIDEO_TYPES.includes(selectedFile.type) ? (
                          <div className="flex items-center gap-2 p-2 bg-slate-100 rounded-lg">
                            <Video className="h-5 w-5 text-slate-600" />
                            <span className="text-sm text-slate-600">{selectedFile.name}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 p-2 bg-slate-100 rounded-lg">
                            <Upload className="h-5 w-5 text-slate-600" />
                            <span className="text-sm text-slate-600">{selectedFile.name}</span>
                          </div>
                        )}
                        {uploadProgress > 0 && uploadProgress < 100 && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                            <div className="text-white text-sm font-medium">
                              {uploadProgress}%
                            </div>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFile(null);
                            setUploadProgress(0);
                          }}
                          className="absolute -top-2 -right-2 p-1 bg-red-100 text-red-600 rounded-full hover:bg-red-200"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 rounded-lg hover:border-sky-500 transition-colors bg-slate-50">
                        <Upload className="h-8 w-8 text-slate-400 mb-2" />
                        <p className="text-sm text-slate-600">
                          Glissez une image, vidéo ou document ici ou cliquez pour sélectionner
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Formats supportés: Images (JPG, PNG, GIF, WEBP), Vidéos (MP4, WEBM, etc.), Documents (PDF, DOCX, XLSX)
                        </p>
                        <p className="text-xs text-slate-500">
                          Taille maximale: 100MB
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={loading || (!newRemark.trim() && !selectedFile)}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Ajouter la remarque</span>
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-4">
                {remarks.map((remark) => (
                  <div
                    key={remark.id}
                    className="bg-white rounded-lg shadow-sm overflow-hidden"
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="text-slate-900">{remark.content}</p>
                          <div className="mt-2 text-sm text-slate-500">
                            {remark.user?.firstName} {remark.user?.lastName} •{' '}
                            {format(new Date(remark.created_at), 'PPP', { locale: fr })}
                          </div>

                          {(remark.image_url || remark.video_url || remark.document_url) && (
                            <div className="mt-4">
                              {remark.image_url && (
                                <img
                                  src={remark.image_url}
                                  alt="Attachment"
                                  className="max-h-48 rounded-lg cursor-pointer hover:opacity-90"
                                  onClick={() => window.open(remark.image_url, '_blank')}
                                />
                              )}
                              {remark.video_url && (
                                <div className="max-w-lg rounded-lg overflow-hidden">
                                  <ReactPlayer
                                    url={remark.video_url}
                                    controls
                                    width="100%"
                                    height="auto"
                                    config={{
                                      file: {
                                        attributes: {
                                          controlsList: 'nodownload',
                                        },
                                        forceVideo: true,
                                      },
                                    }}
                                  />
                                </div>
                              )}
                              {remark.document_url && (
                                <a
                                  href={remark.document_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 mt-4 p-2 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                                >
                                  <Upload className="h-5 w-5 text-slate-600" />
                                  <span className="text-sm text-slate-600">
                                    {remark.document_url.split('/').pop()}
                                  </span>
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                        {canManageStatus ? (
                          <select
                            value={remark.status}
                            onChange={(e) => handleUpdateStatus(remark.id, e.target.value as AircraftRemark['status'])}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(remark.status)}`}
                          >
                            <option value="PENDING">En attente</option>
                            <option value="IN_PROGRESS">En cours</option>
                            <option value="RESOLVED">Résolu</option>
                          </select>
                        ) : (
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(remark.status)}`}>
                            {getStatusLabel(remark.status)}
                          </span>
                        )}
                      </div>

                      {responses[remark.id]?.length > 0 && (
                        <div className="mt-4 pl-4 border-l-2 border-slate-200 space-y-4">
                          {responses[remark.id].map((response) => (
                            <div key={response.id} className="text-sm">
                              <p className="text-slate-900">{response.content}</p>
                              <div className="mt-1 text-slate-500">
                                {response.user?.firstName} {response.user?.lastName} •{' '}
                                {format(new Date(response.created_at), 'PPP', {
                                  locale: fr,
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {canAddResponse && remark.status !== 'RESOLVED' && (
                        <div className="mt-4 pt-4 border-t">
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              const form = e.target as HTMLFormElement;
                              const input = form.elements.namedItem('response') as HTMLInputElement;
                              handleSubmitResponse(remark.id, input.value);
                              input.value = '';
                            }}
                            className="flex items-center gap-2"
                          >
                            <input
                              type="text"
                              name="response"
                              placeholder="Ajouter une réponse..."
                              className="flex-1 rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                              required
                            />
                            <button
                              type="submit"
                              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors"
                            >
                              <MessageSquare className="h-4 w-4" />
                              <span>Répondre</span>
                            </button>
                          </form>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {remarks.length === 0 && (
                  <div className="text-center py-12 text-slate-500">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Aucune remarque pour le moment</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 

export default AircraftRemarks;
