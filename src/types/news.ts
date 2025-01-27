export interface ClubNews {
  id: string;
  club_id: string;
  title: string;
  content: string;
  published_at: string;
  created_at: string;
  updated_at: string;
  author_id: string;
  is_published: boolean;
  image_url?: string | null;
  excerpt?: string | null;
}
