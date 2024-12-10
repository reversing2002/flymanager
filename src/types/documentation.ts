import { Document, DocumentCategory } from './database';

export type { Document, DocumentCategory };

export type DocumentWithCategory = Document & {
  category: DocumentCategory;
  creator: {
    first_name: string;
    last_name: string;
  };
};

export type DocumentType = 'PDF' | 'WORD' | 'IMAGE' | 'VIDEO';

export interface CreateDocumentDTO {
  title: string;
  description?: string;
  category_id: string;
  file_url: string;
  file_type: DocumentType;
  file_size: number;
  required_role?: string;
}

export interface CreateCategoryDTO {
  name: string;
  parent_id?: string;
  order?: number;
}
