import { authDeleteJson, authGetJson, authPatchJson, authPostJson, authPutJson } from './http';

export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'pending' | 'in_progress' | 'completed';

export type TaskRecord = {
  _id: string;
  userId: string;
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate: string | null;
  status: TaskStatus;
  completedAt?: string | null;
};

export function getMyTasks(params?: { status?: TaskStatus; today?: boolean }): Promise<TaskRecord[]> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.today) qs.set('today', 'true');
  const q = qs.toString();
  return authGetJson<TaskRecord[]>(`/api/tasks${q ? `?${q}` : ''}`);
}

export function createTask(body: {
  title: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: string | null;
}): Promise<TaskRecord> {
  return authPostJson<TaskRecord>('/api/tasks', body);
}

export function updateTask(id: string, body: Record<string, unknown>): Promise<TaskRecord> {
  return authPutJson<TaskRecord>(`/api/tasks/${id}`, body);
}

export function completeTask(id: string): Promise<{ task: TaskRecord; xpEarned: number }> {
  return authPatchJson(`/api/tasks/${id}/complete`, {});
}

export function deleteTask(id: string): Promise<{ message: string }> {
  return authDeleteJson(`/api/tasks/${id}`);
}
