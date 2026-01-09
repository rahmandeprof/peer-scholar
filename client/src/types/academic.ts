export interface School {
  id: string;
  name: string;
}

export interface Faculty {
  id: string;
  name: string;
}

export interface Department {
  id: string;
  name: string;
}

export interface Material {
  id: string;
  title: string;
  courseCode: string;
  pdfUrl?: string;
  fileUrl: string; // Used for download
  fileType: string;
  content?: string;
  type: string;
  uploader?: {
    id: string;
    firstName: string;
    lastName: string;
    image?: string;
  };
  createdAt: string;
  status: 'pending' | 'processing' | 'ready' | 'failed';
  favoritesCount: number;
  averageRating: number;
  description?: string;
  views?: number;
}
