import React, { useState, useEffect } from 'react';
import { getStudentByEmail, calculateAttendanceStreak } from '../lib/db';
import { Student, AttendanceStatus, UserRole } from '../types';
import Button from '../components/Button';
import Card from '../components/Card';
import { UserIcon } from '../components/icons/UserIcon';
import { MailIcon } from '../components/icons/MailIcon';
import { ChevronLeftIcon } from '../components/icons/ChevronLeftIcon';
import { ChevronRightIcon } from '../components/icons/ChevronRightIcon';
import { CheckCircleIcon } from '../components/icons/CheckCircleIcon';
import { XCircleIcon } from '../components/icons/XCircleIcon';
import { FlameIcon } from '../components/icons/FlameIcon';


interface UserDashboardProps {
  onLogout: () => void;
  userId: string;
  isAdminViewing: boolean;
  onSwitchView?: (role: UserRole) => void;
}

const UserDashboard: React.FC<UserDashboardProps> = ({ onLogout, userId, isAdminViewing, onSwitchView }) => {
  const [student, setStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isMounted, setIsMounted] = useState(false);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    setIsMounted(true);
    const loadStudentData = async () => {
      try {
        setIsLoading(true);
        const studentData = await getStudentByEmail(userId);
        if (studentData) {
          setStudent(studentData);
          setStreak(calculateAttendanceStreak(studentData));
        } else {
          setError('Could not find student data.');
        }
        setError(null);
      } catch (err) {
        setError('Failed to load student data.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadStudentData();
  }, [userId]);

  const changeMonth = (offset: number) => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setDate(1); // Avoid issues with month-end dates
      newDate.setMonth(newDate.getMonth() + offset);
      return newDate;
    });
  };
  
  const handleDateClick = (day: number) => {
    setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
  };


  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const blanks = Array(firstDay).fill(null);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const getStatusForDay = (day: number) => {
        const dateString = new Date(year, month, day).toISOString().split('T')[0];
        return student?.attendance[dateString];
    };

    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <Button onClick={() => changeMonth(-1)} variant="secondary" className="p-2">
            <ChevronLeftIcon className="h-5 w-5" />
          </Button>
          <h3 className="text-xl font-semibold">
            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </h3>
          <Button onClick={() => changeMonth(1)} variant="secondary" className="p-2">
            <ChevronRightIcon className="h-5 w-5" />
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-2 text-center text-sm text-gray-400 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day}>{day}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {blanks.map((_, i) => <div key={`blank-${i}`} />)}
          {days.map(day => {
            const status = getStatusForDay(day);
            const fullDate = new Date(year, month, day);
            const isToday = new Date().toDateString() === fullDate.toDateString();
            const isSelected = selectedDate.toDateString() === fullDate.toDateString();
            
            let statusIcon;
            if (status === AttendanceStatus.PRESENT) {
              statusIcon = <CheckCircleIcon className="h-5 w-5 text-green-400 mx-auto" />;
            } else if (status === AttendanceStatus.ABSENT) {
              statusIcon = <XCircleIcon className="h-5 w-5 text-red-400 mx-auto" />;
            }

            let dayClasses = 'p-2 rounded-lg flex flex-col items-center justify-center h-16 transition-all duration-150 cursor-pointer ';

            if (isSelected) {
              dayClasses += 'bg-indigo-600 ring-2 ring-indigo-400 scale-105';
            } else if (isToday) {
              dayClasses += 'bg-indigo-600/50 border border-indigo-500 hover:bg-gray-600 hover:scale-105';
            } else {
              dayClasses += 'bg-gray-700/50 hover:bg-gray-600 hover:scale-105';
            }
            
            return (
              <div key={day} className={dayClasses} onClick={() => handleDateClick(day)}>
                <span className="font-bold">{day}</span>
                {statusIcon}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return <div className="text-center p-8">Loading dashboard...</div>;
  }

  if (error || !student) {
    return <div className="text-center p-8 text-red-400">{error || 'Student not found.'}</div>;
  }
  
  const selectedDateString = selectedDate.toISOString().split('T')[0];
  const selectedStatus = student.attendance[selectedDateString];


  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <header className={`flex flex-col sm:flex-row justify-between sm:items-center mb-8 gap-4 transition-all duration-500 ease-out ${isMounted ? 'opacity-100' : 'opacity-0 -translate-y-4'}`}>
        <div>
          <h1 className="text-3xl font-bold">Student Dashboard</h1>
          <p className="text-gray-400 mt-1">Welcome, {student.name}!</p>
        </div>
        <div className="flex items-center gap-4">
          {isAdminViewing && onSwitchView && (
            <Button onClick={() => onSwitchView(UserRole.ADMIN)} variant="primary">
              <UserIcon className="h-5 w-5 mr-2" />
              Back to Admin View
            </Button>
          )}
          <Button onClick={onLogout} variant="secondary">Logout</Button>
        </div>
      </header>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
            <Card className={`transition-all duration-500 ease-out ${isMounted ? 'opacity-100' : 'opacity-0 -translate-y-4'}`}>
                <img src={student.image} alt={student.name} className="w-32 h-32 rounded-full mx-auto object-cover border-4 border-gray-700 shadow-lg" />
                <h2 className="text-2xl font-bold text-center mt-4">{student.name}</h2>
                <div className="mt-4 space-y-2 text-gray-300">
                    <p className="flex items-center justify-center gap-2">
                        <UserIcon className="w-5 h-5 text-gray-400" />
                        <span>{student.rollNumber}</span>
                    </p>
                    <p className="flex items-center justify-center gap-2">
                        <MailIcon className="w-5 h-5 text-gray-400" />
                        <span>{student.email}</span>
                    </p>
                </div>
            </Card>
            <Card className={`transition-all duration-500 delay-100 ease-out ${isMounted ? 'opacity-100' : 'opacity-0 -translate-y-4'}`}>
                <h3 className="text-lg font-semibold mb-2 text-center text-orange-400">
                    Attendance Streak
                </h3>
                <div className="flex items-center justify-center gap-2 text-orange-300">
                    <FlameIcon className="w-8 h-8"/>
                    <span className="text-3xl font-bold">{streak}</span>
                    <span className="text-xl font-semibold">Days</span>
                </div>
            </Card>
            <Card className={`transition-all duration-500 delay-200 ease-out ${isMounted ? 'opacity-100' : 'opacity-0 -translate-y-4'}`}>
                <h3 className="text-lg font-semibold mb-2 text-center">
                    Status for {selectedDate.toLocaleDateString()}
                </h3>
                {selectedStatus === AttendanceStatus.PRESENT && (
                    <div className="flex items-center justify-center gap-2 text-green-400">
                        <CheckCircleIcon className="w-8 h-8" />
                        <span className="text-xl font-bold">Present</span>
                    </div>
                )}
                 {selectedStatus === AttendanceStatus.ABSENT && (
                    <div className="flex items-center justify-center gap-2 text-red-400">
                        <XCircleIcon className="w-8 h-8" />
                        <span className="text-xl font-bold">Absent</span>
                    </div>
                )}
                 {!selectedStatus && (
                    <div className="flex items-center justify-center gap-2 text-gray-400">
                        <span className="text-xl font-bold">Not Marked</span>
                    </div>
                )}
            </Card>
        </div>

        <div className={`lg:col-span-2 transition-all duration-500 delay-300 ease-out ${isMounted ? 'opacity-100' : 'opacity-0 -translate-y-4'}`}>
            <Card>
                <h2 className="text-2xl font-semibold mb-4">Attendance Calendar</h2>
                {renderCalendar()}
            </Card>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;