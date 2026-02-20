'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, orderBy, deleteDoc, doc, addDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import {
  FaTrash,
  FaSync,
  FaCalendarAlt,
  FaUsers,
  FaCheckCircle,
  FaTimesCircle,
  FaChartBar,
  FaFilter,
  FaSignOutAlt,
  FaTimes
} from 'react-icons/fa';

export default function AdminPanel() {
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [adminLoading, setAdminLoading] = useState(true);
  const [filterDate, setFilterDate] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentGroups, setStudentGroups] = useState([]);
  const [students, setStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentSearchResults, setStudentSearchResults] = useState([]);
  const [searchInputValue, setSearchInputValue] = useState(''); // Add separate state for input
  const [groupFilter, setGroupFilter] = useState('ALL');
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  
  const { isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();

  const groups = [
    'DISCIPLINE COMMITTEE',
    'TECH TEAM',
    'PR TEAM',
    'DESIGN TEAM',
    'CONTENT TEAM',
    'CULTURAL TEAM',
    'OFFICE BEARERS',
    'GENERAL MEMBER',
    'FINANCE COMMITTEE'
  ];

  useEffect(() => {
    console.log('Admin Page: isLoading:', isLoading, 'isAuthenticated:', isAuthenticated);
    
    // Don't do anything while auth is loading
    if (isLoading) return;
    
    // Check if admin is authenticated
    if (isAuthenticated) {
      console.log('Admin Page: User is authenticated, setting up real-time listeners');
      
      // Set up real-time listener for attendance records
      const attendanceUnsubscribe = onSnapshot(
        query(collection(db, 'attendance'), orderBy('createdAt', 'desc')),
        (snapshot) => {
          const records = [];
          snapshot.forEach((doc) => {
            records.push({ id: doc.id, ...doc.data() });
          });
          setAttendanceRecords(records);
          setAdminLoading(false);
        },
        (error) => {
          console.error('Error in attendance listener:', error);
          setAdminLoading(false);
        }
      );
      
      // Set up real-time listener for students
      const studentsUnsubscribe = onSnapshot(
        collection(db, 'students'),
        (snapshot) => {
          const list = [];
          snapshot.forEach(d => {
            const data = d.data();
            console.log('Real-time student update:', d.id, data);
            list.push({ 
              id: d.id, 
              name: data.name, 
              nameLower: (data.nameLower || (data.name || '').toLowerCase()),
              groups: data.groups || [data.group || 'GENERAL MEMBER']
            });
          });
          console.log('Real-time students list:', list);
          setStudents(list);
        },
        (error) => {
          console.error('Error in students listener:', error);
        }
      );
      
      // Test Firebase connection
      console.log('Testing Firebase connection...');
      console.log('Database instance:', db);
      
      // Cleanup listeners on unmount
      return () => {
        attendanceUnsubscribe();
        studentsUnsubscribe();
      };
    } else {
      console.log('Admin Page: User not authenticated, redirecting to login');
      router.push('/admin/login');
    }
  }, [isAuthenticated, isLoading, router]);

  const fetchAttendanceRecords = async () => {
    setAdminLoading(true);
    try {
      const q = query(collection(db, 'attendance'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const records = [];
      querySnapshot.forEach((doc) => {
        records.push({ id: doc.id, ...doc.data() });
      });
      setAttendanceRecords(records);
    } catch (error) {
      console.error('Error fetching attendance records:', error);
      alert('Error loading attendance records');
    } finally {
      setAdminLoading(false);
    }
  };

  const deleteRecord = async (id) => {
    if (confirm('Are you sure you want to delete this record?')) {
      try {
        await deleteDoc(doc(db, 'attendance', id));
        setAttendanceRecords(attendanceRecords.filter(record => record.id !== id));
      } catch (error) {
        console.error('Error deleting record:', error);
        alert('Error deleting record');
      }
    }
  };

  const filteredRecords = filterDate
    ? attendanceRecords.filter(record => record.date === filterDate)
    : attendanceRecords;

  const fetchStudents = async () => {
    try {
      console.log('Fetching students from Firestore...');
      const snap = await getDocs(collection(db, 'students'));
      const list = [];
      snap.forEach(d => {
        const data = d.data();
        console.log('Student document:', d.id, data);
        list.push({ 
          id: d.id, 
          name: data.name, 
          nameLower: (data.nameLower || (data.name || '').toLowerCase()),
          groups: data.groups || [data.group || 'GENERAL MEMBER'] // Handle both old and new format
        });
      });
      console.log('Final students list:', list);
      setStudents(list);
    } catch (e) {
      console.error('Error loading students', e);
    }
  };

  const addStudentToDb = async () => {
    const name = studentName.trim();
    console.log('Adding student:', { name, studentGroups });
    
    if (!name) return;
    const duplicate = students.some(s => s.name.trim().toLowerCase() === name.toLowerCase());
    if (duplicate) {
      alert('Student with the same name already exists.');
      return;
    }
    if (!studentGroups || studentGroups.length === 0) {
      alert('Please select at least one group for student');
      return;
    }
    try {
      const nameLower = name.toLowerCase();
      const studentData = { 
        name, 
        nameLower, 
        groups: studentGroups // Store as array
      };
      console.log('Student data to save:', studentData);
      
      const ref = await addDoc(collection(db, 'students'), studentData);
      console.log('Document saved with ID:', ref.id);
      
      // Update local state
      const newStudent = { id: ref.id, name, nameLower, groups: studentGroups };
      setStudents([newStudent, ...students]);
      setStudentName('');
      setStudentGroups([]);
      
      // Clear search when adding new student
      setSearchInputValue('');
      setStudentSearch('');
      setStudentSearchResults([]);
      console.log('Student added - search cleared');
      
      alert('Student added successfully!');
    } catch (e) {
      console.error('Error adding student', e);
      alert('Failed to add student: ' + e.message);
    }
  };

  const deleteStudentFromDb = async (id) => {
    try {
      await deleteDoc(doc(db, 'students', id));
      setStudents(students.filter(s => s.id !== id));
      
      // Clear search when deleting student
      setSearchInputValue('');
      setStudentSearch('');
      setStudentSearchResults([]);
      console.log('Student deleted - search cleared');
    } catch (e) {
      console.error('Error removing student', e);
      alert('Failed to remove student');
    }
  };

  const getTotalStats = () => {
    let totalStudents = 0;
    let totalPresent = 0;
    let totalAbsent = 0;
    
    filteredRecords.forEach(record => {
      totalStudents += record.students?.length || 0;
      totalPresent += record.students?.filter(s => s.status === 'present').length || 0;
      totalAbsent += record.students?.filter(s => s.status === 'absent').length || 0;
    });

    return { totalStudents, totalPresent, totalAbsent };
  };

  const stats = getTotalStats();
  const overallPct = (stats.totalPresent + stats.totalAbsent) > 0
    ? Math.round((stats.totalPresent / (stats.totalPresent + stats.totalAbsent)) * 100)
    : 0;

  const studentStatsMap = useMemo(() => {
    const map = new Map();

    attendanceRecords.forEach((record) => {
      record.students?.forEach((student) => {
        const nameLower = (student.name || '').toLowerCase();
        if (!nameLower) return;

        if (!map.has(nameLower)) {
          map.set(nameLower, {
            name: student.name,
            present: 0,
            total: 0,
          });
        }

        const statsEntry = map.get(nameLower);
        statsEntry.total += 1;
        if (student.status === 'present') {
          statsEntry.present += 1;
        }
      });
    });

    return map;
  }, [attendanceRecords]);

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="text-gray-600 mt-4">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50">
      {/* Mobile App Header */}
      <div className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-40">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <FaUsers className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Admin Panel</h1>
                <div className="text-xs text-gray-500">Real-time Management</div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-500 text-white px-4 py-2 rounded-xl font-medium hover:bg-red-600 transition-all transform hover:scale-105 shadow-lg flex items-center gap-2"
            >
              <FaSignOutAlt className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 sm:px-6 lg:px-8">
        {/* Mobile App Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-2xl shadow-lg p-4 border-l-4 border-indigo-500 transform transition-all hover:scale-105 hover:shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                <FaChartBar className="h-4 w-4 text-indigo-600" />
              </div>
              <div className="text-2xl font-bold text-indigo-600 animate-pulse">
                {filteredRecords.length}
              </div>
            </div>
            <div className="text-xs text-gray-600 font-medium">Records</div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg p-4 border-l-4 border-green-500 transform transition-all hover:scale-105 hover:shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <FaCheckCircle className="h-4 w-4 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-600 animate-pulse">
                {stats.totalPresent}
              </div>
            </div>
            <div className="text-xs text-gray-600 font-medium">Present</div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg p-4 border-l-4 border-red-500 transform transition-all hover:scale-105 hover:shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <FaTimesCircle className="h-4 w-4 text-red-600" />
              </div>
              <div className="text-2xl font-bold text-red-600 animate-pulse">
                {stats.totalAbsent}
              </div>
            </div>
            <div className="text-xs text-gray-600 font-medium">Absent</div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg p-4 border-l-4 border-amber-500 transform transition-all hover:scale-105 hover:shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                <FaChartBar className="h-4 w-4 text-amber-600" />
              </div>
              <div className="text-2xl font-bold text-amber-600 animate-pulse">
                {overallPct}%
              </div>
            </div>
            <div className="text-xs text-gray-600 font-medium">Rate</div>
          </div>
        </div>

        {/* Mobile App Quick Actions */}
        <div className="bg-white rounded-2xl shadow-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <div className="w-6 h-6 bg-indigo-100 rounded-lg flex items-center justify-center">
                <FaUsers className="h-3 w-3 text-indigo-600" />
              </div>
              Quick Actions
            </h2>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              Live Data
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => setShowStudentModal(true)}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl p-6 font-bold hover:from-indigo-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-xl flex flex-col items-center gap-3"
            >
              <FaUsers className="h-8 w-8" />
              <div className="text-center">
                <div className="text-2xl font-bold">{students.length}</div>
                <div className="text-sm opacity-90">Manage Students</div>
              </div>
            </button>
            
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <FaSync className="h-4 w-4 text-indigo-600" />
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-800">{filteredRecords.length}</div>
                  <div className="text-sm text-gray-600">Total Records</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Student Management Module */}
        <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                <FaUsers className="h-4 w-4 text-indigo-600" />
              </div>
              Student Management ({students.length})
            </h2>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              Real-time Data
            </div>
          </div>

          {/* Search and Filter Bar */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 mb-6">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
                <FaFilter className="h-3 w-3 text-blue-600" />
              </div>
              Search & Filter Students
            </h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={searchInputValue}
                onChange={(e) => {
                  const term = e.target.value;
                  console.log('Main page search term:', term);
                  setSearchInputValue(term);
                  
                  const lower = term.trim().toLowerCase();
                  if (!lower) {
                    setStudentSearch('');
                    setStudentSearchResults([]);
                    console.log('Main page search cleared');
                  } else {
                    setStudentSearch(term);
                    const results = students.filter(s => s.nameLower.includes(lower));
                    console.log('Main page search results:', results);
                    setStudentSearchResults(results);
                  }
                }}
                placeholder="Search students by name..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-lg"
              />
              <select
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-lg"
              >
                <option value="ALL">All Teams</option>
                {groups.map(group => (
                  <option key={group} value={group}>{group}</option>
                ))}
              </select>
              <button
                onClick={() => {
                  setSearchInputValue('');
                  setStudentSearch('');
                  setStudentSearchResults([]);
                  console.log('Main page search manually cleared');
                }}
                className="px-4 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-medium"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Students List - Similar to Records List */}
          {students.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <FaUsers className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No students found</p>
              <p className="text-gray-500 text-sm mt-2">Add your first student to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {(studentSearch ? studentSearchResults : students)
                .filter(s => groupFilter === 'ALL' || s.groups.includes(groupFilter))
                .map((student) => {
                  const stat = studentStatsMap.get(student.nameLower);
                  const attendancePercentage = (stat && stat.total > 0) 
                    ? Math.round((stat.present / stat.total) * 100) 
                    : 0;
                  
                  return (
                    <div key={student.id} className="bg-white rounded-xl shadow-lg p-4 sm:p-6 hover:shadow-xl transition-shadow border border-gray-100">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4">
                        <div className="mb-4 sm:mb-0">
                          <div className="flex items-center gap-2 mb-2">
                            <FaUsers className="h-5 w-5 text-indigo-600" />
                            <h3 className="text-xl font-semibold text-gray-800">
                              {student.name}
                            </h3>
                          </div>
                          <p className="text-gray-600 text-sm sm:text-base mb-1 flex items-center gap-2">
                            <span className="font-medium">Teams:</span> 
                            {student.groups.length === 1 ? (
                              <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded-lg text-sm">
                                {student.groups[0]}
                              </span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {student.groups.slice(0, 3).map((group, index) => (
                                  <span key={index} className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded-lg text-sm">
                                    {group}
                                  </span>
                                ))}
                                {student.groups.length > 3 && (
                                  <span className="bg-gray-200 text-gray-600 px-2 py-1 rounded-lg text-sm">
                                    +{student.groups.length - 3} more
                                  </span>
                                )}
                              </div>
                            )}
                          </p>
                          <p className="text-gray-600 text-sm sm:text-base flex items-center gap-2">
                            <span className="font-medium">Added:</span>{' '}
                            {new Date().toLocaleString()}
                          </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <button
                            onClick={() => setDeleteConfirm(student)}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm sm:text-base whitespace-nowrap"
                          >
                            <FaTrash className="h-4 w-4" />
                            Delete
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-4 mb-4 text-sm">
                        <span className="flex items-center gap-1 text-green-600 font-medium">
                          <FaCheckCircle className="h-4 w-4" />
                          Present: {stat?.present || 0}
                        </span>
                        <span className="flex items-center gap-1 text-red-600 font-medium">
                          <FaTimesCircle className="h-4 w-4" />
                          Absent: {(stat?.total || 0) - (stat?.present || 0)}
                        </span>
                        <span className="flex items-center gap-1 text-gray-600 font-medium">
                          <FaChartBar className="h-4 w-4" />
                          Attendance: {attendancePercentage}%
                        </span>
                        <span className="flex items-center gap-1 text-blue-600 font-medium">
                          <FaCalendarAlt className="h-4 w-4" />
                          Total Events: {stat?.total || 0}
                        </span>
                      </div>

                      <div className="border-t pt-4">
                        <h4 className="font-medium text-gray-700 mb-3 text-sm sm:text-base flex items-center gap-2">
                          <FaCalendarAlt className="h-4 w-4" />
                          Recent Attendance Records:
                        </h4>
                        {stat && stat.total > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {attendanceRecords
                              .filter(record => 
                                record.students?.some(s => 
                                  s.name.toLowerCase() === student.name.toLowerCase()
                                )
                              )
                              .slice(0, 6)
                              .map((record) => {
                                const studentRecord = record.students?.find(s => 
                                  s.name.toLowerCase() === student.name.toLowerCase()
                                );
                                return (
                                  <div
                                    key={record.id}
                                    className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
                                      studentRecord?.status === 'present'
                                        ? 'bg-green-50 text-green-800 border border-green-200'
                                        : 'bg-red-50 text-red-800 border border-red-200'
                                    }`}
                                  >
                                    {studentRecord?.status === 'present' ? (
                                      <FaCheckCircle className="h-4 w-4 flex-shrink-0" />
                                    ) : (
                                      <FaTimesCircle className="h-4 w-4 flex-shrink-0" />
                                    )}
                                    <div className="flex-1">
                                      <div className="font-medium">{record.title || 'Untitled Event'}</div>
                                      <div className="text-xs opacity-75">{record.date}</div>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        ) : (
                          <div className="text-center py-4 bg-gray-50 rounded-lg">
                            <p className="text-gray-500 text-sm">No attendance records yet</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

        </div>
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <FaFilter className="h-4 w-4" />
                Filter by Date
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base"
                />
                {filterDate && (
                  <button
                    onClick={() => setFilterDate('')}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium text-sm sm:text-base"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-end">
              <button
                onClick={fetchAttendanceRecords}
                disabled={adminLoading}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm sm:text-base disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <FaSync className={`h-4 w-4 ${adminLoading ? 'animate-spin' : ''}`} />
                {adminLoading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>

        {/* Records List */}
        {adminLoading ? (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="text-gray-600 mt-4">Loading records...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <FaUsers className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No attendance records found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRecords.map((record) => {
              const presentCount = record.students?.filter(s => s.status === 'present').length || 0;
              const absentCount = record.students?.filter(s => s.status === 'absent').length || 0;
              
              return (
                <div key={record.id} className="bg-white rounded-xl shadow-lg p-4 sm:p-6 hover:shadow-xl transition-shadow border border-gray-100">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4">
                    <div className="mb-4 sm:mb-0">
                      <div className="flex items-center gap-2 mb-2">
                        <FaCalendarAlt className="h-5 w-5 text-indigo-600" />
                        <h3 className="text-xl font-semibold text-gray-800">
                          {record.title || 'Untitled Event'}
                        </h3>
                      </div>
                      <p className="text-gray-600 text-sm sm:text-base mb-1 flex items-center gap-2">
                        <span className="font-medium">Date:</span> {record.date}
                      </p>
                      <p className="text-gray-600 text-sm sm:text-base flex items-center gap-2">
                        <span className="font-medium">Created:</span>{' '}
                        {new Date(record.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteRecord(record.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm sm:text-base whitespace-nowrap"
                    >
                      <FaTrash className="h-4 w-4" />
                      Delete
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-4 mb-4 text-sm">
                    <span className="flex items-center gap-1 text-green-600 font-medium">
                      <FaCheckCircle className="h-4 w-4" />
                      Present: {presentCount}
                    </span>
                    <span className="flex items-center gap-1 text-red-600 font-medium">
                      <FaTimesCircle className="h-4 w-4" />
                      Absent: {absentCount}
                    </span>
                    <span className="flex items-center gap-1 text-gray-600 font-medium">
                      <FaUsers className="h-4 w-4" />
                      Total: {record.students?.length || 0}
                    </span>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-gray-700 mb-3 text-sm sm:text-base flex items-center gap-2">
                      <FaUsers className="h-4 w-4" />
                      Students:
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {record.students?.map((student, index) => (
                        <div
                          key={index}
                          className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
                            student.status === 'present'
                              ? 'bg-green-50 text-green-800 border border-green-200'
                              : 'bg-red-50 text-red-800 border border-red-200'
                          }`}
                        >
                          {student.status === 'present' ? (
                            <FaCheckCircle className="h-4 w-4 flex-shrink-0" />
                          ) : (
                            <FaTimesCircle className="h-4 w-4 flex-shrink-0" />
                          )}
                          <span className="font-medium">{student.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Student Management Modal */}
      {showStudentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end justify-center z-50">
          <div className="bg-white rounded-t-2xl shadow-2xl w-full h-[85vh] overflow-hidden flex flex-col">
            {/* Modal Header - Fixed at top */}
            <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <FaUsers className="h-3 w-3 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-800">Student Management</h3>
                  <div className="text-xs text-gray-500">{students.length} students</div>
                </div>
              </div>
              <button
                onClick={() => setShowStudentModal(false)}
                className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <FaTimes className="h-3 w-3 text-gray-600" />
              </button>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
              {/* Add Student Form */}
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-3">
                <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <div className="w-5 h-5 bg-green-100 rounded-lg flex items-center justify-center">
                    <FaUsers className="h-2 w-2 text-green-600" />
                  </div>
                  Add New Student
                </h4>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="Enter student name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                  />
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">Select Teams</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 bg-white rounded-lg border border-gray-200">
                      {groups.map(group => (
                        <label key={group} className="flex items-center gap-2 cursor-pointer hover:bg-indigo-50 p-2 rounded-lg transition-colors">
                          <input
                            type="checkbox"
                            checked={studentGroups.includes(group)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setStudentGroups([...studentGroups, group]);
                              } else {
                                setStudentGroups(studentGroups.filter(g => g !== group));
                              }
                            }}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-xs font-medium text-gray-700">{group}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={addStudentToDb}
                      className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg py-2 font-bold hover:from-green-600 hover:to-green-700 transition-all text-sm"
                    >
                      Add Student
                    </button>
                    <button
                      onClick={() => {
                        setStudentName('');
                        setStudentGroups([]);
                      }}
                      className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>

              {/* Search and Filter */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-3">
                <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <div className="w-5 h-5 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FaFilter className="h-2 w-2 text-blue-600" />
                  </div>
                  Search & Filter
                </h4>
                <div className="space-y-2">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      type="text"
                      value={searchInputValue}
                      onChange={(e) => {
                        const term = e.target.value;
                        setSearchInputValue(term);
                        
                        const lower = term.trim().toLowerCase();
                        if (!lower) {
                          setStudentSearch('');
                          setStudentSearchResults([]);
                        } else {
                          setStudentSearch(term);
                          const results = students.filter(s => s.nameLower.includes(lower));
                          setStudentSearchResults(results);
                        }
                      }}
                      placeholder="Search students..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    />
                    <button
                      onClick={() => {
                        setSearchInputValue('');
                        setStudentSearch('');
                        setStudentSearchResults([]);
                      }}
                      className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                    >
                      Clear
                    </button>
                  </div>
                  <select
                    value={groupFilter}
                    onChange={(e) => setGroupFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                  >
                    <option value="ALL">All Teams</option>
                    {groups.map(group => (
                      <option key={group} value={group}>{group}</option>
                    ))}
                  </select>
                  {studentSearchResults.length > 0 && (
                    <div className="text-xs p-2 bg-white rounded-lg border">
                      <p className="text-green-700 font-medium">✅ Found {studentSearchResults.length} match(es)</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Students List */}
              <div>
                <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <div className="w-5 h-5 bg-purple-100 rounded-lg flex items-center justify-center">
                    <FaUsers className="h-2 w-2 text-purple-600" />
                  </div>
                  Student List
                </h4>
                {students.length === 0 ? (
                  <div className="text-center py-6 bg-gray-50 rounded-lg">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                      <FaUsers className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="text-gray-600 font-medium text-sm">No students added yet</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {(studentSearch ? studentSearchResults : students)
                      .filter(s => groupFilter === 'ALL' || s.groups.includes(groupFilter))
                      .map((s) => (
                        <div key={s.id} className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-lg transition-all">
                          <div className="flex items-start justify-between mb-2">
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-gray-900 truncate text-sm">{s.name}</div>
                              <div className="text-xs text-gray-600 font-medium">
                                {s.groups.length === 1 ? s.groups[0] : `${s.groups.length} teams`}
                              </div>
                            </div>
                            <button
                              onClick={() => setDeleteConfirm(s)}
                              className="w-6 h-6 bg-red-100 rounded-lg flex items-center justify-center hover:bg-red-200 transition-colors"
                              title="Remove student"
                            >
                              <FaTimesCircle className="h-3 w-3 text-red-600" />
                            </button>
                          </div>
                          <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2">
                            {(() => {
                              const stat = studentStatsMap.get(s.nameLower);
                              if (!stat || stat.total === 0) {
                                return '📊 No attendance records yet';
                              }
                              const percent = Math.round((stat.present / stat.total) * 100);
                              return `📊 Attendance: ${percent}% (${stat.present}/${stat.total} present)`;
                            })()}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm mx-auto p-6 transform transition-all duration-300">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
                <FaTimesCircle className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Remove Student</h3>
              <div className="bg-red-50 rounded-2xl p-4 mb-6">
                <p className="text-gray-700 font-medium">
                  Are you sure you want to remove 
                  <span className="font-bold text-red-600 text-lg"> {deleteConfirm.name} </span>
                  from student list?
                </p>
                <p className="text-xs text-gray-500 mt-2">⚠️ This action cannot be undone</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    deleteStudentFromDb(deleteConfirm.id);
                    setDeleteConfirm(null);
                  }}
                  className="flex-1 bg-red-600 text-white rounded-2xl py-3 font-bold hover:bg-red-700 transition-all transform hover:scale-105 shadow-lg"
                >
                  Yes, Remove
                </button>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 bg-gray-200 text-gray-700 rounded-2xl py-3 font-bold hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
