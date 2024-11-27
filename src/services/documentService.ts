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
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${clubId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    return filePath;
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
  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', id);

  if (error) {
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

export const downloadDocument = async (path: string): Promise<Blob> => {
  const { data, error } = await supabase.storage
    .from('documents')
    .download(path);

  if (error) throw error;
  return data;
};
