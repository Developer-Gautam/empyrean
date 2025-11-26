'use client';

import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  FaCalendarAlt,
  FaEdit,
  FaUsers,
  FaCheckCircle,
  FaTimesCircle,
  FaTrash,
  FaSave,
  FaFilePdf,
  FaCheck,
  FaSpinner
} from 'react-icons/fa';

export default function Home() {
  // -------------------- State --------------------
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
  const [isLoading, setIsLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // -------------------- Effects --------------------
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
  }, []);

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

  // -------------------- Load Students --------------------
  const loadAllStudentsFromDb = async () => {
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

  // -------------------- Mutations --------------------
  const removeStudent = (id) => {
    const updated = students.filter((s) => s.id !== id);
    setStudents(updated);
    setGroups(groupStudents(updated));
  };

  const setStudentStatus = (id, status) => {
    const updated = students.map((s) => (s.id === id ? { ...s, status } : s));
    setStudents(updated);
    setGroups(groupStudents(updated));
  };

  // -------------------- Save Attendance --------------------
  const saveToFirestore = async () => {
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

    setIsLoading(true);
    try {
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
    } catch (err) {
      console.error('Save error', err);
      alert('Failed to save attendance.');
    } finally {
      setIsLoading(false);
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
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-4 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Load Students */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-6 border border-gray-100 hover:shadow-xl transition-shadow">
          <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <FaUsers className="h-5 w-5 text-indigo-600" />
            Attendance Roster
          </h2>
          <p className="text-sm text-gray-600 mb-3">
            Load the official student list from the Admin panel, then mark each student as present or absent.
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
                <FaUsers className="h-4 w-4" /> Load Students from Admin
              </>
            )}
          </button>
        </div>

        {/* Date & Title */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-6 border border-gray-100 hover:shadow-xl transition-shadow">
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
        {students.length > 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-6 border border-gray-100 hover:shadow-xl transition-shadow">
            {/* Stats */}
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
                {unmarkedCount > 0 && (
                  <span className="flex items-center gap-1 text-amber-600 font-medium bg-amber-50 px-3 py-1 rounded-lg">
                    <FaUsers className="h-4 w-4" /> Unmarked: {unmarkedCount}
                  </span>
                )}
              </div>
            </div>

            {/* List */}
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
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-6 border border-dashed border-gray-200 text-center text-gray-500">
            No students loaded yet. Click “Load Students from Admin” to begin.
          </div>
        )}

        {/* Save */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-6 border border-gray-100">
          <button
            onClick={saveToFirestore}
            disabled={isLoading || !selectedDate || !eventTitle.trim() || students.length === 0 || unmarkedCount > 0}
            className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-lg font-semibold text-white transition-all text-sm shadow-lg ${isLoading || !selectedDate || !eventTitle.trim() || students.length === 0 || unmarkedCount > 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'}`}
          >
            {isLoading ? <><FaSpinner className="h-5 w-5 animate-spin" /> Saving...</> : <><FaSave className="h-5 w-5" /> Save Attendance</>}
          </button>
          {saved && <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-center gap-2"><FaCheck className="h-5 w-5 text-green-600" /><p className="text-green-600 text-sm font-medium">Attendance saved!</p></div>}
        </div>

        {/* PDF */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100">
          <button onClick={downloadPDF} className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold text-sm shadow-lg"><FaFilePdf className="h-5 w-5" /> Download PDF</button>
        </div>
      </div>
    </div>
  );
}

