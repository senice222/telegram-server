const express = require('express');
const conversationRoute = express.Router();
const { createConversationIfNotExists, getConversation, getConversationById, getConversationMessages, sendDirectMessage, updateMessage, deleteMessage } = require('../controllers/conversationController');
const upload = require('../middleware/multerMiddleware');

conversationRoute.get('/get-conversation/messages', getConversationMessages);
conversationRoute.get('/get-conversation', getConversation);
conversationRoute.get('/conversation/:id', getConversationById);
conversationRoute.post('/create-conversation', createConversationIfNotExists);
// conversationRoute.post('/send-message-conversation', sendMessageInConversation);
conversationRoute.patch('/conversation/message', upload.array('fileUrls'), sendDirectMessage);
conversationRoute.patch('/conversation/message/edit/:id', upload.array('fileUrls'), updateMessage);
conversationRoute.delete('/conversation/message/delete/:messageId', deleteMessage);

module.exports = conversationRoute;
