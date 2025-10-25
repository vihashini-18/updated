
export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export interface LoggedInUser {
  id: string;
  role: UserRole;
}

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
}

export interface Student {
  id: string;
  rollNumber: string;
  name: string;
  email: string;
  image: string;
  attendance: Record<string, AttendanceStatus>; // e.g., { '2024-07-31': 'PRESENT' }
}
