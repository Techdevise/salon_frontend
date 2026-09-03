import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, User, Scissors, AlertCircle, Store } from 'lucide-react';
import '../styles/DashboardPages.css';
import '../styles/BookingCalendar.css';
import { useSelector, useDispatch } from 'react-redux';
import { setSelectedSalon } from '../redux/slices/salonSlice';
import { format24Hour } from './Appointments';

function BookingCalendar() {
  const { user } = useSelector((state) => state.auth);
  const { selectedSalonId, salons } = useSelector((state) => state.salon);
  const dispatch = useDispatch();

  const [viewMode, setViewMode] = useState('daily'); // daily | weekly | monthly
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ── helpers ────────────────────────────────────────────────────────────────
  const toDateStr = (d) => d.toISOString().split('T')[0];

  const getWeekDays = (base = currentDate) => {
    const start = new Date(base);
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Mon–Sun
    start.setDate(start.getDate() + diff);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  };

  const getMonthDays = (base = currentDate) => {
    const year = base.getFullYear();
    const month = base.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // pad with prev-month days so calendar starts on Monday
    const startPad = (firstDay.getDay() + 6) % 7;
    const days = [];
    for (let i = startPad; i > 0; i--) {
      const d = new Date(firstDay);
      d.setDate(d.getDate() - i);
      days.push({ date: d, currentMonth: false });
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push({ date: new Date(year, month, d), currentMonth: true });
    }
    // pad end so grid is always 6 weeks
    while (days.length % 7 !== 0) {
      const last = days[days.length - 1].date;
      const next = new Date(last);
      next.setDate(next.getDate() + 1);
      days.push({ date: next, currentMonth: false });
    }
    return days;
  };

  // ── fetch ──────────────────────────────────────────────────────────────────
  const fetchForDate = useCallback(async (dateStr) => {
    const token = localStorage.getItem('token');
    const salonParam = selectedSalonId ? `&salonId=${selectedSalonId}` : '';
    const res = await axios.get(
      `/api/appointment/date?date=${dateStr}${salonParam}`,
      { withCredentials: true, headers: { Authorization: `Bearer ${token}` } }
    );
    const activeAppointments = (res.data.data || []).filter(
      (apt) => (apt.status || '').toLowerCase() !== 'cancelled' && (apt.status || '').toLowerCase() !== 'canceled'
    );
    return activeAppointments.map((apt) => {
      const lower = (apt.status || '').toLowerCase();
      const normStatus = lower === 'completed'
        ? 'Completed'
        : lower === 'confirmed'
        ? 'Confirmed'
        : apt.status
        ? apt.status.charAt(0).toUpperCase() + apt.status.slice(1).toLowerCase()
        : apt.paymentStatus === 'Paid'
        ? 'Completed'
        : 'Pending';

      return {
        _id: apt._id,
        date: apt.date,
        time: apt.timeSlot?.start || '',
        status: normStatus,
        totalAmount: apt.totalAmount || 0,
        customer: { name: apt.customerDetails?.name || 'Walk-in' },
        service: { serviceName: apt.serviceDetails?.[0]?.serviceName || 'Service' },
        staff: { name: apt.staffDetails?.name || 'Unassigned' },
        paymentStatus: apt.paymentStatus || 'Unpaid',
      };
    });
  }, [selectedSalonId]);

  const fetchCalendarData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (viewMode === 'daily') {
        const data = await fetchForDate(toDateStr(currentDate));
        setAppointments(data);
      } else if (viewMode === 'weekly') {
        const weekDays = getWeekDays();
        const results = await Promise.all(weekDays.map((d) => fetchForDate(toDateStr(d))));
        setAppointments(results.flat());
      } else {
        // monthly: fetch the whole month week-by-week
        const days = getMonthDays();
        const uniqueDates = [...new Set(days.map((d) => toDateStr(d.date)))];
        const results = await Promise.all(uniqueDates.map((ds) => fetchForDate(ds)));
        setAppointments(results.flat());
      }
    } catch (err) {
      console.error('Calendar fetch error:', err);
      setError('Failed to load appointments. Please check your connection and try again.');
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, currentDate, selectedSalonId]);

  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);

  // ── navigation ─────────────────────────────────────────────────────────────
  const handlePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'daily') d.setDate(d.getDate() - 1);
    else if (viewMode === 'weekly') d.setDate(d.getDate() - 7);
    else d.setMonth(d.getMonth() - 1);
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'daily') d.setDate(d.getDate() + 1);
    else if (viewMode === 'weekly') d.setDate(d.getDate() + 7);
    else d.setMonth(d.getMonth() + 1);
    setCurrentDate(d);
  };

  const padZero = (n) => n.toString().padStart(2, '0');

  // ── status helpers ─────────────────────────────────────────────────────────
  const statusClass = (s) => {
    switch ((s || '').toLowerCase()) {
      case 'confirmed': return 'confirmed';
      case 'completed': return 'completed';
      case 'cancelled': return 'cancelled';
      default:          return 'pending';
    }
  };

  const statusLabel = (s) => {
    switch ((s || '').toLowerCase()) {
      case 'confirmed': return '✓ Confirmed';
      case 'completed': return '✔ Completed';
      case 'cancelled': return '✕ Cancelled';
      default:          return '⏳ Pending';
    }
  };

  // ── DAILY VIEW ─────────────────────────────────────────────────────────────
  const renderDailyView = () => {
    const hours = Array.from({ length: 13 }, (_, i) => i + 8); // 08:00 – 20:00
    return (
      <div className="daily-view">
        {hours.map((hour) => {
          const hourApps = appointments.filter((a) => {
            if (!a.time) return false;
            // handle both "HH:MM" and "HH:MM AM/PM"
            const raw = a.time.split(' ')[0];
            let h = parseInt(raw.split(':')[0]);
            if (a.time.includes('PM') && h !== 12) h += 12;
            if (a.time.includes('AM') && h === 12) h = 0;
            return h === hour;
          });

          return (
            <div key={hour} className="time-slot-row">
              <div className="time-label">
                {padZero(hour)}:00
              </div>
              <div className="slot-events">
                {hourApps.length > 0 ? (
                  hourApps.map((apt) => (
                    <div key={apt._id} className={`calendar-event status-${statusClass(apt.status)}`}>
                      <div className="event-title">
                        <User size={13} /> {apt.customer?.name}
                        <span className={`event-status-badge status-${statusClass(apt.status)}`}>
                          {statusLabel(apt.status)}
                        </span>
                      </div>
                      <div className="event-details">
                        <Scissors size={12} /> {apt.service?.serviceName}
                        <Clock size={12} style={{ marginLeft: 8 }} /> {format24Hour(apt.time)}
                      </div>
                      <div className="event-staff">👤 {apt.staff?.name} &nbsp;|&nbsp; ₹{apt.totalAmount}</div>
                    </div>
                  ))
                ) : (
                  <div className="empty-slot-marker" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ── WEEKLY VIEW ────────────────────────────────────────────────────────────
  const renderWeeklyView = () => {
    const weekDays = getWeekDays();
    const hours = Array.from({ length: 13 }, (_, i) => i + 8);

    return (
      <div className="weekly-grid">
        {/* Header row */}
        <div className="weekly-header">
          <div className="corner-cell">Time</div>
          {weekDays.map((date) => (
            <div
              key={toDateStr(date)}
              className={`day-header ${toDateStr(date) === toDateStr(new Date()) ? 'today' : ''}`}
            >
              <span className="day-name">{date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
              <span className="day-number">{date.getDate()}</span>
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="weekly-body">
          {hours.map((hour) => (
            <div key={hour} className="hour-row">
              <div className="time-label">
                {padZero(hour)}:00
              </div>
              {weekDays.map((date) => {
                const dateStr = toDateStr(date);
                const cellApps = appointments.filter((a) => {
                  if (!a.date || !a.time) return false;
                  const appDate = toDateStr(new Date(a.date));
                  const raw = a.time.split(' ')[0];
                  let h = parseInt(raw.split(':')[0]);
                  if (a.time.includes('PM') && h !== 12) h += 12;
                  if (a.time.includes('AM') && h === 12) h = 0;
                  return appDate === dateStr && h === hour;
                });

                return (
                  <div key={`${dateStr}-${hour}`} className="grid-cell">
                    {cellApps.map((apt) => (
                      <div
                        key={apt._id}
                        className={`mini-event status-${statusClass(apt.status)}`}
                        title={`${apt.customer?.name} — ${apt.service?.serviceName} — ${format24Hour(apt.time)} — ${apt.status}`}
                      >
                        <div className="mini-title">{apt.customer?.name?.split(' ')[0]}</div>
                        <div className="mini-time">{format24Hour(apt.time)}</div>
                        <div className="mini-status">{apt.status}</div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ── MONTHLY VIEW ───────────────────────────────────────────────────────────
  const renderMonthlyView = () => {
    const days = getMonthDays();
    const weekLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return (
      <div className="monthly-grid">
        {/* Weekday headers */}
        <div className="month-week-headers">
          {weekLabels.map((d) => <div key={d} className="month-week-label">{d}</div>)}
        </div>

        {/* Day cells */}
        <div className="month-days">
          {days.map(({ date, currentMonth }) => {
            const dateStr = toDateStr(date);
            const isToday = dateStr === toDateStr(new Date());
            const dayApts = appointments.filter((a) => {
              if (!a.date) return false;
              return toDateStr(new Date(a.date)) === dateStr;
            });

            // Group by status for dot display
            const statusCounts = { pending: 0, confirmed: 0, completed: 0, cancelled: 0 };
            dayApts.forEach((a) => {
              const s = (a.status || 'pending').toLowerCase();
              if (s in statusCounts) statusCounts[s]++;
            });

            return (
              <div
                key={dateStr}
                className={`month-day-cell ${!currentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}`}
              >
                <span className={`month-day-number ${isToday ? 'today-number' : ''}`}>
                  {date.getDate()}
                </span>

                {/* Status dots */}
                <div className="month-day-dots">
                  {statusCounts.pending > 0 && (
                    <span className="month-status-dot pending" title={`${statusCounts.pending} Pending`} />
                  )}
                  {statusCounts.confirmed > 0 && (
                    <span className="month-status-dot confirmed" title={`${statusCounts.confirmed} Confirmed`} />
                  )}
                  {statusCounts.completed > 0 && (
                    <span className="month-status-dot completed" title={`${statusCounts.completed} Completed`} />
                  )}
                  {statusCounts.cancelled > 0 && (
                    <span className="month-status-dot cancelled" title={`${statusCounts.cancelled} Cancelled`} />
                  )}
                </div>

                {/* Mini event pills (show up to 3) */}
                <div className="month-day-events">
                  {dayApts.slice(0, 3).map((apt) => (
                    <div
                      key={apt._id}
                      className={`month-mini-event status-${statusClass(apt.status)}`}
                      title={`${apt.customer?.name} — ${apt.service?.serviceName} — ${apt.time} — ${apt.status}`}
                    >
                      {apt.time && <span>{apt.time} </span>}
                      {apt.customer?.name?.split(' ')[0]}
                    </div>
                  ))}
                  {dayApts.length > 3 && (
                    <div className="month-more-badge">+{dayApts.length - 3} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── header label ───────────────────────────────────────────────────────────
  const headerLabel = () => {
    if (viewMode === 'daily') {
      return currentDate.toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      });
    }
    if (viewMode === 'weekly') {
      const week = getWeekDays();
      return `${week[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${week[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="page-container">
      {/* ── Page header ── */}
      <div className="calendar-header">
        <div className="header-title">
          <h1 className="page-title">
            <CalendarIcon size={24} className="mr-2 inline" /> Booking Calendar
          </h1>
          <p className="page-subtitle">View and manage salon schedule</p>
        </div>

        <div className="calendar-controls">

          <div className="view-toggles">
            {['daily', 'weekly', 'monthly'].map((m) => (
              <button
                key={m}
                className={`toggle-btn ${viewMode === m ? 'active' : ''}`}
                onClick={() => setViewMode(m)}
              >
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>

          <div className="date-nav">
            <button className="nav-btn" onClick={handlePrev}><ChevronLeft size={20} /></button>
            <button className="today-btn" onClick={() => setCurrentDate(new Date())}>Today</button>
            <button className="nav-btn" onClick={handleNext}><ChevronRight size={20} /></button>
          </div>
        </div>
      </div>

      {/* ── Sub-header ── */}
      <div className="calendar-sub-header">
        <h2>{headerLabel()}</h2>
        <div className="legend">
          <span className="legend-item"><span className="dot pending" /> Pending</span>
          <span className="legend-item"><span className="dot confirmed" /> Confirmed</span>
          <span className="legend-item"><span className="dot completed" /> Completed</span>
          <span className="legend-item"><span className="dot cancelled" /> Cancelled</span>
        </div>
      </div>

      {/* ── Calendar body ── */}
      <div className="calendar-container">
        {error && (
          <div className="error-banner" style={{ margin: '16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}
        {loading ? (
          <div className="loading-state">Loading schedule...</div>
        ) : (
          <>
            {viewMode === 'daily' && renderDailyView()}
            {viewMode === 'weekly' && renderWeeklyView()}
            {viewMode === 'monthly' && renderMonthlyView()}
          </>
        )}
      </div>
    </div>
  );
}

export default BookingCalendar;
