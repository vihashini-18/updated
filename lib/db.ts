import { Student, AttendanceStatus } from '../types';

const DB_KEY = 'attendance_system_students';

// Dummy student images to ensure new students have a visual representation
const studentImages = [
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=100&q=80',
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=100&q=80',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=100&q=80',
    'https://images.unsplash.com/photo-1552058544-f2b08422138a?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=100&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=100&q=80',
];

const generateInitialAttendance = () => {
    const today = new Date();
    const attendance: Record<string, AttendanceStatus> = {};
    // Generate data for the last 10 days
    for (let i = 0; i < 10; i++) {
        const date = new Date();
        date.setDate(today.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        // Randomly assign present or absent, but make today absent for some for demo purposes
        if (i === 0) {
            attendance[dateString] = Math.random() > 0.6 ? AttendanceStatus.PRESENT : AttendanceStatus.ABSENT;
        } else {
            attendance[dateString] = Math.random() > 0.3 ? AttendanceStatus.PRESENT : AttendanceStatus.ABSENT;
        }
    }
    return attendance;
};


const initialStudents: Student[] = [
  { id: '1', rollNumber: 'S001', name: 'John Doe', email: 'john.doe@example.com', image: studentImages[0], attendance: generateInitialAttendance() },
  { id: '2', rollNumber: 'S002', name: 'Jane Smith', email: 'student@example.com', image: studentImages[1], attendance: { ...generateInitialAttendance(), [new Date().toISOString().split('T')[0]]: AttendanceStatus.PRESENT } },
  { id: '3', rollNumber: 'S003', name: 'Peter Jones', email: 'peter.jones@example.com', image: studentImages[2], attendance: generateInitialAttendance() },
  { id: '4', rollNumber: 'S004', name: 'Mary Johnson', email: 'mary.j@example.com', image: studentImages[3], attendance: generateInitialAttendance() },
  { id: '5', rollNumber: 'S005', name: 'David Williams', email: 'dave.w@example.com', image: studentImages[4], attendance: { ...generateInitialAttendance(), [new Date().toISOString().split('T')[0]]: AttendanceStatus.PRESENT } },
];

const initializeDatabase = () => {
  if (!localStorage.getItem(DB_KEY)) {
    localStorage.setItem(DB_KEY, JSON.stringify(initialStudents));
  }
};

initializeDatabase();

export const getStudents = async (): Promise<Student[]> => {
  const studentsJSON = localStorage.getItem(DB_KEY);
  return studentsJSON ? JSON.parse(studentsJSON) : [];
};

export const getStudentByEmail = async (email: string): Promise<Student | null> => {
  const students = await getStudents();
  return students.find(s => s.email.toLowerCase() === email.toLowerCase()) || null;
};

export const addStudent = async (studentData: { rollNumber: string; name: string; image?: string }): Promise<Student[]> => {
  const students = await getStudents();
  const today = new Date().toISOString().split('T')[0];
  
  const studentImage = studentData.image || studentImages[students.length % studentImages.length];

  const newStudent: Student = {
    id: new Date().toISOString(),
    rollNumber: studentData.rollNumber,
    name: studentData.name,
    email: `${studentData.name.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '')}@example.com`,
    image: studentImage,
    attendance: { [today]: AttendanceStatus.ABSENT },
  };
  const updatedStudents = [...students, newStudent];
  localStorage.setItem(DB_KEY, JSON.stringify(updatedStudents));
  return updatedStudents;
};

export const updateStudentStatus = async (studentId: string, status: AttendanceStatus): Promise<Student[]> => {
  let students = await getStudents();
  const today = new Date().toISOString().split('T')[0];
  students = students.map(student =>
    student.id === studentId 
        ? { ...student, attendance: { ...student.attendance, [today]: status } } 
        : student
  );
  localStorage.setItem(DB_KEY, JSON.stringify(students));
  return students;
};

export const getAttendanceSummary = async (userId: string): Promise<{ presentDays: number; absentDays: number }> => {
  // In a real system, this would fetch historical data for the user.
  // Here, we'll mock it for demonstration purposes.
  console.log(`Fetching summary for ${userId}`); // To show it's being called
  return {
    presentDays: 18,
    absentDays: 2,
  };
};

export const calculateAttendanceStreak = (student: Student): number => {
    let streak = 0;
    const today = new Date();
    
    for (let i = 0; i < 365; i++) { // Check up to a year back
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        
        const status = student.attendance[dateString];
        
        if (status === AttendanceStatus.PRESENT) {
            streak++;
        } else {
            // If today is not present, streak is 0. Otherwise, the streak ends the day before.
            if (i === 0) return 0;
            break;
        }
    }
    return streak;
}