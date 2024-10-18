const express = require('express');
const groupRoute = express.Router();
const { createGroup, getUserGroups, getGroupById, getGroupMessages, sendMessage } = require('../controllers/groupController');
const upload = require('../middleware/multerMiddleware');

groupRoute.post('/group', upload.single('image'), createGroup);
groupRoute.get('/groups/:userId', getUserGroups);
groupRoute.get('/get-group/messages', getGroupMessages);
groupRoute.get('/group/:id', getGroupById);
groupRoute.patch('/group/message', upload.array('fileUrls'), sendMessage);

module.exports = groupRoute;
