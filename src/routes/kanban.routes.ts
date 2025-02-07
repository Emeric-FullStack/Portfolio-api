import express from 'express';
import {
  createBoard,
  getUserBoards,
  getBoardById,
  updateBoard,
  deleteBoard,
  addMember,
  createList,
  createCard,
  getListsByBoardId,
  updateList,
  deleteList,
  updateCard,
  deleteCard,
  createComment,
  deleteComment,
  updateComment,
  getCommentsByCardId,
  deleteActivity,
  createActivity,
  getActivitiesByCardId,
  updateActivity,
  updateListPosition,
  createChecklist,
  getChecklistsByCardId,
  updateChecklist,
  deleteChecklist,
  createChecklistItem,
  deleteChecklistItem,
  toggleChecklistItem,
  updateCardPosition,
  moveCardToList,
} from '../controllers/kanban.controller';
import { authenticateUser } from '../middlewares/authMiddleware';

const router = express.Router();

router.post('/', authenticateUser, createBoard);
router.get('/', authenticateUser, getUserBoards);
router.get('/:id', authenticateUser, getBoardById);
router.put('/:id', authenticateUser, updateBoard);
router.delete('/:id', authenticateUser, deleteBoard);
router.post('/:id/members', authenticateUser, addMember);

// LIST
router.get('/boards/:boardId/lists', authenticateUser, getListsByBoardId);
router.post('/:id/lists', authenticateUser, createList);
router.put('/:boardId/lists/:listId', authenticateUser, updateList);
router.patch(
  '/:boardId/lists/:listId/position',
  authenticateUser,
  updateListPosition,
);
router.delete('/:boardId/lists/:listId', authenticateUser, deleteList);
router.post('/:id/lists/:listId/cards', authenticateUser, createCard);

// CARD
router.post('/:id/:listId/cards', authenticateUser, createCard);
router.put('/:id/cards/:cardId', authenticateUser, updateCard);
router.delete('/:id/cards/:cardId', authenticateUser, deleteCard);
router.post('/:id/cards/:cardId/comments', authenticateUser, createComment);
router.put(
  '/:id/cards/:cardId/comments/:commentId',
  authenticateUser,
  updateComment,
);
router.delete(
  '/:id/cards/:cardId/comments/:commentId',
  authenticateUser,
  deleteComment,
);
router.post('/:id/cards/:cardId/checklists', authenticateUser, createChecklist);
router.patch('/cards/:cardId/position', authenticateUser, updateCardPosition);
router.patch('/cards/:cardId/move-to-list', authenticateUser, moveCardToList);

// COMMENT
router.get(
  '/:id/cards/:cardId/comments',
  authenticateUser,
  getCommentsByCardId,
);

// ACTIVITY
router.post('/:id/cards/:cardId/activities', authenticateUser, createActivity);
router.get(
  '/:id/cards/:cardId/activities',
  authenticateUser,
  getActivitiesByCardId,
);
router.put(
  '/:id/cards/:cardId/activities/:activityId',
  authenticateUser,
  updateActivity,
);
router.delete(
  '/:id/cards/:cardId/activities/:activityId',
  authenticateUser,
  deleteActivity,
);

// CHECKLISTS
router.post('/cards/:cardId/checklists', authenticateUser, createChecklist);
router.get(
  '/cards/:cardId/checklists',
  authenticateUser,
  getChecklistsByCardId,
);
router.put('/checklists/:id', authenticateUser, updateChecklist);
router.delete('/checklists/:id', authenticateUser, deleteChecklist);

// CHECKLIST ITEMS
router.post(
  '/checklists/:checklistId/items',
  authenticateUser,
  createChecklistItem,
);
router.delete(
  '/checklists/:checklistId/items/:itemId',
  authenticateUser,
  deleteChecklistItem,
);
router.patch(
  '/checklists/:checklistId/items/:itemId/toggle',
  authenticateUser,
  toggleChecklistItem,
);

router.post('/cards/:cardId/comments', authenticateUser, createComment);

export default router;
