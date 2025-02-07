import { RequestHandler } from 'express';
import { Board } from '../models/kanban/Board.model';
import { User } from '../models/User.model';
import { List } from '../models/kanban/List.model';
import { Card } from '../models/kanban/Card.model';
import { Activity } from '../models/kanban/Activity.model';
import { Schema, Types } from 'mongoose';
import { Comment } from '../models/kanban/Comment.model';
import { Checklist } from '../models/kanban/Checklist.model';

export const createBoard: RequestHandler = async (req, res): Promise<void> => {
  try {
    const { title, description } = req.body;
    if (!req.user) {
      res.status(401).json({ message: 'Utilisateur non authentifié' });
      return;
    }
    const userId = req.user.id;

    if (!title) {
      res.status(400).json({ message: 'Le titre est requis' });
      return;
    }

    const newBoard = new Board({
      title,
      description,
      owner: userId,
      members: [userId],
    });

    await newBoard.save();

    res.status(201).json(newBoard);
    return;
  } catch (error) {
    console.error('Erreur lors de la création du tableau :', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
    return;
  }
};

export const getUserBoards: RequestHandler = async (
  req,
  res,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Utilisateur non authentifié' });
      return;
    }
    const userId = req.user.id;

    const boards = await Board.find({ members: userId });

    res.status(200).json(boards);
    return;
  } catch (error) {
    console.error('Erreur lors de la récupération des tableaux :', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
    return;
  }
};

export const getBoardById: RequestHandler = async (req, res): Promise<void> => {
  try {
    console.log('getBoardById', req.params.id);
    console.log('User:', req.user);

    const boardId = req.params.id;
    if (!req.user) {
      res.status(401).json({ message: 'Utilisateur non authentifié' });
      return;
    }
    const userId = req.user.id;

    const board = await Board.findById(boardId);
    if (!board) {
      res.status(404).json({ message: 'Tableau non trouvé' });
      return;
    }

    console.log('Board members:', board.members);
    console.log('User ID:', userId);
    console.log('Is member:', board.members.includes(userId));

    const isMember = board.members.some((memberId) =>
      (memberId as unknown as Types.ObjectId).equals(userId),
    );

    if (!isMember) {
      res.status(403).json({ message: 'Accès refusé' });
      return;
    }

    const populatedBoard = await Board.findById(boardId).populate(
      'members',
      'username email',
    );

    res.status(200).json(populatedBoard);
    return;
  } catch (error) {
    console.error('Erreur lors de la récupération du tableau :', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
    return;
  }
};

export const updateBoard: RequestHandler = async (req, res): Promise<void> => {
  try {
    const boardId = req.params.id;
    if (!req.user) {
      res.status(401).json({ message: 'Utilisateur non authentifié' });
      return;
    }
    const userId = req.user.id;
    const { title, description } = req.body;

    const board = await Board.findById(boardId);

    if (!board) {
      res.status(404).json({ message: 'Tableau non trouvé' });
      return;
    }

    if ((board.owner as unknown as Types.ObjectId).equals(userId)) {
      res.status(403).json({ message: 'Accès refusé' });
      return;
    }

    if (title) board.title = title;
    if (description) board.description = description;

    await board.save();

    res.status(200).json(board);
    return;
  } catch (error) {
    console.error('Erreur lors de la mise à jour du tableau :', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
    return;
  }
};

export const deleteBoard: RequestHandler = async (req, res): Promise<void> => {
  try {
    const boardId = req.params.id;
    if (!req.user) {
      res.status(401).json({ message: 'Utilisateur non authentifié' });
      return;
    }
    const userId = req.user.id;

    const board = await Board.findById(boardId);

    if (!board) {
      res.status(404).json({ message: 'Tableau non trouvé' });
      return;
    }
    if ((board.owner as unknown as Types.ObjectId).equals(userId)) {
      res.status(403).json({ message: 'Accès refusé' });
      return;
    }

    // Supprimer les listes et cartes associées
    await List.deleteMany({ board: boardId });
    await Card.deleteMany({ board: boardId });
    await Activity.deleteMany({ board: boardId });

    await board.deleteOne();

    res.status(200).json({ message: 'Tableau supprimé avec succès' });
    return;
  } catch (error) {
    console.error('Erreur lors de la suppression du tableau :', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
    return;
  }
};

export const addMember: RequestHandler = async (req, res): Promise<void> => {
  try {
    const boardId = req.params.id;
    if (!req.user) {
      res.status(401).json({ message: 'Utilisateur non authentifié' });
      return;
    }
    const userId = req.user.id;
    const { memberEmail } = req.body;

    const board = await Board.findById(boardId);

    if (!board) {
      res.status(404).json({ message: 'Tableau non trouvé' });
      return;
    }

    if ((board.owner as unknown as Types.ObjectId).equals(userId)) {
      res.status(403).json({ message: 'Accès refusé' });
      return;
    }

    const member = await User.findOne({ email: memberEmail });

    if (!member) {
      res.status(404).json({ message: 'Utilisateur non trouvé' });
      return;
    }

    if (
      board.members.includes(member._id as unknown as Schema.Types.ObjectId)
    ) {
      res.status(400).json({ message: "L'utilisateur est déjà membre" });
      return;
    }

    board.members.push(member._id as unknown as Schema.Types.ObjectId);
    await board.save();

    res.status(200).json({ message: 'Membre ajouté avec succès', board });
    return;
  } catch (error) {
    console.error("Erreur lors de l'ajout d'un membre :", error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
    return;
  }
};

// LIST
export const createList: RequestHandler = async (req, res): Promise<void> => {
  try {
    const { title, boardId } = req.body;
    if (!req.user) {
      res.status(401).json({ message: 'Utilisateur non authentifié' });
      return;
    }
    if (!title || !boardId) {
      res.status(400).json({ message: 'Titre et ID du tableau requis' });
      return;
    }

    const newList = new List({
      title,
      board: boardId,
      position: 0,
    });

    await newList.save();

    res.status(201).json(newList);
    return;
  } catch (error) {
    console.error('Erreur lors de la création de la liste :', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
    return;
  }
};

export const deleteList: RequestHandler = async (req, res): Promise<void> => {
  try {
    const listId = req.params.listId;
    console.log('listId', listId);
    const list = await List.findById(listId);
    if (!list) {
      res.status(404).json({ message: 'Liste non trouvée' });
      return;
    }
    await list.deleteOne();

    res.status(200).json({ message: 'Liste supprimée avec succès' });
    return;
  } catch (error) {
    console.error('Erreur lors de la suppression de la liste :', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
    return;
  }
};

export const updateList: RequestHandler = async (req, res): Promise<void> => {
  try {
    const listId = req.params.listId;
    const { title, position } = req.body;

    const list = await List.findById(listId);
    if (!list) {
      res.status(404).json({ message: 'Liste non trouvée' });
      return;
    }

    if (title !== undefined) list.title = title;
    if (position !== undefined) list.position = position;

    await list.save();
    res.status(200).json(list);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la liste :', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};

export const getListsByBoardId: RequestHandler = async (
  req,
  res,
): Promise<void> => {
  try {
    const boardId = req.params.boardId;
    const lists = await List.find({ board: boardId })
      .populate({
        path: 'cards',
        populate: [
          {
            path: 'checklists',
            model: 'Checklist',
          },
          {
            path: 'comments',
            model: 'Comment',
            populate: {
              path: 'user',
              model: 'User',
              select: 'firstName lastName avatar',
            },
          },
        ],
      })
      .sort({ position: 1 });

    res.status(200).json(lists);
  } catch (error) {
    console.error('Erreur lors de la récupération des listes :', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};

export const updateListPosition: RequestHandler = async (
  req,
  res,
): Promise<void> => {
  try {
    const { boardId, listId } = req.params;
    const { position: newPosition } = req.body;

    let lists = await List.find({ board: boardId }).sort('position');

    const draggedList = lists.find((list) => list._id.toString() === listId);
    if (!draggedList) {
      res.status(404).json({ message: 'Liste non trouvée' });
      return;
    }

    lists = lists.filter((list) => list._id.toString() !== listId);

    lists.splice(newPosition, 0, draggedList);

    const updates = lists.map((list, index) => {
      return List.findByIdAndUpdate(
        list._id,
        { position: index },
        { new: true },
      );
    });

    await Promise.all(updates);

    const updatedLists = await List.find({ board: boardId })
      .populate({
        path: 'cards',
        options: { sort: { position: 1 } },
        populate: {
          path: 'checklists',
          model: 'Checklist',
        },
      })
      .sort('position');

    res.status(200).json(updatedLists);
  } catch (error) {
    console.error('Erreur lors de la mise à jour des positions :', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};

// CARD

export const createCard: RequestHandler = async (req, res): Promise<void> => {
  try {
    const { title, listId, boardId, description } = req.body;
    console.log('Création de carte:', { title, listId, boardId });

    if (!title || !listId || !boardId) {
      res
        .status(400)
        .json({ message: 'Titre, ID de la liste et du tableau requis' });
      return;
    }

    const newCard = new Card({
      title,
      listId,
      boardId,
      description,
      position: 0,
    });

    const savedCard = await newCard.save();
    console.log('Carte créée:', savedCard);

    // Ajouter la carte à la liste
    const list = await List.findById(listId);
    if (list) {
      list.cards = list.cards || [];
      list.cards.push(new Types.ObjectId(savedCard._id));
      await list.save();
    }

    res.status(201).json(savedCard);
    return;
  } catch (error) {
    console.error('Erreur lors de la création de la carte:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};

export const deleteCard: RequestHandler = async (req, res): Promise<void> => {
  try {
    const cardId = req.params.id;
    const card = await Card.findById(cardId);
    if (!card) {
      res.status(404).json({ message: 'Carte non trouvée' });
      return;
    }
    await card.deleteOne();
    res.status(200).json({ message: 'Carte supprimée avec succès' });
    return;
  } catch (error) {
    console.error('Erreur lors de la suppression de la carte :', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
    return;
  }
};

export const updateCard: RequestHandler = async (req, res): Promise<void> => {
  try {
    const cardId = req.params.cardId;
    const { title, listId, boardId, position, description, priority } =
      req.body;
    console.log('Mise à jour de la carte:', { cardId, title, description });

    const card = await Card.findById(cardId);
    if (!card) {
      res.status(404).json({ message: 'Carte non trouvée' });
      return;
    }

    // Mise à jour des champs
    card.title = title;
    card.listId = listId;
    card.boardId = boardId;
    card.position = position;
    card.description = description;
    card.priority = priority;

    const updatedCard = await card.save();
    console.log('Carte mise à jour:', updatedCard);

    res.status(200).json(updatedCard);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la carte:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};

export const updateCardPosition: RequestHandler = async (
  req,
  res,
): Promise<void> => {
  try {
    const { cardId } = req.params;
    const { position: newPosition, listId } = req.body;

    let cards = await Card.find({ listId }).sort('position');

    const draggedCard = cards.find((card) => card._id.toString() === cardId);
    if (!draggedCard) {
      res.status(404).json({ message: 'Carte non trouvée' });
      return;
    }

    cards = cards.filter((card) => card._id.toString() !== cardId);

    cards.splice(newPosition, 0, draggedCard);

    const updates = cards.map((card, index) => {
      return Card.findByIdAndUpdate(
        card._id,
        { position: index },
        { new: true },
      );
    });

    await Promise.all(updates);

    const updatedList = await List.findById(listId).populate({
      path: 'cards',
      options: { sort: { position: 1 } },
    });

    res.status(200).json(updatedList);
  } catch (error) {
    console.error('Erreur lors de la mise à jour des positions:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};

export const createActivity: RequestHandler = async (
  req,
  res,
): Promise<void> => {
  try {
    const { boardId, action } = req.body;
    if (!req.user) {
      res.status(401).json({ message: 'Utilisateur non authentifié' });
      return;
    }
    const newActivity = new Activity({
      board: boardId,
      user: req.user.id,
      action,
      createdAt: new Date(),
    });
    await newActivity.save();
    res.status(201).json(newActivity);
    return;
  } catch (error) {
    console.error("Erreur lors de la création de l'activité :", error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
    return;
  }
};

export const getActivitiesByBoardId: RequestHandler = async (
  req,
  res,
): Promise<void> => {
  try {
    const boardId = req.params.id;
    const activities = await Activity.find({ board: boardId });
    if (!activities) {
      res.status(404).json({ message: 'Activités non trouvées' });
      return;
    }
    res.status(200).json(activities);
    return;
  } catch (error) {
    console.error('Erreur lors de la récupération des activités :', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
    return;
  }
};

export const updateActivity: RequestHandler = async (
  req,
  res,
): Promise<void> => {
  try {
    const activityId = req.params.id;
    const { action } = req.body;
    const activity = await Activity.findById(activityId);
    if (!activity) {
      res.status(404).json({ message: 'Activité non trouvée' });
      return;
    }
    activity.action = action;
    await activity.save();
    res.status(200).json(activity);
    return;
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'activité :", error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
    return;
  }
};

export const deleteActivity: RequestHandler = async (
  req,
  res,
): Promise<void> => {
  try {
    const activityId = req.params.id;
    const activity = await Activity.findById(activityId);
    if (!activity) {
      res.status(404).json({ message: 'Activité non trouvée' });
      return;
    }
    await activity.deleteOne();
    res.status(200).json({ message: 'Activité supprimée avec succès' });
    return;
  } catch (error) {
    console.error("Erreur lors de la suppression de l'activité :", error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
    return;
  }
};

export const getActivitiesByCardId: RequestHandler = async (
  req,
  res,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Utilisateur non authentifié' });
      return;
    }
    const cardId = req.params.id;
    const activities = await Activity.find({ card: cardId });
    res.status(200).json(activities);
    return;
  } catch (error) {
    console.error('Erreur lors de la récupération des activités :', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
    return;
  }
};

export const createComment: RequestHandler = async (
  req,
  res,
): Promise<void> => {
  try {
    const { cardId } = req.params;
    const { text } = req.body;
    if (!req.user) {
      res.status(401).json({ message: 'Utilisateur non authentifié' });
      return;
    }

    const card = await Card.findById(cardId);
    if (!card) {
      res.status(404).json({ message: 'Carte non trouvée' });
      return;
    }

    const newComment = new Comment({
      _id: new Types.ObjectId(),
      text,
      card: cardId,
      user: req.user.id,
      createdAt: new Date(),
    });

    const savedComment = await newComment.save();

    // Ajouter le commentaire à la carte
    card.comments = card.comments || [];
    card.comments.push(savedComment._id);
    await card.save();

    // Retourner le commentaire avec les infos de l'utilisateur
    const populatedComment = await Comment.findById(savedComment._id).populate(
      'user',
      'firstName lastName avatar',
    );

    res.status(201).json(populatedComment);
  } catch (error) {
    console.error('Erreur lors de la création du commentaire:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};

export const deleteComment: RequestHandler = async (
  req,
  res,
): Promise<void> => {
  try {
    const commentId = req.params.id;
    const comment = await Comment.findById(commentId);
    if (!comment) {
      res.status(404).json({ message: 'Commentaire non trouvé' });
      return;
    }
    await comment.deleteOne();
    res.status(200).json({ message: 'Commentaire supprimé avec succès' });
    return;
  } catch (error) {
    console.error('Erreur lors de la suppression du commentaire :', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
    return;
  }
};

export const updateComment: RequestHandler = async (
  req,
  res,
): Promise<void> => {
  try {
    const commentId = req.params.id;
    const { text } = req.body;
    const comment = await Comment.findById(commentId);
    if (!comment) {
      res.status(404).json({ message: 'Commentaire non trouvé' });
      return;
    }
    comment.text = text;
    await comment.save();
    res.status(200).json(comment);
    return;
  } catch (error) {
    console.error('Erreur lors de la mise à jour du commentaire :', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
    return;
  }
};

export const getCommentsByCardId: RequestHandler = async (
  req,
  res,
): Promise<void> => {
  try {
    const cardId = req.params.id;
    const comments = await Comment.find({ card: cardId });
    res.status(200).json(comments);
    return;
  } catch (error) {
    console.error('Erreur lors de la récupération des commentaires :', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
    return;
  }
};

// CHECKLIST

export const createChecklist: RequestHandler = async (
  req,
  res,
): Promise<void> => {
  try {
    const { cardId, title } = req.body;

    const card = await Card.findById(cardId);
    if (!card) {
      res.status(404).json({ message: 'Carte non trouvée' });
      return;
    }

    const newChecklist = new Checklist({
      title,
      cardId,
      card: cardId,
      board: card.boardId,
      list: card.listId,
      position: 0,
      items: [],
      isCompleted: false,
    });

    const savedChecklist = await newChecklist.save();

    // Ajouter la checklist à la carte
    card.checklists = card.checklists || [];
    card.checklists.push(new Types.ObjectId(savedChecklist._id));
    await card.save();

    res.status(201).json(savedChecklist);
    return;
  } catch (error) {
    console.error('Erreur lors de la création de la checklist :', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
    return;
  }
};

export const getChecklistsByCardId: RequestHandler = async (
  req,
  res,
): Promise<void> => {
  try {
    const cardId = req.params.id;
    const checklists = await Checklist.find({ card: cardId });
    res.status(200).json(checklists);
    return;
  } catch (error) {
    console.error('Erreur lors de la récupération des checklists :', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
    return;
  }
};

export const updateChecklist: RequestHandler = async (
  req,
  res,
): Promise<void> => {
  try {
    const checklistId = req.params.id;
    const { title, isCompleted } = req.body;

    const checklist = await Checklist.findById(checklistId);
    if (!checklist) {
      res.status(404).json({ message: 'Checklist non trouvée' });
      return;
    }

    checklist.title = title;
    checklist.isCompleted = isCompleted;
    await checklist.save();
    res.status(200).json(checklist);
    return;
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la checklist :', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
    return;
  }
};

export const deleteChecklist: RequestHandler = async (
  req,
  res,
): Promise<void> => {
  try {
    const checklistId = req.params.id;
    const checklist = await Checklist.findById(checklistId);
    if (!checklist) {
      res.status(404).json({ message: 'Checklist non trouvée' });
      return;
    }
    await checklist.deleteOne();
    res.status(200).json({ message: 'Checklist supprimée avec succès' });
    return;
  } catch (error) {
    console.error('Erreur lors de la suppression de la checklist :', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
    return;
  }
};

export const createChecklistItem: RequestHandler = async (
  req,
  res,
): Promise<void> => {
  try {
    const checklistId = req.params.checklistId;
    const { text } = req.body;

    const checklist = await Checklist.findById(checklistId);
    if (!checklist) {
      res.status(404).json({ message: 'Checklist non trouvée' });
      return;
    }

    const newItem = {
      text,
      isCompleted: false,
      position: checklist.items.length,
    };

    checklist.items.push(newItem);
    const updatedChecklist = await checklist.save();

    console.log('Item ajouté à la checklist:', updatedChecklist);
    res.status(201).json(updatedChecklist);
    return;
  } catch (error) {
    console.error("Erreur lors de la création de l'item :", error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
    return;
  }
};

export const deleteChecklistItem: RequestHandler = async (
  req,
  res,
): Promise<void> => {
  try {
    const { checklistId, itemId } = req.params;

    const checklist = await Checklist.findById(checklistId);
    if (!checklist) {
      res.status(404).json({ message: 'Checklist non trouvée' });
      return;
    }

    checklist.items = checklist.items.filter(
      (item) => item._id && item._id.toString() !== itemId,
    );
    const updatedChecklist = await checklist.save();

    res.status(200).json(updatedChecklist);
    return;
  } catch (error) {
    console.error("Erreur lors de la suppression de l'item :", error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
    return;
  }
};

export const toggleChecklistItem: RequestHandler = async (
  req,
  res,
): Promise<void> => {
  try {
    const { checklistId, itemId } = req.params;

    const checklist = await Checklist.findById(checklistId);
    if (!checklist) {
      res.status(404).json({ message: 'Checklist non trouvée' });
      return;
    }

    const item = checklist.items.find(
      (item) => item._id && item._id.toString() === itemId,
    );
    if (!item) {
      res.status(404).json({ message: 'Item non trouvé' });
      return;
    }

    item.isCompleted = !item.isCompleted;
    const updatedChecklist = await checklist.save();

    res.status(200).json(updatedChecklist);
    return;
  } catch (error) {
    console.error("Erreur lors du basculement de l'item :", error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
    return;
  }
};

export const moveCardToList: RequestHandler = async (
  req,
  res,
): Promise<void> => {
  try {
    const { cardId } = req.params;
    const { newListId, position } = req.body;

    // 1. Trouver la carte et vérifier son existence
    const card = await Card.findById(cardId);
    if (!card) {
      res.status(404).json({ message: 'Carte non trouvée' });
      return;
    }

    const oldListId = card.listId;

    // 2. Mettre à jour les références des listes
    await List.findByIdAndUpdate(oldListId, {
      $pull: { cards: cardId },
    });

    await List.findByIdAndUpdate(newListId, {
      $push: { cards: cardId },
    });

    // 3. Mettre à jour la carte
    card.listId = newListId;
    card.position = position;
    await card.save();

    // 4. Réorganiser les positions dans la nouvelle liste
    const cardsInNewList = await Card.find({ listId: newListId }).sort(
      'position',
    );
    const updates = cardsInNewList.map((c, index) =>
      Card.findByIdAndUpdate(c._id, { position: index }, { new: true }),
    );
    await Promise.all(updates);

    // 5. Retourner les deux listes avec leurs cartes et checklists
    const [oldList, newList] = await Promise.all([
      List.findById(oldListId).populate({
        path: 'cards',
        options: { sort: { position: 1 } },
        populate: {
          path: 'checklists',
          model: 'Checklist',
        },
      }),
      List.findById(newListId).populate({
        path: 'cards',
        options: { sort: { position: 1 } },
        populate: {
          path: 'checklists',
          model: 'Checklist',
        },
      }),
    ]);

    res.status(200).json({ oldList, newList });
  } catch (error) {
    console.error('Erreur lors du déplacement de la carte:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};
