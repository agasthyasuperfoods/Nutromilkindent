import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

function Dattendancemain() {
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchAttendance(selectedDate);
    }
  }, [selectedDate]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/deliveryboys/list');
      if (!res.ok) throw new Error('Failed to load employees');
      const data = await res.json();
      setEmployees(data.employees || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load employees',
        confirmButtonColor: '#FBBF24',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async (date) => {
    try {
      const res = await fetch(`/api/attendance/get?date=${date}`);
      if (!res.ok) {
        setAttendance({});
        setIsReadOnly(false);
        return;
      }
      
      const data = await res.json();
      const attendanceMap = {};
      let hasData = false;
      
      data.attendance.forEach(record => {
        attendanceMap[record.employeeid] = {
          status: record.status,
        };
        hasData = true;
      });
      
      setAttendance(attendanceMap);
      setIsReadOnly(hasData);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      setAttendance({});
      setIsReadOnly(false);
    }
  };

  const handleStatusChange = (employeeId, status) => {
    if (isReadOnly) {
      Swal.fire({
        icon: 'info',
        title: 'Readonly Mode',
        text: 'Attendance for this date is already submitted. Change the date to mark new attendance.',
        confirmButtonColor: '#FBBF24',
      });
      return;
    }

    setAttendance(prev => ({
      ...prev,
      [employeeId]: {
        status,
      }
    }));
  };

  const handleSubmitAll = async () => {
    if (isReadOnly) {
      Swal.fire({
        icon: 'info',
        title: 'Already Submitted',
        text: 'Attendance for this date is already submitted.',
        confirmButtonColor: '#FBBF24',
      });
      return;
    }

    const hasMarkedAttendance = Object.values(attendance).some(a => a && a.status);
    if (!hasMarkedAttendance) {
      Swal.fire({
        icon: 'warning',
        title: 'No Attendance Marked',
        text: 'Please mark at least one attendance status',
        confirmButtonColor: '#FBBF24',
      });
      return;
    }

    const result = await Swal.fire({
      title: 'Submit Attendance?',
      text: 'Once submitted, attendance will be saved to the database.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Submit',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#FBBF24',
      cancelButtonColor: '#6B7280',
    });

    if (!result.isConfirmed) return;

    setSubmitting(true);

    try {
      const promises = employees.map(emp => {
        const empAttendance = attendance[emp.id];
        if (empAttendance && empAttendance.status) {
          return fetch('/api/attendance/mark', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              employeeId: emp.id,
              name: emp.name,
              status: empAttendance.status,
              review: '',
              date: selectedDate,
            }),
          });
        }
        return null;
      }).filter(Boolean);

      await Promise.all(promises);

      Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: `Attendance for ${new Date(selectedDate).toLocaleDateString()} submitted successfully`,
        confirmButtonColor: '#FBBF24',
      });

      setIsReadOnly(true);
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to submit attendance',
        confirmButtonColor: '#EF4444',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDateChange = (newDate) => {
    setSelectedDate(newDate);
    setIsReadOnly(false);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'present':
      case 'p':
        return 'border-green-600 bg-green-600 text-white';
      case 'absent':
      case 'a':
        return 'border-red-600 bg-red-600 text-white';
      default:
        return 'border-gray-300 text-gray-700 hover:bg-gray-50';
    }
  };

  return (
    <>
      <Head>
        <title>Mark Attendance • Delivery Boys</title>
        <meta name="description" content="Mark daily attendance for delivery boys" />
      </Head>

      <div className="min-h-screen bg-gray-50 p-4 md:p-8 pb-24">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Mark Attendance</h1>
            <p className="text-gray-600">Mark daily attendance for delivery boys</p>
          </div>

          {/* Date Picker */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <label htmlFor="date" className="block text-sm font-semibold text-gray-900 mb-2">
                  Select Date
                </label>
                <input
                  type="date"
                  id="date"
                  value={selectedDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none focus:border-[#FBBF24] transition-colors"
                />
              </div>
              <button
                onClick={() => handleDateChange(new Date().toISOString().split('T')[0])}
                className="mt-7 px-4 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors outline-none"
              >
                Today
              </button>
            </div>

            {isReadOnly && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>📅 Readonly Mode:</strong> Attendance for <strong>{new Date(selectedDate).toLocaleDateString()}</strong> has been submitted. Change the date to mark new attendance.
                </p>
              </div>
            )}
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#FBBF24]"></div>
              <p className="mt-2 text-gray-600">Loading employees...</p>
            </div>
          )}

          {/* Employee List */}
          {!loading && employees.length === 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <p className="text-gray-500 text-lg">No delivery boys found</p>
            </div>
          )}

          {!loading && employees.length > 0 && (
            <>
              <div className="space-y-4 mb-6">
                {employees.map((emp) => {
                  const empAttendance = attendance[emp.id] || { status: '' };
                  return (
                    <div key={emp.id} className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 transition-opacity ${isReadOnly ? 'opacity-60' : ''}`}>
                      <div className="mb-4">
                        <h3 className="font-semibold text-gray-900 text-lg">{emp.name}</h3>
                        <p className="text-sm text-gray-600">{emp.designation}</p>
                        {emp.area && <p className="text-xs text-gray-500 mt-1">Area: {emp.area}</p>}
                      </div>

                      {/* Status Buttons - Present/Absent Only */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                          Attendance Status
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => handleStatusChange(emp.id, 'present')}
                            className={`p-4 rounded-lg border-2 font-medium transition-all outline-none ${
                              empAttendance.status === 'present'
                                ? 'border-green-600 bg-green-600 text-white shadow-md'
                                : 'border-gray-300 text-gray-700 hover:border-green-600 hover:bg-green-50'
                            } ${isReadOnly ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                          >
                            ✓ Present
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(emp.id, 'absent')}
                            className={`p-4 rounded-lg border-2 font-medium transition-all outline-none ${
                              empAttendance.status === 'absent'
                                ? 'border-red-600 bg-red-600 text-white shadow-md'
                                : 'border-gray-300 text-gray-700 hover:border-red-600 hover:bg-red-50'
                            } ${isReadOnly ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                          >
                            ✗ Absent
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Submit All Button */}
              <button
                onClick={handleSubmitAll}
                disabled={submitting || isReadOnly}
                className={`w-full py-4 px-6 rounded-lg font-semibold transition-colors outline-none ${
                  isReadOnly
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : submitting
                    ? 'bg-yellow-400 text-gray-900 cursor-wait'
                    : 'bg-[#FBBF24] text-gray-900 hover:bg-yellow-500'
                }`}
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
                    Submitting...
                  </span>
                ) : isReadOnly ? (
                  '✓ Attendance Already Submitted'
                ) : (
                  'Submit All Attendance'
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default Dattendancemain;
