const express = require('express');
const conversationRoute = express.Router();
const { createConversationIfNotExists, sendMessageInConversation, getConversation, getConversationById, getConversationMessages, sendDirectMessage } = require('../controllers/conversationController');

conversationRoute.get('/get-conversation/messages', getConversationMessages);
conversationRoute.get('/get-conversation', getConversation);
conversationRoute.get('/conversation/:id', getConversationById);
conversationRoute.post('/create-conversation', createConversationIfNotExists);
conversationRoute.post('/send-message-conversation', sendMessageInConversation);
conversationRoute.patch('/conversation/message', sendDirectMessage);

module.exports = conversationRoute;
