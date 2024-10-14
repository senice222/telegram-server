const express = require('express');
const conversationRoute = express.Router();
const { createConversationIfNotExists, getConversation, getConversationById, getConversationMessages, sendDirectMessage } = require('../controllers/conversationController');
const upload = require('../middleware/multerMiddleware');

conversationRoute.get('/get-conversation/messages', getConversationMessages);
conversationRoute.get('/get-conversation', getConversation);
conversationRoute.get('/conversation/:id', getConversationById);
conversationRoute.post('/create-conversation', createConversationIfNotExists);
// conversationRoute.post('/send-message-conversation', sendMessageInConversation);
conversationRoute.patch('/conversation/message', upload.array('fileUrls'), sendDirectMessage);

module.exports = conversationRoute;
