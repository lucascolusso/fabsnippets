export type CodeCategory = 'Prompt' | 'TMDL' | 'DAX' | 'SQL' | 'Python' | 'PowerQuery';

export interface Snippet {
  id: number;
  title: string;
  code: string;
  category: CodeCategory;
  authorId: number;
  authorUsername: string;  
  authorWebsite?: string;
  imagePath?: string;
  createdAt: string;
  votes: number;
}

export interface User {
  id: number;
  username: string;
  email?: string;
  website?: string;
  createdAt: string;
  isAdmin: boolean;
}