import { Observable } from 'rxjs';
import { DocumentTranslation } from './document-translation';

export interface Post {
  id?: string;
  lang: string;
  title: string;
  slug: string;
  date: number; // timestamp
  idate: number; // timestamp
  image?: any|File|string|Observable<string>|{ path: string|any, url: string|Observable<string> };
  content: string;
  notes?: string;
  status: PostStatus;
  patientName: string;
  categories: string[];
  diagnosis: string[];
  createdAt?: number;
  updatedAt?: number;
  createdBy?: string;
  createdFor: string;
  author?: string|Observable<string>;
  updatedBy?: string;
  translationId?: string;
  translations?: PostTranslation; // used to store translations on object fetch
  isTranslatable?: boolean;
}

export enum PostStatus {
  Draft = 'draft',
  Published = 'published',
  Trash = 'trash'
}

export interface PostTranslation extends DocumentTranslation { }
