import { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, User, Scissors } from 'lucide-react';
import '../styles/DashboardPages.css';
import '../styles/BookingCalendar.css';

function BookingCalendar() {
  const [viewMode, setViewMode] = useState('daily'); // daily, weekly
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCalendarData();
  }, [viewMode, currentDate]);

  const fetchCalendarData = async () => {
    setLoading(true);
    try {
      const dateString = currentDate.toISOString().split('T')[0];
      const res = await axios.get(`/api/calendar/${viewMode}?date=${dateString}`, { withCredentials: true });
      
      let fetchedAppointments = [];
      const responseData = res.data?.data;

      if (viewMode === 'daily') {
        fetchedAppointments = responseData?.allAppointments || [];
      } else if (viewMode === 'weekly') {
        if (responseData) {
          Object.values(responseData).forEach(dayData => {
            if (dayData && dayData.appointments) {
              fetchedAppointments = [...fetchedAppointments, ...dayData.appointments];
            }
          });
        }
      }

      // Map the backend structure to what the frontend expects
      const mappedAppointments = fetchedAppointments.map(app => ({
        ...app,
        time: app.timeSlot?.start || '',
        customer: { name: app.customerDetails?.name },
        service: { serviceName: app.serviceDetails?.serviceName },
        staff: { name: app.staffDetails?.name }
      }));

      setAppointments(mappedAppointments);
    } catch (error) {
      console.error("Error fetching calendar data:", error);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePrev = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'daily') newDate.setDate(newDate.getDate() - 1);
    if (viewMode === 'weekly') newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'daily') newDate.setDate(newDate.getDate() + 1);
    if (viewMode === 'weekly') newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const padZero = (num) => num.toString().padStart(2, '0');

  const renderDailyTimeSlots = () => {
    // Generate hours from 9 AM to 8 PM
    const hours = Array.from({ length: 12 }, (_, i) => i + 9); 
    
    return hours.map(hour => {
      const timeLabel = `${padZero(hour)}:00`;
      
      // Very basic filtering to see if an appointment falls in this hour
      // Backend should ideally return structured slots, but doing client-side sorting assuming plain array
      const hourApps = appointments.filter(app => {
        if(!app.time) return false;
        const appHour = parseInt(app.time.split(':')[0]);
        return appHour === hour;
      });

      return (
        <div key={hour} className="time-slot-row">
          <div className="time-label">{timeLabel}</div>
          <div className="slot-events">
            {hourApps.length > 0 ? (
              hourApps.map(app => (
                <div key={app._id} className={`calendar-event status-${app.status?.toLowerCase() || 'pending'}`}>
                  <div className="event-title"><User size={12}/> {app.customer?.name || 'Walk-in'}</div>
                  <div className="event-details"><Scissors size={12}/> {app.service?.serviceName || 'Service'} • {app.time}</div>
                  <div className="event-staff">with {app.staff?.name || 'Any'}</div>
                </div>
              ))
            ) : (
              <div className="empty-slot-marker"></div>
            )}
          </div>
        </div>
      );
    });
  };

  const getWeekDays = () => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay(); // 0(Sun) to 6(Sat)
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is sunday
    startOfWeek.setDate(diff);

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(d.getDate() + i);
      return d;
    });
  };

  const renderWeeklyGrid = () => {
    const weekDays = getWeekDays();
    const hours = Array.from({ length: 12 }, (_, i) => i + 9);

    return (
      <div className="weekly-grid">
        <div className="weekly-header">
          <div className="corner-cell">Time</div>
          {weekDays.map(date => (
            <div key={date.toISOString()} className={`day-header ${date.toDateString() === new Date().toDateString() ? 'today' : ''}`}>
              <span className="day-name">{date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
              <span className="day-number">{date.getDate()}</span>
            </div>
          ))}
        </div>
        
        <div className="weekly-body">
          {hours.map(hour => (
            <div key={hour} className="hour-row">
              <div className="time-label">{padZero(hour)}:00</div>
              {weekDays.map(date => {
                const dateStr = date.toISOString().split('T')[0];
                const cellApps = appointments.filter(app => {
                  if(!app.date || !app.time) return false;
                  const appDateStr = new Date(app.date).toISOString().split('T')[0];
                  const appHour = parseInt(app.time.split(':')[0]);
                  return appDateStr === dateStr && appHour === hour;
                });

                return (
                  <div key={`${dateStr}-${hour}`} className="grid-cell">
                    {cellApps.map(app => (
                      <div key={app._id} className={`mini-event status-${app.status?.toLowerCase() || 'pending'}`} title={`${app.customer?.name} - ${app.service?.serviceName} at ${app.time}`}>
                        <div className="mini-title">{app.customer?.name?.split(' ')[0]}</div>
                        <div className="mini-time">{app.time}</div>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="page-container">
      <div className="calendar-header">
        <div className="header-title">
          <h1 className="page-title"><CalendarIcon size={24} className="mr-2 inline"/> Booking Calendar</h1>
          <p className="page-subtitle">View and manage salon schedule</p>
        </div>
        
        <div className="calendar-controls">
          <div className="view-toggles">
            <button className={`toggle-btn ${viewMode === 'daily' ? 'active' : ''}`} onClick={() => setViewMode('daily')}>Daily</button>
            <button className={`toggle-btn ${viewMode === 'weekly' ? 'active' : ''}`} onClick={() => setViewMode('weekly')}>Weekly</button>
          </div>
          
          <div className="date-nav">
            <button className="nav-btn" onClick={handlePrev}><ChevronLeft size={20}/></button>
            <button className="today-btn" onClick={handleToday}>Today</button>
            <button className="nav-btn" onClick={handleNext}><ChevronRight size={20}/></button>
          </div>
        </div>
      </div>

      <div className="calendar-sub-header">
        <h2>
          {viewMode === 'daily' 
            ? currentDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
            : `Week of ${getWeekDays()[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${getWeekDays()[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
          }
        </h2>
        <div className="legend">
          <span className="legend-item"><span className="dot pending"></span> Pending</span>
          <span className="legend-item"><span className="dot confirmed"></span> Confirmed</span>
          <span className="legend-item"><span className="dot completed"></span> Completed</span>
        </div>
      </div>

      <div className="calendar-container">
        {loading ? (
          <div className="loading-state">Loading schedule...</div>
        ) : (
          viewMode === 'daily' ? (
            <div className="daily-view">
              {renderDailyTimeSlots()}
            </div>
          ) : (
            renderWeeklyGrid()
          )
        )}
      </div>
    </div>
  );
}

export default BookingCalendar;
