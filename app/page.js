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
  const [selectedDate, setSelectedDate] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
  }, []);

  const loadAllStudentsFromDb = async () => {
    setLoadingStudents(true);
    try {
      const snap = await getDocs(collection(db, 'students'));
      const currentStatusMap = new Map(
        students.map((student) => [(student.id || student.name).toString(), student.status ?? null])
      );

      const fromDb = snap.docs.map((doc) => {
        const data = doc.data();
        const key = doc.id;
        return {
          id: doc.id,
          name: data.name,
          status: currentStatusMap.get(key) ?? null
        };
      });
      setStudents(fromDb);
    } catch (error) {
      console.error('Failed to load students', error);
      alert('Failed to load students from admin list.');
    } finally {
      setLoadingStudents(false);
    }
  };

  const removeStudent = (id) => {
    setStudents((prev) => prev.filter((student) => student.id !== id));
  };

  const setStudentStatus = (id, status) => {
    setStudents((prev) =>
      prev.map((student) =>
        student.id === id ? { ...student, status } : student
      )
    );
  };

  const saveToFirestore = async () => {
    if (!selectedDate || !eventTitle.trim()) {
      alert('Please select a date and enter an event title');
      return;
    }

    if (students.length === 0) {
      alert('Please load at least one student');
      return;
    }

    if (students.some((student) => !student.status)) {
      alert('Please mark each student as present or absent before saving.');
      return;
    }

    setIsLoading(true);
    try {
      const attendanceData = {
        date: selectedDate,
        title: eventTitle.trim(),
        students,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'attendance'), attendanceData);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      setEventTitle('');
      setStudents([]);
    } catch (error) {
      console.error('Error saving attendance:', error);
      alert('Error saving attendance. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadPDF = () => {
    const pdfLink = 'https://drive.google.com/drive/folders/1PVZDGYp3TaKhZj_VJNH-KVdBQ6phnU3-';
    window.open(pdfLink, '_blank', 'noopener,noreferrer');
  };

  const presentCount = students.filter((s) => s.status === 'present').length;
  const absentCount = students.filter((s) => s.status === 'absent').length;
  const unmarkedCount = students.filter((s) => !s.status).length;

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
            Load the official student list from the Admin panel, then mark each student as present or absent. You can temporarily remove a student from today&apos;s session if necessary.
          </p>
          <button
            onClick={loadAllStudentsFromDb}
            disabled={loadingStudents}
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-sky-600 to-indigo-600 text-white rounded-lg hover:from-sky-700 hover:to-indigo-700 transition-all text-sm font-medium disabled:opacity-50"
          >
            {loadingStudents ? (
              <>
                <FaSpinner className="h-4 w-4 animate-spin" />
                Loading Students...
              </>
            ) : (
              <>
                <FaUsers className="h-4 w-4" />
                Load Students from Admin
              </>
            )}
          </button>
        </div>

        {/* Date and Title Section */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-6 border border-gray-100 hover:shadow-xl transition-shadow">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <FaEdit className="h-5 w-5 text-indigo-600" />
            Event Details
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <FaCalendarAlt className="h-4 w-4 text-indigo-600" />
                Select Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Title
              </label>
              <input
                type="text"
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                placeholder="Enter event title (e.g., Math Class, Meeting, etc.)"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base transition-all"
              />
            </div>
          </div>
        </div>

        {/* Students List */}
        {students.length > 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-6 border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <FaUsers className="h-5 w-5 text-indigo-600" />
                Students ({students.length})
              </h2>
              <div className="flex gap-3 text-sm flex-wrap">
                <span className="flex items-center gap-1 text-green-600 font-medium bg-green-50 px-3 py-1 rounded-lg">
                  <FaCheckCircle className="h-4 w-4" />
                  Present: {presentCount}
                </span>
                <span className="flex items-center gap-1 text-red-600 font-medium bg-red-50 px-3 py-1 rounded-lg">
                  <FaTimesCircle className="h-4 w-4" />
                  Absent: {absentCount}
                </span>
                {unmarkedCount > 0 && (
                  <span className="flex items-center gap-1 text-amber-600 font-medium bg-amber-50 px-3 py-1 rounded-lg">
                    <FaUsers className="h-4 w-4" />
                    Unmarked: {unmarkedCount}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              {students.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg hover:from-gray-100 hover:to-gray-200 transition-all border border-gray-200"
                >
                  <div className="flex items-center gap-3 flex-1">
                    {student.status === 'present' ? (
                      <FaCheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    ) : student.status === 'absent' ? (
                      <FaTimesCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                    ) : (
                      <FaUsers className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    )}
                    <span className="text-gray-800 font-medium text-sm sm:text-base">
                      {student.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setStudentStatus(student.id, 'present')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm sm:text-base transition-all shadow-md hover:shadow-lg ${
                        student.status === 'present'
                          ? 'bg-green-600 text-white'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      <FaCheckCircle className="h-4 w-4" />
                      Present
                    </button>
                    <button
                      onClick={() => setStudentStatus(student.id, 'absent')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm sm:text-base transition-all shadow-md hover:shadow-lg ${
                        student.status === 'absent'
                          ? 'bg-red-600 text-white'
                          : 'bg-red-100 text-red-700 hover:bg-red-200'
                      }`}
                    >
                      <FaTimesCircle className="h-4 w-4" />
                      Absent
                    </button>
                    <button
                      onClick={() => removeStudent(student.id)}
                      className="flex items-center gap-1 px-3 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-all text-sm sm:text-base shadow-md hover:shadow-lg"
                    >
                      <FaTrash className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-dashed border-gray-200 text-center text-gray-500">
            No students loaded yet. Click &ldquo;Load Students from Admin&rdquo; to begin.
          </div>
        )}

        {/* Save Button */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-6 border border-gray-100">
          <button
            onClick={saveToFirestore}
            disabled={
              isLoading ||
              !selectedDate ||
              !eventTitle.trim() ||
              students.length === 0 ||
              unmarkedCount > 0
            }
            className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-lg font-semibold text-white transition-all text-sm sm:text-base shadow-lg hover:shadow-xl ${
              isLoading ||
              !selectedDate ||
              !eventTitle.trim() ||
              students.length === 0 ||
              unmarkedCount > 0
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'
            }`}
          >
            {isLoading ? (
              <>
                <FaSpinner className="h-5 w-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <FaSave className="h-5 w-5" />
                Save Attendance
              </>
            )}
          </button>
          {unmarkedCount > 0 && (
            <p className="mt-2 text-sm text-amber-600 text-center">
              Mark every student present or absent to enable saving.
            </p>
          )}
          {saved && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-center gap-2">
              <FaCheck className="h-5 w-5 text-green-600" />
              <p className="text-green-600 text-sm sm:text-base font-medium">
                Attendance saved successfully!
              </p>
            </div>
          )}
        </div>

        {/* PDF Download Button */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100">
          <button
            onClick={downloadPDF}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all font-semibold text-sm sm:text-base shadow-lg hover:shadow-xl"
          >
            <FaFilePdf className="h-5 w-5" />
            Download PDF
          </button>
        </div>

        {/* Policy Card */}
        <div className="mt-6 bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-amber-200">
          <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-2">
            Attendance Policy
          </h3>
          <p className="text-sm text-gray-700">
            At least <span className="font-semibold text-indigo-700">75% attendance</span> is mandatory to remain eligible. Please ensure attendance is recorded accurately for every session.
          </p>
        </div>
      </div>
    </div>
  );
}
