const express = require('express');
const { createConversationIfNotExists, getConversation, getConversationById, getConversationMessages, sendDirectMessage, updateMessage, deleteMessage, markMessageAsRead } = require('../controllers/conversationController');
const upload = require('../middleware/multerMiddleware');

module.exports = (aWss) => {
    const conversationRoute = express.Router();

    conversationRoute.get('/get-conversation/messages', (req, res) => getConversationMessages(req, res));
    conversationRoute.get('/get-conversation', (req, res) => getConversation(req, res));
    conversationRoute.get('/conversation/:id', (req, res) => getConversationById(req, res));
    conversationRoute.post('/create-conversation', (req, res) => createConversationIfNotExists(req, res));
    // conversationRoute.post('/send-message-conversation', sendMessageInConversation);
    conversationRoute.post('/conversation/message', upload.array('fileUrls'), (req, res) => sendDirectMessage(req, res, aWss));
    conversationRoute.patch('/conversation/message/edit/:id', upload.array('fileUrls'), (req, res) => updateMessage(req, res, aWss));
    conversationRoute.delete('/conversation/message/delete/:messageId/:owner', (req, res, aWss) => deleteMessage(req, res, aWss));
    conversationRoute.put('/messages/:messageId/markAsRead', (req, res) => markMessageAsRead(req, res, aWss));

    return conversationRoute;
};
