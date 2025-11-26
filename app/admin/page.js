'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, orderBy, deleteDoc, doc, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { 
  FaTrash, 
  FaSync, 
  FaCalendarAlt, 
  FaUsers, 
  FaCheckCircle, 
  FaTimesCircle,
  FaChartBar,
  FaFilter,
} from 'react-icons/fa';

export default function AdminPanel() {
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterDate, setFilterDate] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [studentGroup, setStudentGroup] = useState('GENERAL MEMBER');
  const [students, setStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentSearchResults, setStudentSearchResults] = useState([]);
  const [groupFilter, setGroupFilter] = useState('ALL');
  
  const groups = [
    'DISCIPLINE COMMITTEE',
    'TECH TEAM',
    'PR TEAM',
    'DESIGN TEAM',
    'CONTENT TEAM',
    'CULTURAL TEAM',
    'OFFICE BEARERS',
    'GENERAL MEMBER'
  ];
  const router = useRouter();

  useEffect(() => {
    // Check if admin is authenticated
    const authStatus = sessionStorage.getItem('adminAuthenticated');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
      fetchAttendanceRecords();
      fetchStudents();
    } else {
      router.push('/admin/login');
    }
  }, [router]);

  const fetchAttendanceRecords = async () => {
    setIsLoading(true);
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
      setIsLoading(false);
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
      const snap = await getDocs(collection(db, 'students'));
      const list = [];
      snap.forEach(d => {
        const data = d.data();
        list.push({ 
          id: d.id, 
          name: data.name, 
          nameLower: (data.nameLower || (data.name || '').toLowerCase()),
          group: data.group || 'GENERAL MEMBER'
        });
      });
      setStudents(list);
    } catch (e) {
      console.error('Error loading students', e);
    }
  };

  const addStudentToDb = async () => {
    const name = studentName.trim();
    if (!name) return;
    const duplicate = students.some(s => s.name.trim().toLowerCase() === name.toLowerCase());
    if (duplicate) {
      alert('Student with the same name already exists.');
      return;
    }
    if (!studentGroup) {
      alert('Please select a group for the student');
      return;
    }
    try {
      const nameLower = name.toLowerCase();
      const ref = await addDoc(collection(db, 'students'), { 
        name, 
        nameLower, 
        group: studentGroup 
      });
      setStudents([{ id: ref.id, name, nameLower, group: studentGroup }, ...students]);
      setStudentName('');
      setStudentGroup('GENERAL MEMBER');
    } catch (e) {
      console.error('Error adding student', e);
      alert('Failed to add student');
    }
  };

  const deleteStudentFromDb = async (id) => {
    try {
      await deleteDoc(doc(db, 'students', id));
      setStudents(students.filter(s => s.id !== id));
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

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 py-4 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-indigo-500 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-gray-600 text-sm font-medium mb-1 flex items-center gap-2">
                  <FaChartBar className="h-4 w-4" />
                  Total Records
                </h3>
                <p className="text-3xl sm:text-4xl font-bold text-indigo-600">
                  {filteredRecords.length}
                </p>
              </div>
              <div className="p-3 bg-indigo-100 rounded-lg">
                <FaChartBar className="h-6 w-6 text-indigo-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500 hover:shadow-xl transition-shadow">
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
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500 hover:shadow-xl transition-shadow">
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
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-amber-500 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-gray-600 text-sm font-medium mb-1 flex items-center gap-2">
                  Overall Attendance %
                </h3>
                <p className="text-3xl sm:text-4xl font-bold text-amber-600">
                  {overallPct}%
                </p>
              </div>
              <div className="p-3 bg-amber-100 rounded-lg">
                <FaChartBar className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Students Management */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <FaUsers className="h-5 w-5 text-indigo-600" />
            Manage Students
          </h2>
          {/* Search existing student */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Search Student</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => {
                  const term = e.target.value;
                  setStudentSearch(term);
                  const lower = term.trim().toLowerCase();
                  if (!lower) {
                    setStudentSearchResults([]);
                  } else {
                    setStudentSearchResults(
                      students.filter(s => s.nameLower.includes(lower))
                    );
                  }
                }}
                placeholder="Type a name to check if the student exists"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base"
              />
            </div>
            {studentSearch && (
              <div className="mt-2 text-sm">
                {studentSearchResults.length > 0 ? (
                  <p className="text-green-700">Found {studentSearchResults.length} match(es).</p>
                ) : (
                  <p className="text-red-600">No student found with that name.</p>
                )}
              </div>
            )}
          </div>
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Enter student name"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base"
              />
              <select
                value={studentGroup}
                onChange={(e) => setStudentGroup(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base"
              >
                {groups.map(group => (
                  <option key={group} value={group}>{group}</option>
                ))}
              </select>
              <button
                onClick={addStudentToDb}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm sm:text-base whitespace-nowrap"
              >
                Add Student
              </button>
            </div>
          </div>
          {students.length === 0 ? (
            <p className="text-gray-600 text-sm">No students added yet.</p>
          ) : (
            <>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Group</label>
                <select
                  value={groupFilter}
                  onChange={(e) => setGroupFilter(e.target.value)}
                  className="w-full sm:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base"
                >
                  <option value="ALL">All Groups</option>
                  {groups.map(group => (
                    <option key={group} value={group}>{group}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {(studentSearch ? studentSearchResults : students)
                .filter(s => groupFilter === 'ALL' || s.group === groupFilter)
                .map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border-l-4 border-indigo-200">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{s.name}</div>
                      <div className="text-xs text-gray-500">{s.group}</div>
                      <span className="block text-xs text-gray-500 mt-1">
                        {(() => {
                          const stat = studentStatsMap.get(s.nameLower);
                          if (!stat || stat.total === 0) {
                            return 'No attendance records yet';
                          }
                          const percent = Math.round((stat.present / stat.total) * 100);
                          return `Attendance: ${percent}% (${stat.present}/${stat.total} present)`;
                        })()}
                      </span>
                    </div>
                    <button
                      onClick={() => deleteStudentFromDb(s.id)}
                      className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                    >
                      <FaTimesCircle className="h-4 w-4" />
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        {/* Filter and Refresh */}
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
                disabled={isLoading}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm sm:text-base disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <FaSync className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>

        {/* Records List */}
        {isLoading ? (
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
    </div>
  );
}
