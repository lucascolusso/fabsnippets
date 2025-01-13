export type CodeCategory = 'TMDL' | 'DAX' | 'SQL' | 'Python' | 'PowerQuery';

export interface Snippet {
  id: number;
  title: string;
  code: string;
  category: CodeCategory;
  authorName: string;
  authorWebsite?: string;
  imagePath?: string;
  createdAt: string;
  votes: number;
}