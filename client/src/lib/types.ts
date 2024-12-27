export type CodeCategory = 'TMDL' | 'DAX' | 'SQL' | 'Python';

export interface Snippet {
  id: number;
  code: string;
  category: CodeCategory;
  authorName: string;
  authorWebsite?: string;
  createdAt: string;
  votes: number;
}
