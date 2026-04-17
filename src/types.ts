export type UserRole = 'student' | 'instructor' | 'admin';

export interface UserProfile {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  phoneNumber?: string;
  messengerLink?: string;
  badgeInfo?: string;
  createdAt: string;
}

export interface Horse {
  horseId: string;
  name: string;
  stableNumber: string;
  status: string;
  description: string;
  imageUrl?: string;
}

export interface Lesson {
  lessonId: string;
  instructorId: string;
  instructorName?: string;
  horseId: string;
  horseName?: string;
  studentId?: string;
  studentName?: string;
  startTime: any; // Firestore Timestamp
  endTime: any; // Firestore Timestamp
  duration: number; // in minutes
  type: 'indywidualna' | 'grupowa' | 'początkujący' | 'sportowa';
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled';
}

export interface NewsItem {
  newsId: string;
  title: string;
  content: string;
  authorId: string;
  category: string;
  createdAt: string;
  imageUrl?: string;
}

export interface ForumPost {
  postId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: any;
}

export interface Instructor {
  instructorId: string;
  userId?: string; // Linked User ID
  name: string;
  qualifications?: string[];
  bio: string;
  imageUrl?: string;
  specialties: string[];
  phoneNumber?: string;
  whatsapp?: string;
  messenger?: string;
  email?: string;
}

export interface ClubFile {
  fileId: string;
  name: string;
  type: 'image' | 'pdf' | 'graphic';
  url: string;
  uploadedAt: string;
  description?: string;
}

export interface BlockedSlot {
  slotId: string;
  instructorId: string;
  startTime: string; // ISO
  endTime: string; // ISO
  reason?: string;
}

export interface AppNotification {
  notificationId: string;
  userId: string;
  title: string;
  message: string;
  type: 'lesson' | 'news' | 'forum';
  isRead: boolean;
  createdAt: string;
}

export interface AppSettings {
  logoUrl?: string;
  clubName?: string;
  mainPhone?: string;
  website?: string;
  messengerLink?: string;
  whatsappLink?: string;
}

export interface GalleryItem {
  photoId: string;
  url: string;
  description?: string;
  category?: string;
  createdAt: string;
  authorId: string;
}
