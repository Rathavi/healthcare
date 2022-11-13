import { Observable } from 'rxjs';

export enum UserRole {
  Doctor = 'doctor',
  Patient = 'patient'
}

export interface User {
  id?: string; // document id == firebase user id
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  mobile: string;
  mcode: string;
  role: UserRole;
  birthDate: number; // timestamp
  gender: string;
  hospital?: string;
  speciality?: string;
  experience?: string;
  weight?: number;
  bio?: string;
  avatar?: File|string|Observable<string>|{ path: string|any, url: string|Observable<string> };
  createdAt?: number;
  updatedAt?: number;
  createdBy?: string; // creator id
  creator?: string|Observable<string>; // used to fetch creator name without overriding createdBy field
  updatedBy?: string;
}
