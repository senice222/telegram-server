const express = require('express');
const groupRoute = express.Router();
const { createGroup, getUserGroups, getGroupById } = require('../controllers/groupController');
const upload = require('../middleware/multerMiddleware');

groupRoute.post('/group', upload.single('image'),  createGroup);
groupRoute.get('/groups/:userId', getUserGroups);
groupRoute.get('/group/:id', getGroupById);

module.exports = groupRoute;
