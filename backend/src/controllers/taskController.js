const mongoose = require('mongoose');
const Task = require('../models/Task');
const User = require('../models/User');
const { TASK_PRIORITIES, TASK_STATUSES } = require('../models/Task');
const { calculateTaskXP } = require('../utils/xpCalculator');
const { applyXpAndGamification } = require('../utils/gamification');

const formatValidationMessage = (error) => {
  if (error.name !== 'ValidationError' || !error.errors) {
    return error.message || 'Validation failed';
  }
  return Object.values(error.errors)
    .map((e) => e.message)
    .join('; ');
};

const parseOptionalDate = (value, fieldName) => {
  if (value === undefined || value === null || value === '') {
    return { ok: true, date: null };
  }
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) {
    return { ok: false, error: `${fieldName} must be a valid date` };
  }
  return { ok: true, date: d };
};

const startOfUtcDay = (date = new Date()) => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

const endOfUtcDay = (date = new Date()) => {
  const d = startOfUtcDay(date);
  d.setUTCDate(d.getUTCDate() + 1);
  return d;
};

const createTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, description, priority, dueDate, status } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ message: 'title is required' });
    }

    const taskData = {
      userId,
      title: title.trim(),
      description: typeof description === 'string' ? description.trim() : '',
    };

    if (priority !== undefined && priority !== null) {
      if (!TASK_PRIORITIES.includes(priority)) {
        return res.status(400).json({ message: 'Invalid priority' });
      }
      taskData.priority = priority;
    }

    if (status !== undefined && status !== null) {
      if (!TASK_STATUSES.includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }
      taskData.status = status;
    }

    const dueResult = parseOptionalDate(dueDate, 'dueDate');
    if (!dueResult.ok) {
      return res.status(400).json({ message: dueResult.error });
    }
    taskData.dueDate = dueResult.date;

    const task = await Task.create(taskData);
    return res.status(201).json(task);
  } catch (error) {
    console.error('Create task error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: formatValidationMessage(error) });
    }
    return res.status(500).json({ message: 'Server error while creating task' });
  }
};

const getMyTasks = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, today } = req.query;

    const filter = { userId };

    if (status && typeof status === 'string') {
      const s = status.trim();
      if (TASK_STATUSES.includes(s)) filter.status = s;
    }

    if (today === 'true' || today === '1') {
      filter.$or = [
        { dueDate: { $gte: startOfUtcDay(), $lt: endOfUtcDay() } },
        { dueDate: null, status: { $ne: 'completed' } },
      ];
    }

    const tasks = await Task.find(filter).sort({ dueDate: 1, createdAt: -1 });
    return res.status(200).json(tasks);
  } catch (error) {
    console.error('Get tasks error:', error);
    return res.status(500).json({ message: 'Server error while fetching tasks' });
  }
};

const getTaskById = async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.user.id });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    return res.status(200).json(task);
  } catch (error) {
    console.error('Get task error:', error);
    return res.status(500).json({ message: 'Server error while fetching task' });
  }
};

const updateTask = async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.user.id });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const { title, description, priority, dueDate, status } = req.body;

    if (title !== undefined) {
      if (typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({ message: 'title cannot be empty' });
      }
      task.title = title.trim();
    }

    if (description !== undefined) {
      task.description = typeof description === 'string' ? description.trim() : '';
    }

    if (priority !== undefined) {
      if (!TASK_PRIORITIES.includes(priority)) {
        return res.status(400).json({ message: 'Invalid priority' });
      }
      task.priority = priority;
    }

    if (dueDate !== undefined) {
      const dueResult = parseOptionalDate(dueDate, 'dueDate');
      if (!dueResult.ok) {
        return res.status(400).json({ message: dueResult.error });
      }
      task.dueDate = dueResult.date;
    }

    if (status !== undefined) {
      if (!TASK_STATUSES.includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }
      task.status = status;
      if (status === 'completed') {
        task.completedAt = new Date();
      } else {
        task.completedAt = null;
      }
    }

    await task.save();
    return res.status(200).json(task);
  } catch (error) {
    console.error('Update task error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: formatValidationMessage(error) });
    }
    return res.status(500).json({ message: 'Server error while updating task' });
  }
};

const completeTask = async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.user.id });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (task.status === 'completed') {
      return res.status(200).json({ task, xpEarned: 0, gamification: null });
    }

    task.status = 'completed';
    task.completedAt = new Date();
    await task.save();

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const xpEarned = calculateTaskXP();
    const gamification = await applyXpAndGamification(user, xpEarned);

    return res.status(200).json({
      task,
      xpEarned,
      gamification,
    });
  } catch (error) {
    console.error('Complete task error:', error);
    return res.status(500).json({ message: 'Server error while completing task' });
  }
};

const deleteTask = async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    return res.status(200).json({ message: 'Task deleted' });
  } catch (error) {
    console.error('Delete task error:', error);
    return res.status(500).json({ message: 'Server error while deleting task' });
  }
};

const getTaskStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const [total, pending, inProgress, completed] = await Promise.all([
      Task.countDocuments({ userId }),
      Task.countDocuments({ userId, status: 'pending' }),
      Task.countDocuments({ userId, status: 'in_progress' }),
      Task.countDocuments({ userId, status: 'completed' }),
    ]);

    const todayStart = startOfUtcDay();
    const todayEnd = endOfUtcDay();
    const dueToday = await Task.countDocuments({
      userId,
      status: { $ne: 'completed' },
      $or: [
        { dueDate: { $gte: todayStart, $lt: todayEnd } },
        { dueDate: null },
      ],
    });

    return res.status(200).json({
      total,
      pending,
      inProgress,
      completed,
      dueToday,
    });
  } catch (error) {
    console.error('Get task stats error:', error);
    return res.status(500).json({ message: 'Server error while fetching task stats' });
  }
};

module.exports = {
  createTask,
  getMyTasks,
  getTaskById,
  updateTask,
  completeTask,
  deleteTask,
  getTaskStats,
};
