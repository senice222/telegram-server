const express = require('express');
const upload = require('../middleware/multerMiddleware');
const { createGroup, getUserGroups, getGroupById, getGroupMessages, sendMessage, markGroupMessageAsRead, addUsersToGroup } = require('../controllers/groupController');

module.exports = (aWss) => {
    const groupRoute = express.Router();

    groupRoute.post('/group', upload.single('image'), (req, res) => createGroup(req, res, aWss));
    groupRoute.get('/groups/:userId', (req, res) => getUserGroups(req, res, aWss));
    groupRoute.get('/get-group/messages', (req, res) => getGroupMessages(req, res, aWss));
    groupRoute.get('/group/:id', (req, res) => getGroupById(req, res, aWss));
    groupRoute.post('/group/messages', upload.array('fileUrls'), (req, res) => sendMessage(req, res, aWss));
    groupRoute.put('/messages-group/:messageId/markAsRead', (req, res) => markGroupMessageAsRead(req, res, aWss));
    groupRoute.post('/group/:groupId/add-users', upload.none(), (req, res) => addUsersToGroup(req, res, aWss));


    return groupRoute;
};
