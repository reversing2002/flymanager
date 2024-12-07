import { supabase } from '../lib/supabase';
import { Document, DocumentCategory } from '../types/database';

export interface CreateDocumentDTO {
  title: string;
  description?: string;
  category_id: string;
  file_url: string;
  file_type: string;
  file_size: number;
  required_role?: string;
  club_id: string;
}

export interface CreateCategoryDTO {
  name: string;
  parent_id?: string;
  club_id: string;
}

export interface UpdateDocumentDTO {
  title?: string;
  description?: string;
  category_id?: string;
  required_role?: string;
  club_id: string;
}

export const uploadDocument = async (file: File, clubId: string): Promise<string> => {
  try {
    // 1. Upload file to storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}${Date.now()}.${fileExt}`;
    const filePath = `${clubId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // 2. Get the public URL
    const publicUrl = getDocumentPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error('Error uploading document:', error);
    throw error;
  }
};

export const createDocument = async (document: CreateDocumentDTO): Promise<Document> => {
  const { data, error } = await supabase
    .from('documents')
    .insert([{
      ...document,
      created_by: (await supabase.auth.getUser()).data.user?.id
    }])
    .select(`
      *,
      category:document_categories (*),
      creator:users (id, first_name, last_name)
    `)
    .single();

  if (error) throw error;
  return data;
};

export const getCategories = async (clubId: string) => {
  const { data, error } = await supabase
    .from('document_categories')
    .select('*')
    .eq('club_id', clubId)
    .order('name');

  if (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }

  return data || [];
};

export const getDocuments = async (clubId: string) => {
  const { data, error } = await supabase
    .from('documents')
    .select(`
      *,
      category:document_categories (
        id,
        name
      )
    `)
    .eq('club_id', clubId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching documents:', error);
    throw error;
  }

  return data || [];
};

export const deleteDocument = async (id: string) => {
  try {
    // 1. Get the document to find its file_url
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('file_url')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    if (!document) throw new Error('Document not found');

    // 2. Extract the file path from the URL
    const fileUrl = document.file_url;
    const filePath = fileUrl.split('/').slice(-2).join('/');

    // 3. Delete the file from storage
    const { error: storageError } = await supabase.storage
      .from('documents')
      .remove([filePath]);

    if (storageError) throw storageError;

    // 4. Delete the database record
    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
};

export const createCategory = async ({ name, parent_id, club_id }: { 
  name: string; 
  parent_id?: string;
  club_id: string;
}) => {
  if (!club_id) {
    throw new Error('club_id is required');
  }

  console.log('Creating category with:', { name, parent_id, club_id });
  
  const { data, error } = await supabase
    .from('document_categories')
    .insert([{ 
      name, 
      parent_id, 
      club_id 
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating category:', error);
    throw error;
  }

  console.log('Category created:', data);
  return data;
};

export const updateDocument = async ({
  id,
  title,
  description,
  category_id,
  required_role,
  club_id
}: {
  id: string;
  title: string;
  description?: string;
  category_id?: string;
  required_role?: string;
  club_id: string;
}) => {
  const { data, error } = await supabase
    .from('documents')
    .update({ 
      title, 
      description, 
      category_id,
      required_role,
      club_id
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating document:', error);
    throw error;
  }

  return data;
};

export const updateCategory = async ({
  id,
  name,
  parent_id,
  club_id
}: {
  id: string;
  name: string;
  parent_id?: string;
  club_id: string;
}) => {
  if (!club_id) {
    throw new Error('club_id is required');
  }

  const { data, error } = await supabase
    .from('document_categories')
    .update({ 
      name, 
      parent_id 
    })
    .eq('id', id)
    .eq('club_id', club_id)
    .select()
    .single();

  if (error) {
    console.error('Error updating category:', error);
    throw error;
  }

  return data;
};

export const deleteCategory = async (categoryId: string) => {
  const { error } = await supabase
    .from('document_categories')
    .delete()
    .eq('id', categoryId)
    .neq('name', 'Non classé');

  if (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
};

export const downloadDocument = async (fileUrl: string): Promise<Blob> => {
  try {
    // Extraire le chemin du fichier de l'URL complète
    const filePath = fileUrl.split('/').slice(-2).join('/');

    const { data, error } = await supabase.storage
      .from('documents')
      .download(filePath);

    if (error) {
      console.error('Error downloading document:', error);
      throw error;
    }

    if (!data) {
      throw new Error('No data received from storage');
    }

    return data;
  } catch (error) {
    console.error('Error downloading document:', error);
    throw error;
  }
};

export const getDocumentPublicUrl = (path: string): string => {
  const { data } = supabase.storage
    .from('documents')
    .getPublicUrl(path);

  return data.publicUrl;
};

export const uploadMultipleDocuments = async (
  files: File[],
  clubId: string,
  categoryId: string
): Promise<string[]> => {
  try {
    const uploadPromises = files.map(async (file) => {
      const filePath = await uploadDocument(file, clubId);
      await createDocument({
        title: file.name.split('.')[0],
        category_id: categoryId,
        file_url: filePath,
        file_type: getFileType(file),
        file_size: file.size,
        club_id: clubId,
      });
      return filePath;
    });

    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error('Error uploading multiple documents:', error);
    throw error;
  }
};

const getFileType = (file: File): string => {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'PDF';
  if (['doc', 'docx'].includes(ext || '')) return 'WORD';
  if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) return 'IMAGE';
  if (['mp4', 'mov', 'avi'].includes(ext || '')) return 'VIDEO';
  throw new Error('Type de fichier non supporté');
};