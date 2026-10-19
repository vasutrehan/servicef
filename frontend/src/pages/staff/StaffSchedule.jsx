import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock3, LoaderCircle, MapPin } from "lucide-react";
import api from "../../lib/api";

function dayKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unscheduled";
  return date.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export default function StaffSchedule() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const response = await api.get("/service-requests/my-tasks");
        const active = (response.data.tasks || []).filter(
          (task) => task.status !== "cancelled"
        );
        setTasks(active);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load schedule.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const grouped = useMemo(() => {
    const map = new Map();
    [...tasks]
      .sort(
        (a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt)
      )
      .forEach((task) => {
        const key = dayKey(task.scheduledAt);
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(task);
      });
    return [...map.entries()];
  }, [tasks]);

  return (
    <div className="my-tasks-page">
      <div className="tasks-heading">
        <div>
          <p className="staff-eyebrow">YOUR WORKSPACE</p>
          <h1>My Schedule</h1>
          <p className="staff-subtitle">
            Upcoming appointments grouped by day.
          </p>
        </div>
        <div className="tasks-heading-icon">
          <CalendarDays size={23} />
        </div>
      </div>

      {loading ? (
        <div className="tasks-empty">
          <LoaderCircle size={28} className="staff-login-spinner" />
          <h3>Loading schedule</h3>
        </div>
      ) : error ? (
        <div className="tasks-empty">
          <CalendarDays size={28} />
          <h3>Couldn&apos;t load schedule</h3>
          <p>{error}</p>
        </div>
      ) : grouped.length === 0 ? (
        <div className="tasks-empty">
          <CalendarDays size={28} />
          <h3>No appointments</h3>
          <p>Assigned jobs will show up here by date.</p>
        </div>
      ) : (
        <div className="schedule-list">
          {grouped.map(([day, dayTasks]) => (
            <section key={day} className="schedule-day">
              <h2>{day}</h2>
              {dayTasks.map((task) => (
                <article className="task-card" key={task._id}>
                  <div className="task-card-top">
                    <div>
                      <span className="task-id">
                        {String(task._id).slice(-6).toUpperCase()}
                      </span>
                      <h3>{task.serviceType}</h3>
                    </div>
                    <span className={`task-status status-${task.status}`}>
                      {task.status}
                    </span>
                  </div>
                  <div className="task-detail">
                    <Clock3 size={17} />
                    <span>{formatTime(task.scheduledAt)}</span>
                  </div>
                  <div className="task-detail">
                    <MapPin size={17} />
                    <span>{task.address}</span>
                  </div>
                </article>
              ))}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
