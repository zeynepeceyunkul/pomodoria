const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const {
  createTask,
  getMyTasks,
  getTaskById,
  updateTask,
  completeTask,
  deleteTask,
  getTaskStats,
} = require('../controllers/taskController');

const router = express.Router();

router.use(authMiddleware);

router.get('/stats', getTaskStats);
router.get('/', getMyTasks);
router.post('/', createTask);
router.get('/:id', getTaskById);
router.put('/:id', updateTask);
router.patch('/:id/complete', completeTask);
router.delete('/:id', deleteTask);

module.exports = router;
