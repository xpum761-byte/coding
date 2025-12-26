
export interface Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  level: 'Pemula' | 'Menengah' | 'Lanjut';
  tags: string[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  // Added optional sources for search/maps grounding
  sources?: any[];
}

export interface ChatProject {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
}

export enum AppSection {
  HOME = 'home',
  COURSES = 'courses',
  MENTOR = 'mentor',
  COMMUNITY = 'community'
}
