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
  createdAt?: string;
  updatedAt?: string;
};

export type TaskStatsResponse = {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  dueToday: number;
};

export type CreateTaskBody = {
  title: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: string | null;
  status?: TaskStatus;
};

export type UpdateTaskBody = Partial<CreateTaskBody>;

export type CompleteTaskResponse = {
  task: TaskRecord;
  xpEarned: number;
  gamification: {
    newlyUnlockedAchievements: Array<{ id: string; title: string }>;
    character: {
      stage: number;
      stageName: string;
      emoji: string;
    };
  } | null;
};

export function getMyTasks(params?: { status?: TaskStatus; today?: boolean }): Promise<TaskRecord[]> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.today) qs.set('today', 'true');
  const q = qs.toString();
  return authGetJson<TaskRecord[]>(`/api/tasks${q ? `?${q}` : ''}`);
}

export function getTaskStats(): Promise<TaskStatsResponse> {
  return authGetJson<TaskStatsResponse>('/api/tasks/stats');
}

export function createTask(body: CreateTaskBody): Promise<TaskRecord> {
  return authPostJson<TaskRecord>('/api/tasks', body);
}

export function updateTask(id: string, body: UpdateTaskBody): Promise<TaskRecord> {
  return authPutJson<TaskRecord>(`/api/tasks/${id}`, body);
}

export function completeTask(id: string): Promise<CompleteTaskResponse> {
  return authPatchJson<CompleteTaskResponse>(`/api/tasks/${id}/complete`, {});
}

export function deleteTask(id: string): Promise<{ message: string }> {
  return authDeleteJson<{ message: string }>(`/api/tasks/${id}`);
}
