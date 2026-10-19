import { useEffect, useMemo, useState } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, LoaderCircle, RefreshCw, Users } from "lucide-react";
import api from "../../lib/api";
import { getInitials } from "../../lib/auth";

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAll = async () => {
    setLoading(true);
    setError("");
    try {
      const [tasksRes, staffRes] = await Promise.all([
        api.get("/service-requests"),
        api.get("/staff"),
      ]);
      setTasks(tasksRes.data.serviceRequests || []);
      setStaff(staffRes.data.staff || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load calendar data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const goToMonth = (offset) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();
    
    const days = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const tasksByDateAndStaff = useMemo(() => {
    const grouped = {};
    tasks.forEach(task => {
      if (!task.scheduledAt || !task.assignedTo) return;
      
      const taskDate = new Date(task.scheduledAt);
      // Use local date instead of UTC to avoid timezone issues
      const localYear = taskDate.getFullYear();
      const localMonth = String(taskDate.getMonth() + 1).padStart(2, '0');
      const localDay = String(taskDate.getDate()).padStart(2, '0');
      const dateKey = `${localYear}-${localMonth}-${localDay}`;
      const staffId = task.assignedTo._id || task.assignedTo;
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = {};
      }
      if (!grouped[dateKey][staffId]) {
        grouped[dateKey][staffId] = [];
      }
      grouped[dateKey][staffId].push(task);
    });
    return grouped;
  }, [tasks]);

  const activeStaff = useMemo(() => staff.filter(s => s.isActive !== false), [staff]);

  const days = getDaysInMonth(currentDate);
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getTaskCountForDay = (date) => {
    if (!date) return 0;
    const localYear = date.getFullYear();
    const localMonth = String(date.getMonth() + 1).padStart(2, '0');
    const localDay = String(date.getDate()).padStart(2, '0');
    const dateKey = `${localYear}-${localMonth}-${localDay}`;
    const dayTasks = tasksByDateAndStaff[dateKey];
    if (!dayTasks) return 0;
    return Object.values(dayTasks).reduce((sum, tasks) => sum + tasks.length, 0);
  };

  const getStaffTasksForDay = (date, staffId) => {
    if (!date) return [];
    const localYear = date.getFullYear();
    const localMonth = String(date.getMonth() + 1).padStart(2, '0');
    const localDay = String(date.getDate()).padStart(2, '0');
    const dateKey = `${localYear}-${localMonth}-${localDay}`;
    return tasksByDateAndStaff[dateKey]?.[staffId] || [];
  };

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  return (
    <div className="workspace-page">
      <div className="welcome-row">
        <div>
          <div className="eyebrow">SCHEDULE</div>
          <h1>Team calendar</h1>
          <p className="page-subtitle">
            View technician assignments and workload by day.
          </p>
        </div>
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <div className="panel-kicker">CALENDAR VIEW</div>
            <h2>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
          </div>
          <div className="calendar-controls">
            <button className="button button-secondary button-small" onClick={goToToday}>
              Today
            </button>
            <button className="button button-secondary button-small" onClick={() => goToMonth(-1)}>
              <ChevronLeft size={14} />
            </button>
            <button className="button button-secondary button-small" onClick={() => goToMonth(1)}>
              <ChevronRight size={14} />
            </button>
            <button className="button button-secondary button-small" onClick={loadAll}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="workspace-empty">
            <LoaderCircle size={28} className="staff-login-spinner" />
            <p>Loading calendar…</p>
          </div>
        ) : error ? (
          <div className="workspace-empty">
            <CalendarIcon size={28} />
            <p>{error}</p>
          </div>
        ) : (
          <div className="calendar-container">
            <div className="calendar-header">
              {dayNames.map(day => (
                <div key={day} className="calendar-day-header">{day}</div>
              ))}
            </div>
            <div className="calendar-grid">
              {days.map((date, index) => (
                <div
                  key={index}
                  className={`calendar-day ${!date ? 'calendar-day-empty' : ''} ${isToday(date) ? 'calendar-day-today' : ''}`}
                >
                  {date && (
                    <>
                      <div className="calendar-day-number">{date.getDate()}</div>
                      <div className="calendar-day-tasks">
                        {activeStaff.length === 0 ? (
                          <div className="calendar-empty-message">No staff members</div>
                        ) : (
                          activeStaff.map(member => {
                            const staffTasks = getStaffTasksForDay(date, member._id);
                            if (staffTasks.length === 0) return null;
                            return (
                              <div key={member._id} className="calendar-staff-tasks">
                                <div className="calendar-staff-avatar">
                                  {getInitials(member.name)}
                                </div>
                                <div className="calendar-staff-info">
                                  <span className="calendar-staff-name">{member.name}</span>
                                  <span className="calendar-task-count">{staffTasks.length} task{staffTasks.length !== 1 ? 's' : ''}</span>
                                </div>
                              </div>
                            );
                          })
                        )}
                        {getTaskCountForDay(date) === 0 && (
                          <div className="calendar-no-tasks">No tasks</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <div className="panel-kicker">TEAM LEGEND</div>
            <h2>Technicians</h2>
          </div>
        </div>
        <div className="team-legend">
          {activeStaff.length === 0 ? (
            <p className="muted-text">No active staff members. Create staff accounts in the Team page.</p>
          ) : (
            activeStaff.map(member => (
              <div key={member._id} className="team-legend-item">
                <div className="calendar-staff-avatar">{getInitials(member.name)}</div>
                <span>{member.name}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
