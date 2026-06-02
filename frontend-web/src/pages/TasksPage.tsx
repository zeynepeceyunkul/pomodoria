import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { AuthHttpError } from '../api/http';
import {
  completeTask,
  createTask,
  deleteTask,
  getMyTasks,
  updateTask,
} from '../api/tasks';
import type { TaskPriority, TaskRecord, TaskStatus } from '../api/tasks';
import type { AppOutletContext } from '../layout/outletContext';
import styles from './TasksPage.module.css';

const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high'];
const STATUSES: TaskStatus[] = ['pending', 'in_progress', 'completed'];

function priorityLabel(p: TaskPriority): string {
  return p.charAt(0).toUpperCase() + p.slice(1);
}

function formatDue(d: string | null): string {
  if (!d) return 'No due date';
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function TasksPage() {
  const navigate = useNavigate();
  const { me, loadingProfile, refreshMe } = useOutletContext<AppOutletContext>();

  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [filter, setFilter] = useState<'all' | TaskStatus>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await getMyTasks(filter === 'all' ? undefined : { status: filter });
      setTasks(list);
    } catch (e) {
      if (e instanceof AuthHttpError && e.status === 401) {
        navigate('/login', { replace: true });
        return;
      }
      setError(e instanceof Error ? e.message : 'Could not load tasks.');
    } finally {
      setLoading(false);
    }
  }, [filter, navigate]);

  useEffect(() => {
    if (loadingProfile || !me) return;
    void loadTasks();
  }, [me, loadingProfile, loadTasks]);

  function resetForm() {
    setTitle('');
    setDescription('');
    setPriority('medium');
    setDueDate('');
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(task: TaskRecord) {
    setEditingId(task._id);
    setTitle(task.title);
    setDescription(task.description);
    setPriority(task.priority);
    setDueDate(task.dueDate ? task.dueDate.slice(0, 10) : '');
    setShowForm(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const body = {
        title: title.trim(),
        description: description.trim(),
        priority,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      };
      if (editingId) {
        await updateTask(editingId, body);
      } else {
        await createTask(body);
      }
      resetForm();
      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save task.');
    } finally {
      setSaving(false);
    }
  }

  async function handleComplete(id: string) {
    try {
      await completeTask(id);
      await Promise.all([loadTasks(), refreshMe()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not complete task.');
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this task?')) return;
    try {
      await deleteTask(id);
      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete task.');
    }
  }

  async function handleStatusChange(id: string, status: TaskStatus) {
    try {
      if (status === 'completed') {
        await handleComplete(id);
        return;
      }
      await updateTask(id, { status });
      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update task.');
    }
  }

  if (loadingProfile || !me) {
    return <div className={styles.loading}>Loading tasks…</div>;
  }

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Tasks</h1>
          <p className={styles.subtitle}>Manage your work and earn XP when you complete tasks.</p>
        </div>
        <button type="button" className={styles.addBtn} onClick={() => { resetForm(); setShowForm(true); }}>
          + New Task
        </button>
      </header>

      <div className={styles.filters}>
        {(['all', ...STATUSES] as const).map((f) => (
          <button
            key={f}
            type="button"
            className={filter === f ? styles.filterActive : styles.filterBtn}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : f.replace('_', ' ')}
          </button>
        ))}
      </div>

      {error ? <p className={styles.error} role="alert">{error}</p> : null}

      {showForm ? (
        <form className={styles.form} onSubmit={handleSubmit}>
          <h2 className={styles.formTitle}>{editingId ? 'Edit Task' : 'New Task'}</h2>
          <label className={styles.label}>
            Title
            <input className={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} />
          </label>
          <label className={styles.label}>
            Description
            <textarea className={styles.textarea} value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={2000} />
          </label>
          <div className={styles.formRow}>
            <label className={styles.label}>
              Priority
              <select className={styles.input} value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{priorityLabel(p)}</option>
                ))}
              </select>
            </label>
            <label className={styles.label}>
              Due date
              <input className={styles.input} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </label>
          </div>
          <div className={styles.formActions}>
            <button type="button" className={styles.cancelBtn} onClick={resetForm}>Cancel</button>
            <button type="submit" className={styles.saveBtn} disabled={saving}>
              {saving ? 'Saving…' : editingId ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      ) : null}

      {loading ? (
        <div className={styles.loading}>Loading tasks…</div>
      ) : tasks.length === 0 ? (
        <div className={styles.empty}>No tasks yet. Create one to get started!</div>
      ) : (
        <ul className={styles.list}>
          {tasks.map((task) => (
            <li key={task._id} className={styles.item}>
              <div className={styles.itemMain}>
                <p className={styles.itemTitle}>{task.title}</p>
                {task.description ? <p className={styles.itemDesc}>{task.description}</p> : null}
                <div className={styles.meta}>
                  <span className={`${styles.badge} ${styles[`priority_${task.priority}`]}`}>{priorityLabel(task.priority)}</span>
                  <span className={styles.badge}>{task.status.replace('_', ' ')}</span>
                  <span className={styles.due}>{formatDue(task.dueDate)}</span>
                </div>
              </div>
              <div className={styles.itemActions}>
                {task.status !== 'completed' ? (
                  <>
                    <select
                      className={styles.statusSelect}
                      value={task.status}
                      onChange={(e) => void handleStatusChange(task._id, e.target.value as TaskStatus)}
                    >
                      {STATUSES.filter((s) => s !== 'completed').map((s) => (
                        <option key={s} value={s}>{s.replace('_', ' ')}</option>
                      ))}
                      <option value="completed">completed</option>
                    </select>
                    <button type="button" className={styles.completeBtn} onClick={() => void handleComplete(task._id)}>
                      Complete (+30 XP)
                    </button>
                  </>
                ) : null}
                <button type="button" className={styles.editBtn} onClick={() => startEdit(task)}>Edit</button>
                <button type="button" className={styles.deleteBtn} onClick={() => void handleDelete(task._id)}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
