export interface TrainingModule {
  id: string;
  title: string;
  description: string;
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  category: string;
  points: number;
  createdAt: string;
  updatedAt: string;
}

export interface TrainingQuestion {
  id: string;
  moduleId: string;
  question: string;
  choices: string[];
  correctAnswer: number;
  explanation?: string;
  points: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserProgress {
  id: string;
  userId: string;
  moduleId: string;
  progress: number;
  level: string;
  pointsEarned: number;
  lastAccess: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserBadge {
  id: string;
  userId: string;
  title: string;
  description: string;
  imageUrl?: string;
  awardedAt: string;
  createdAt: string;
  updatedAt: string;
}
