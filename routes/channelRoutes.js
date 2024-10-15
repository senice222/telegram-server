const express = require('express');
const channelRouter = express.Router();
const upload = require('../middleware/multerMiddleware');
const { createChannel, searchChannels, getChannelById, joinChannel, sendMessage, getChannelMessages } = require('../controllers/channelController');

channelRouter.post('/channels', upload.single('image'), createChannel);
channelRouter.get('/search', searchChannels);
channelRouter.get('/channel/:channelId', getChannelById);
channelRouter.get('/get-channel/messages', getChannelMessages);
channelRouter.post('/channel/join', joinChannel);
channelRouter.patch('/channel/message',upload.array('fileUrls'), sendMessage);

module.exports = channelRouter;
