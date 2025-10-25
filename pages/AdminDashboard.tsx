import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Student, AttendanceStatus, UserRole } from '../types';
import { getStudents, updateStudentStatus, addStudent } from '../lib/db';
import Button from '../components/Button';
import Card from '../components/Card';
import TabButton from '../components/TabButton';
import AttendanceChart from '../components/AttendanceChart';
import Input from '../components/Input';
import { UserIcon } from '../components/icons/UserIcon';
import { DashboardIcon } from '../components/icons/DashboardIcon';
import { CameraIcon } from '../components/icons/CameraIcon';
import { CheckCircleIcon } from '../components/icons/CheckCircleIcon';
import { XCircleIcon } from '../components/icons/XCircleIcon';
import { PlusIcon } from '../components/icons/PlusIcon';
import { ChevronLeftIcon } from '../components/icons/ChevronLeftIcon';
import { ChevronRightIcon } from '../components/icons/ChevronRightIcon';
import { VideoCameraIcon } from '../components/icons/VideoCameraIcon';


interface AdminDashboardProps {
  onLogout: () => void;
  onSwitchView: (role: UserRole) => void;
}

type Tab = 'dashboard' | 'attendanceLog' | 'addStudent' | 'camera';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, onSwitchView }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isMounted, setIsMounted] = useState(false);
  
  // State for camera connection tab
  const [cameraUrl, setCameraUrl] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // State for Add Student page
  const [newStudent, setNewStudent] = useState({ name: '', rollNumber: '', image: '' });
  const [addSuccess, setAddSuccess] = useState<string | null>(null);
  const [addMethod, setAddMethod] = useState<'image' | 'video'>('image');
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // State for Dashboard Calendar
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarCurrentMonth, setCalendarCurrentMonth] = useState(new Date());

  const todayString = useMemo(() => new Date().toISOString().split('T')[0], []);

  useEffect(() => {
    setIsMounted(true);
    const loadData = async () => {
      try {
        setIsLoading(true);
        const studentData = await getStudents();
        setStudents(studentData);
        const savedUrl = localStorage.getItem('camera_connection_url');
        if (savedUrl) {
          setCameraUrl(savedUrl);
        }
        setError(null);
      } catch (err) {
        setError('Failed to load initial data.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();

    // Cleanup camera on component unmount
    return () => {
        if (videoRef.current?.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
        }
    };
  }, []);

  useEffect(() => {
    // Stop camera if tab changes
    if (activeTab !== 'addStudent' && isCameraOn) {
      stopCamera();
    }
  }, [activeTab]);
  
  const handleStatusChange = async (studentId: string, status: AttendanceStatus) => {
    try {
      const updatedStudents = await updateStudentStatus(studentId, status);
      setStudents(updatedStudents);
    } catch (err)      {
      setError('Failed to update status.');
      console.error(err);
    }
  };
  
  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUrlError(null);
    setSuccessMessage(null);

    const urlPattern = /^https?:\/\/.+/;
    if (!urlPattern.test(cameraUrl)) {
      setUrlError('Please enter a valid URL starting with http:// or https://');
      return;
    }

    localStorage.setItem('camera_connection_url', cameraUrl);
    setSuccessMessage('Camera URL saved successfully!');
    setTimeout(() => setSuccessMessage(null), 3000);
  };
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setNewStudent(prev => ({ ...prev, image: event.target?.result as string }));
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleAddStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.name || !newStudent.rollNumber) {
        alert('Please fill in both name and roll number.');
        return;
    }
    try {
        const updatedStudents = await addStudent({
            name: newStudent.name,
            rollNumber: newStudent.rollNumber,
            image: newStudent.image || undefined
        });
        setStudents(updatedStudents);
        const successMsg = addMethod === 'video' && recordedVideoUrl 
            ? 'Student added and video is ready for download!' 
            : 'Student added successfully!';
        setAddSuccess(successMsg);
        
        // Reset form and video state
        setNewStudent({ name: '', rollNumber: '', image: '' });
        stopCamera();
        setRecordedVideoUrl(null);
        const fileInput = document.getElementById('student-image') as HTMLInputElement;
        if(fileInput) fileInput.value = '';

        setTimeout(() => setAddSuccess(null), 4000);
    } catch (err) {
        setError('Failed to add student.');
        console.error(err);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraOn(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Could not access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraOn(false);
    setIsRecording(false);
  };

  const startRecording = () => {
    if (videoRef.current?.srcObject) {
      recordedChunksRef.current = [];
      const stream = videoRef.current.srcObject as MediaStream;
      mediaRecorderRef.current = new MediaRecorder(stream);
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const videoBlob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(videoBlob);
        setRecordedVideoUrl(url);
        stopCamera();
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const dailySummary = useMemo(() => {
    const dateString = selectedDate.toISOString().split('T')[0];
    const totalStudents = students.length;
    const presentCount = students.filter(s => s.attendance[dateString] === AttendanceStatus.PRESENT).length;
    const absentCount = totalStudents - presentCount; 
    const percentage = totalStudents > 0 ? (presentCount / totalStudents) * 100 : 0;
    return { present: presentCount, absent: absentCount, total: totalStudents, percentage };
  }, [students, selectedDate]);
  
  const renderDashboardTab = () => {
    const changeMonth = (offset: number) => {
      setCalendarCurrentMonth(prevDate => {
        const newDate = new Date(prevDate);
        newDate.setDate(1); 
        newDate.setMonth(newDate.getMonth() + offset);
        return newDate;
      });
    };
    
    const renderCalendar = () => {
      const year = calendarCurrentMonth.getFullYear();
      const month = calendarCurrentMonth.getMonth();
      const firstDay = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      
      const blanks = Array(firstDay).fill(null);
      const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  
      return (
        <div>
          <div className="flex justify-between items-center mb-4">
            <Button onClick={() => changeMonth(-1)} variant="secondary" className="p-2">
              <ChevronLeftIcon className="h-5 w-5" />
            </Button>
            <h3 className="text-xl font-semibold">
              {calendarCurrentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h3>
            <Button onClick={() => changeMonth(1)} variant="secondary" className="p-2">
              <ChevronRightIcon className="h-5 w-5" />
            </Button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-sm text-gray-400 mb-2">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => <div key={day}>{day}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {blanks.map((_, i) => <div key={`blank-${i}`} />)}
            {days.map(day => {
              const fullDate = new Date(year, month, day);
              const isSelected = selectedDate.toDateString() === fullDate.toDateString();
              
              let dayClasses = 'p-2 rounded-lg flex items-center justify-center h-10 transition-colors duration-150 cursor-pointer font-semibold ';
              if (isSelected) {
                dayClasses += 'bg-indigo-600 text-white ring-2 ring-indigo-400';
              } else {
                dayClasses += 'bg-gray-700/50 hover:bg-gray-600';
              }
              
              return (
                <div key={day} className={dayClasses} onClick={() => setSelectedDate(fullDate)}>
                  {day}
                </div>
              );
            })}
          </div>
        </div>
      );
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-center">
                Attendance Report for <span className="text-indigo-400">{selectedDate.toLocaleDateString()}</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="text-center transition-all duration-300 ease-out transform hover:scale-105">
                    <h3 className="text-lg font-semibold text-gray-400">Total Students</h3>
                    <p className="text-4xl font-bold">{dailySummary.total}</p>
                </Card>
                <Card className="text-center transition-all duration-300 ease-out transform hover:scale-105" style={{ transitionDelay: '100ms' }}>
                    <h3 className="text-lg font-semibold text-green-400">Present</h3>
                    <p className="text-4xl font-bold">{dailySummary.present}</p>
                </Card>
                <Card className="text-center transition-all duration-300 ease-out transform hover:scale-105" style={{ transitionDelay: '200ms' }}>
                    <h3 className="text-lg font-semibold text-red-400">Absent / Not Marked</h3>
                    <p className="text-4xl font-bold">{dailySummary.absent}</p>
                </Card>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <h3 className="text-xl font-semibold mb-4 text-center">Select Date</h3>
                {renderCalendar()}
              </Card>
              <Card>
                <h3 className="text-xl font-semibold mb-4 text-center">Day-wise Percentage</h3>
                <AttendanceChart present={dailySummary.present} absent={dailySummary.absent} />
              </Card>
            </div>
        </div>
    )
  };

  const renderAttendanceLogTab = () => (
    <Card>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">Daily Attendance Log for Today</h2>
      </div>
      <div className="divide-y divide-gray-700">
        {students.map(student => {
            const status = student.attendance[todayString];
            return (
                <div key={student.id} className="py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1">
                        <img src={student.image} alt={student.name} className="w-12 h-12 rounded-full object-cover"/>
                        <div>
                            <p className="font-bold text-lg">{student.name}</p>
                            <p className="text-sm text-gray-400">{student.rollNumber} &middot; {student.email}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 flex-wrap justify-center">
                        <div className="w-32 text-center">
                            {status === AttendanceStatus.PRESENT ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-green-900 text-green-300">
                                    <CheckCircleIcon className="w-4 h-4 mr-1.5" /> Present
                                </span>
                            ) : status === AttendanceStatus.ABSENT ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-red-900 text-red-300">
                                    <XCircleIcon className="w-4 h-4 mr-1.5" /> Absent
                                </span>
                            ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-gray-700 text-gray-300">
                                    Not Marked
                                </span>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button className="!py-1 !px-3" variant="secondary" onClick={() => handleStatusChange(student.id, AttendanceStatus.PRESENT)} disabled={status === AttendanceStatus.PRESENT}>
                                Mark Present
                            </Button>
                            <Button className="!py-1 !px-3" variant="danger" onClick={() => handleStatusChange(student.id, AttendanceStatus.ABSENT)} disabled={status === AttendanceStatus.ABSENT}>
                                Mark Absent
                            </Button>
                        </div>
                    </div>
                </div>
            )
        })}
      </div>
    </Card>
  );

  const renderAddStudentTab = () => (
    <Card>
      <h2 className="text-2xl font-bold mb-4">Add New Student</h2>
        <form onSubmit={handleAddStudentSubmit} className="space-y-4 max-w-lg mx-auto">
            <Input label="Full Name" id="student-name" value={newStudent.name} onChange={e => setNewStudent(p => ({...p, name: e.target.value}))} required />
            <Input label="Roll Number" id="student-roll" value={newStudent.rollNumber} onChange={e => setNewStudent(p => ({...p, rollNumber: e.target.value}))} required />
            
            <div className="flex gap-2 p-1 bg-gray-900 rounded-lg">
                <button type="button" onClick={() => setAddMethod('image')} className={`w-full py-2 px-4 text-sm font-semibold rounded-md transition-colors ${addMethod === 'image' ? 'bg-indigo-600 text-white' : 'bg-transparent text-gray-300 hover:bg-gray-700'}`}>Add with Image</button>
                <button type="button" onClick={() => setAddMethod('video')} className={`w-full py-2 px-4 text-sm font-semibold rounded-md transition-colors ${addMethod === 'video' ? 'bg-indigo-600 text-white' : 'bg-transparent text-gray-300 hover:bg-gray-700'}`}>Add via Live Video</button>
            </div>
            
            {addMethod === 'image' && (
              <div>
                <label htmlFor="student-image" className="block text-sm font-medium text-gray-400 mb-1">
                  Student Image (Optional)
                </label>
                <div className="mt-1 flex items-center gap-4">
                  {newStudent.image ? (
                      <img src={newStudent.image} alt="Preview" className="w-16 h-16 rounded-full object-cover" />
                  ) : (
                      <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center">
                          <UserIcon className="w-8 h-8 text-gray-500" />
                      </div>
                  )}
                  <input id="student-image" type="file" accept="image/*" onChange={handleImageChange} className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700"/>
                </div>
              </div>
            )}
            
            {addMethod === 'video' && (
              <div className="space-y-4">
                <div className="bg-black rounded-lg overflow-hidden aspect-video flex items-center justify-center">
                  {recordedVideoUrl ? (
                    <video src={recordedVideoUrl} controls className="w-full h-full" />
                  ) : (
                    <video ref={videoRef} muted className={`w-full h-full ${!isCameraOn && 'hidden'}`} />
                  )}
                  {!isCameraOn && !recordedVideoUrl && <div className="text-gray-500"><VideoCameraIcon className="w-16 h-16 mx-auto"/><p>Camera is off</p></div>}
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                    {!isCameraOn && !recordedVideoUrl && <Button type="button" onClick={startCamera}>Start Camera</Button>}
                    {isCameraOn && !isRecording && <Button type="button" onClick={startRecording}>Start Recording</Button>}
                    {isRecording && <Button type="button" onClick={stopRecording} variant="danger">Stop Recording</Button>}
                    {isCameraOn && <Button type="button" onClick={stopCamera} variant="secondary">Stop Camera</Button>}
                    {recordedVideoUrl && <Button type="button" onClick={() => { setRecordedVideoUrl(null); startCamera(); }} variant="secondary">Record Again</Button>}
                    {recordedVideoUrl && <a href={recordedVideoUrl} download={`student_video_${newStudent.rollNumber || 'new'}.webm`}><Button type="button">Download Video</Button></a>}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4">
                <Button type="submit">
                    <PlusIcon className="w-5 h-5 mr-2" />
                    Add Student
                </Button>
            </div>
        </form>
    </Card>
  );
  
  const renderCameraConnectionTab = () => (
    <Card>
      <h2 className="text-2xl font-semibold mb-4">Camera Connection</h2>
      <p className="text-gray-400 mb-6">
        Enter the network URL for the live camera feed. This link will be sent to the backend to establish a connection for real-time face detection.
      </p>
      <form onSubmit={handleUrlSubmit} className="max-w-lg mx-auto">
        <div className="space-y-4">
          <Input
            label="Camera Feed URL"
            id="camera-url"
            type="url"
            value={cameraUrl}
            onChange={(e) => setCameraUrl(e.target.value)}
            required
            placeholder="https://..."
          />
          {urlError && <p className="text-sm text-red-400">{urlError}</p>}
          {successMessage && <p className="text-sm text-green-400">{successMessage}</p>}
          <div className="pt-2">
            <Button type="submit" className="w-full">
              Save Connection Link
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
  
  const renderSuccessPopup = () => (
    <div className="fixed top-5 right-5 bg-green-600 text-white py-2 px-6 rounded-lg shadow-lg z-50 animate-fade-in-out">
      <p>{addSuccess}</p>
      <style>{`
        @keyframes fade-in-out {
          0% { opacity: 0; transform: translateY(-20px); }
          10% { opacity: 1; transform: translateY(0); }
          90% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-20px); }
        }
        .animate-fade-in-out {
          animation: fade-in-out 4s ease-in-out forwards;
        }
      `}</style>
    </div>
  );

  const renderContent = () => {
    if (isLoading) {
      return <div className="text-center p-8">Loading dashboard...</div>;
    }
    if (error) {
      return <div className="text-center p-8 text-red-400">{error}</div>;
    }

    switch(activeTab) {
        case 'dashboard': return renderDashboardTab();
        case 'attendanceLog': return renderAttendanceLogTab();
        case 'addStudent': return renderAddStudentTab();
        case 'camera': return renderCameraConnectionTab();
        default: return null;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      {addSuccess && renderSuccessPopup()}

      <header className={`flex flex-col sm:flex-row justify-between sm:items-center mb-8 gap-4 transition-all duration-500 ease-out ${isMounted ? 'opacity-100' : 'opacity-0 -translate-y-4'}`}>
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-400 mt-1">Manage student attendance and records.</p>
        </div>
        <div className="flex items-center gap-4">
          <Button onClick={() => onSwitchView(UserRole.USER)} variant="primary">
            <UserIcon className="h-5 w-5 mr-2" />
            View as Student
          </Button>
          <Button onClick={onLogout} variant="secondary">Logout</Button>
        </div>
      </header>

      <div className="mb-6 flex gap-2 flex-wrap">
        <TabButton isActive={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')}>
            <DashboardIcon className="w-5 h-5 mr-2" />
            Dashboard
        </TabButton>
         <TabButton isActive={activeTab === 'attendanceLog'} onClick={() => setActiveTab('attendanceLog')}>
            <UserIcon className="w-5 h-5 mr-2" />
            Attendance Log
        </TabButton>
         <TabButton isActive={activeTab === 'addStudent'} onClick={() => setActiveTab('addStudent')}>
            <PlusIcon className="w-5 h-5 mr-2" />
            Add Student
        </TabButton>
         <TabButton isActive={activeTab === 'camera'} onClick={() => setActiveTab('camera')}>
            <CameraIcon className="w-5 h-5 mr-2" />
            Camera Connection
        </Button>
      </div>

      <div key={activeTab} className="animate-fade-in">
        {renderContent()}
        <style>{`
          @keyframes fade-in {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in {
            animation: fade-in 0.4s ease-out;
          }
        `}</style>
      </div>
    </div>
  );
};

export default AdminDashboard;