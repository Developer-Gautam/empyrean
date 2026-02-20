'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { 
  FaCalendarAlt, 
  FaUsers, 
  FaCheckCircle, 
  FaTimesCircle, 
  FaChartBar, 
  FaLock,
  FaArrowRight,
  FaClock,
  FaTrophy,
  FaUserGraduate,
  FaEdit,
  FaSave,
  FaSpinner,
  FaTrash
} from 'react-icons/fa';

export default function Home() {
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEvents: 0,
    totalPresent: 0,
    totalAbsent: 0,
    overallAttendance: 0
  });
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  // Admin-only states
  const [selectedDate, setSelectedDate] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [students, setStudents] = useState([]);
  const [groups, setGroups] = useState({
    'DISCIPLINE COMMITTEE': [],
    'TECH TEAM': [],
    'PR TEAM': [],
    'DESIGN TEAM': [],
    'CONTENT TEAM': [],
    'CULTURAL TEAM': [],
    'OFFICE BEARERS': [],
    'GENERAL MEMBER': []
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // -------------------- Effects --------------------
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
    fetchPublicStats();
  }, []);

  // -------------------- Fetch Public Stats --------------------
  const fetchPublicStats = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, 'attendance'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const records = [];
      let totalPresent = 0;
      let totalAbsent = 0;

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        records.push({ id: doc.id, ...data });
        
        // Calculate totals
        if (data.students) {
          totalPresent += data.students.filter(s => s.status === 'present').length;
          totalAbsent += data.students.filter(s => s.status === 'absent').length;
        }
      });

      setAttendanceRecords(records);
      
      const totalStudents = totalPresent + totalAbsent;
      const overallAttendance = totalStudents > 0 
        ? Math.round((totalPresent / totalStudents) * 100) 
        : 0;

      setStats({
        totalEvents: records.length,
        totalPresent,
        totalAbsent,
        overallAttendance
      });
    } catch (error) {
      console.error('Error fetching public stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // -------------------- Helpers --------------------
  const groupStudents = (studentArray) => {
    const grouped = {
      'DISCIPLINE COMMITTEE': [],
      'TECH TEAM': [],
      'PR TEAM': [],
      'DESIGN TEAM': [],
      'CONTENT TEAM': [],
      'CULTURAL TEAM': [],
      'OFFICE BEARERS': [],
      'GENERAL MEMBER': []
    };
    studentArray.forEach((s) => {
      const g = grouped[s.group] ? s.group : 'GENERAL MEMBER';
      grouped[g].push(s);
    });
    return grouped;
  };

  // -------------------- Load Students (Admin Only) --------------------
  const loadAllStudentsFromDb = async () => {
    if (!isAuthenticated) {
      alert('Please login as admin to access this feature');
      return;
    }
    
    setLoadingStudents(true);
    try {
      const snap = await getDocs(collection(db, 'students'));
      const fetched = snap.docs.map((d) => ({
        id: d.id,
        name: d.data().name,
        group: d.data().group || 'GENERAL MEMBER',
        status: null
      }));
      setStudents(fetched);
      setGroups(groupStudents(fetched));
    } catch (err) {
      console.error('Failed to load students', err);
      alert('Failed to load students.');
    } finally {
      setLoadingStudents(false);
    }
  };

  // -------------------- Mutations (Admin Only) --------------------
  const removeStudent = (id) => {
    if (!isAuthenticated) {
      alert('Please login as admin to access this feature');
      return;
    }
    const updated = students.filter((s) => s.id !== id);
    setStudents(updated);
    setGroups(groupStudents(updated));
  };

  const setStudentStatus = (id, status) => {
    if (!isAuthenticated) {
      alert('Please login as admin to access this feature');
      return;
    }
    const updated = students.map((s) => (s.id === id ? { ...s, status } : s));
    setStudents(updated);
    setGroups(groupStudents(updated));
  };

  // -------------------- Save Attendance (Admin Only) --------------------
  const saveToFirestore = async () => {
    if (!isAuthenticated) {
      alert('Please login as admin to access this feature');
      return;
    }
    
    if (!selectedDate || !eventTitle.trim()) {
      alert('Please select a date and enter an event title');
      return;
    }
    if (students.length === 0) {
      alert('Please load at least one student');
      return;
    }
    if (students.some((s) => !s.status)) {
      alert('Please mark every student present/absent.');
      return;
    }

    setIsSaving(true);
    try {
      const { collection, addDoc } = await import('firebase/firestore');
      await addDoc(collection(db, 'attendance'), {
        date: selectedDate,
        title: eventTitle.trim(),
        students,
        createdAt: new Date().toISOString()
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      // clear state
      setEventTitle('');
      setStudents([]);
      setGroups(groupStudents([]));
      // Refresh public stats
      fetchPublicStats();
    } catch (err) {
      console.error('Save error', err);
      alert('Failed to save attendance.');
    } finally {
      setIsSaving(false);
    }
  };

  const downloadPDF = () => {
    window.open('https://drive.google.com/drive/folders/1PVZDGYp3TaKhZj_VJNH-KVdBQ6phnU3-', '_blank');
  };

  // -------------------- Derived --------------------
  const presentCount = students.filter((s) => s.status === 'present').length;
  const absentCount = students.filter((s) => s.status === 'absent').length;
  const unmarkedCount = students.filter((s) => !s.status).length;

  // -------------------- Render --------------------
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="text-gray-600 mt-4">Loading attendance statistics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
        <div className="absolute inset-0 bg-black opacity-40"></div>
        
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-4000"></div>
          
          {/* Floating particles */}
          <div className="absolute top-20 left-20 w-2 h-2 bg-white rounded-full opacity-60 animate-bounce"></div>
          <div className="absolute top-40 right-32 w-3 h-3 bg-indigo-300 rounded-full opacity-40 animate-bounce animation-delay-1000"></div>
          <div className="absolute bottom-32 left-40 w-2 h-2 bg-purple-300 rounded-full opacity-50 animate-bounce animation-delay-2000"></div>
          <div className="absolute top-60 right-20 w-4 h-4 bg-pink-300 rounded-full opacity-30 animate-bounce animation-delay-3000"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            {/* Animated title */}
            <div className="mb-8">
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black mb-4 animate-fade-in bg-gradient-to-r from-white via-purple-200 to-indigo-200 bg-clip-text text-transparent">
                MOM Attendance
              </h1>
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-indigo-200 mb-2">
                Management System
              </div>
            </div>
            
            <p className="text-lg sm:text-xl lg:text-2xl text-indigo-100 mb-12 max-w-4xl mx-auto leading-relaxed">
              Transform your attendance tracking with <span className="text-purple-300 font-semibold">real-time analytics</span>, 
              <span className="text-indigo-300 font-semibold"> smart insights</span>, and 
              <span className="text-purple-300 font-semibold"> seamless management</span>
            </p>
            
            {/* Enhanced button container */}
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center">
              {isAuthenticated ? (
                <button
                  onClick={() => {
                    console.log('Admin Panel clicked');
                    window.location.href = '/admin';
                  }}
                  className="group relative px-8 py-4 bg-gradient-to-r from-white to-indigo-50 text-indigo-900 rounded-xl font-bold hover:from-indigo-50 hover:to-white transition-all duration-300 transform hover:scale-105 shadow-2xl hover:shadow-white/25 border border-white/20 backdrop-blur-sm z-10"
                >
                  <span className="relative z-10 flex items-center gap-3">
                    <FaLock className="h-5 w-5" />
                    Admin Dashboard
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <span className="absolute inset-0 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <FaLock className="h-5 w-5 mr-3" />
                    Admin Dashboard
                  </span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    console.log('Login clicked');
                    window.location.href = '/admin/login';
                  }}
                  className="group relative px-8 py-4 bg-gradient-to-r from-white to-purple-50 text-indigo-900 rounded-xl font-bold hover:from-purple-50 hover:to-white transition-all duration-300 transform hover:scale-105 shadow-2xl hover:shadow-purple-300/25 border border-white/20 backdrop-blur-sm z-10"
                >
                  <span className="relative z-10 flex items-center gap-3">
                    <FaLock className="h-5 w-5" />
                    Secure Login
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <span className="absolute inset-0 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <FaLock className="h-5 w-5 mr-3" />
                    Secure Login
                  </span>
                </button>
              )}
              
              <button
                onClick={() => {
                  console.log('Stats clicked');
                  const statsElement = document.getElementById('stats');
                  if (statsElement) {
                    statsElement.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="group relative px-8 py-4 bg-gradient-to-r from-indigo-600/80 to-purple-600/80 text-white rounded-xl font-bold hover:from-indigo-500 hover:to-purple-500 transition-all duration-300 transform hover:scale-105 shadow-2xl hover:shadow-indigo-500/25 border border-indigo-400/30 backdrop-blur-sm"
              >
                <span className="flex items-center gap-3">
                  <FaChartBar className="h-5 w-5" />
                  View Analytics
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <span className="absolute inset-0 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <FaChartBar className="h-5 w-5" />
                  View Analytics
                </span>
              </button>
            </div>
            
            {/* Feature highlights */}
            <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="text-center p-6 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                <div className="text-3xl font-bold text-purple-300 mb-2">100%</div>
                <div className="text-sm text-indigo-200">Secure Authentication</div>
              </div>
              <div className="text-center p-6 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                <div className="text-3xl font-bold text-indigo-300 mb-2">24/7</div>
                <div className="text-sm text-purple-200">Real-time Tracking</div>
              </div>
              <div className="text-center p-6 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                <div className="text-3xl font-bold text-pink-300 mb-2">∞</div>
                <div className="text-sm text-indigo-200">Scalable Solution</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Section */}
      <div id="stats" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-4">
            Attendance Overview
          </h2>
          <p className="text-gray-600 text-lg">
            Real-time insights into student participation
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-indigo-500 hover:shadow-xl transition-all transform hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-gray-600 text-sm font-medium mb-1 flex items-center gap-2">
                  <FaCalendarAlt className="h-4 w-4" />
                  Total Events
                </h3>
                <p className="text-3xl sm:text-4xl font-bold text-indigo-600">
                  {stats.totalEvents}
                </p>
              </div>
              <div className="p-3 bg-indigo-100 rounded-lg">
                <FaCalendarAlt className="h-6 w-6 text-indigo-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500 hover:shadow-xl transition-all transform hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-gray-600 text-sm font-medium mb-1 flex items-center gap-2">
                  <FaCheckCircle className="h-4 w-4" />
                  Total Present
                </h3>
                <p className="text-3xl sm:text-4xl font-bold text-green-600">
                  {stats.totalPresent}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <FaCheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500 hover:shadow-xl transition-all transform hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-gray-600 text-sm font-medium mb-1 flex items-center gap-2">
                  <FaTimesCircle className="h-4 w-4" />
                  Total Absent
                </h3>
                <p className="text-3xl sm:text-4xl font-bold text-red-600">
                  {stats.totalAbsent}
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <FaTimesCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-amber-500 hover:shadow-xl transition-all transform hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-gray-600 text-sm font-medium mb-1 flex items-center gap-2">
                  <FaChartBar className="h-4 w-4" />
                  Attendance Rate
                </h3>
                <p className="text-3xl sm:text-4xl font-bold text-amber-600">
                  {stats.overallAttendance}%
                </p>
              </div>
              <div className="p-3 bg-amber-100 rounded-lg">
                <FaChartBar className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Events */}
        {attendanceRecords.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <FaClock className="h-6 w-6 text-indigo-600" />
              Recent Events
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {attendanceRecords.slice(0, 6).map((record) => {
                const presentCount = record.students?.filter(s => s.status === 'present').length || 0;
                const absentCount = record.students?.filter(s => s.status === 'absent').length || 0;
                
                return (
                  <div key={record.id} className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-200 hover:shadow-md transition-shadow">
                    <h4 className="font-semibold text-gray-800 mb-2">
                      {record.title || 'Untitled Event'}
                    </h4>
                    <p className="text-sm text-gray-600 mb-2">
                      {record.date}
                    </p>
                    <div className="flex gap-4 text-sm">
                      <span className="flex items-center gap-1 text-green-600">
                        <FaCheckCircle className="h-3 w-3" />
                        {presentCount}
                      </span>
                      <span className="flex items-center gap-1 text-red-600">
                        <FaTimesCircle className="h-3 w-3" />
                        {absentCount}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {attendanceRecords.length === 0 && (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <FaUserGraduate className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No attendance records found</p>
            <p className="text-gray-500 mt-2">Check back later for attendance statistics</p>
          </div>
        )}
      </div>

      {/* Admin Section - Only visible when authenticated */}
      {isAuthenticated && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 bg-gray-50">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-4">
              Admin Panel
            </h2>
            <p className="text-gray-600 text-lg">
              Manage attendance and students
            </p>
          </div>

          <div className="max-w-4xl mx-auto space-y-6">
            {/* Load Students */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100 hover:shadow-xl transition-shadow">
              <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <FaUsers className="h-5 w-5 text-indigo-600" />
                Attendance Roster
              </h2>
              <p className="text-sm text-gray-600 mb-3">
                Load the official student list from the database, then mark each student as present or absent.
              </p>
              <button
                onClick={loadAllStudentsFromDb}
                disabled={loadingStudents}
                className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-sky-600 to-indigo-600 text-white rounded-lg hover:from-sky-700 hover:to-indigo-700 transition-all text-sm font-medium disabled:opacity-50"
              >
                {loadingStudents ? (
                  <>
                    <FaSpinner className="h-4 w-4 animate-spin" /> Loading Students...
                  </>
                ) : (
                  <>
                    <FaUsers className="h-4 w-4" /> Load Students
                  </>
                )}
              </button>
            </div>

            {/* Date & Title */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100 hover:shadow-xl transition-shadow">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <FaEdit className="h-5 w-5 text-indigo-600" /> Event Details
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <FaCalendarAlt className="h-4 w-4 text-indigo-600" /> Select Date
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Event Title</label>
                  <input
                    type="text"
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    placeholder="Enter event title (e.g., Meeting)"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base"
                  />
                </div>
              </div>
            </div>

            {/* Students */}
            {students.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100 hover:shadow-xl transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
                  <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <FaUsers className="h-5 w-5 text-indigo-600" /> Students ({students.length})
                  </h2>
                  <div className="flex flex-wrap gap-3 text-sm">
                    <span className="flex items-center gap-1 text-green-600 font-medium bg-green-50 px-3 py-1 rounded-lg">
                      <FaCheckCircle className="h-4 w-4" /> Present: {presentCount}
                    </span>
                    <span className="flex items-center gap-1 text-red-600 font-medium bg-red-50 px-3 py-1 rounded-lg">
                      <FaTimesCircle className="h-4 w-4" /> Absent: {absentCount}
                    </span>
                  </div>
                </div>

                <div className="space-y-6">
                  {Object.entries(groups).map(([gName, gStudents]) => (
                    gStudents.length === 0 ? null : (
                      <div key={gName} className="space-y-3">
                        <h3 className="text-sm font-semibold text-gray-700 bg-gray-50 px-4 py-2 rounded-lg">
                          {gName} ({gStudents.length} members)
                        </h3>
                        {gStudents.map((s) => (
                          <div key={s.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-white rounded-2xl shadow-sm border ml-4">
                            <div className="flex items-center gap-3 w-full">
                              {s.status === 'present' ? <FaCheckCircle className="h-5 w-5 text-green-500" /> : s.status === 'absent' ? <FaTimesCircle className="h-5 w-5 text-red-500" /> : <FaUsers className="h-5 w-5 text-gray-400" />}
                              <span className="text-gray-800 font-medium text-sm sm:text-base">{s.name}</span>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                              <button onClick={() => setStudentStatus(s.id, 'present')} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${s.status==='present' ? 'bg-green-600 text-white' : 'bg-green-100 text-green-700'}`}>Present</button>
                              <button onClick={() => setStudentStatus(s.id, 'absent')} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${s.status==='absent' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700'}`}>Absent</button>
                              <button onClick={() => removeStudent(s.id)} className="px-3 py-2 rounded-lg bg-gray-200 text-gray-700 text-sm"><FaTrash /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}

            {/* Save Button */}
            {students.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100">
                <button
                  onClick={saveToFirestore}
                  disabled={isSaving || !selectedDate || !eventTitle.trim() || students.length === 0 || students.some((s) => !s.status)}
                  className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-lg font-semibold text-white transition-all text-sm shadow-lg ${isSaving || !selectedDate || !eventTitle.trim() || students.length === 0 || students.some((s) => !s.status) ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'}`}
                >
                  {isSaving ? <><FaSpinner className="h-5 w-5 animate-spin" /> Saving...</> : <><FaSave className="h-5 w-5" /> Save Attendance</>}
                </button>
                {saved && <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-center gap-2"><FaCheckCircle className="h-5 w-5 text-green-600" /><p className="text-green-600 text-sm font-medium">Attendance saved!</p></div>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Features Section */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-4">
              System Features
            </h2>
            <p className="text-gray-600 text-lg">
              Comprehensive attendance management capabilities
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                <FaUsers className="h-8 w-8 text-indigo-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Student Management</h3>
              <p className="text-gray-600">Organize students by teams and groups for efficient tracking</p>
            </div>
            
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <FaCheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Real-time Tracking</h3>
              <p className="text-gray-600">Mark attendance instantly and generate comprehensive reports</p>
            </div>
            
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                <FaTrophy className="h-8 w-8 text-amber-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Analytics Dashboard</h3>
              <p className="text-gray-600">View detailed statistics and attendance trends over time</p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.3; }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-fade-in {
          animation: fade-in 0.8s ease-out;
        }
        .animate-pulse {
          animation: pulse 4s infinite;
        }
        .animate-bounce {
          animation: bounce 2s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        .animation-delay-1000 {
          animation-delay: 1s;
        }
        .animation-delay-3000 {
          animation-delay: 3s;
        }
      `}</style>
    </div>
  );
}
