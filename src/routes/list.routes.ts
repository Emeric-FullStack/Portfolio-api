router.patch(
  '/positions',
  authenticateUser,
  listController.updateListPositions,
);
