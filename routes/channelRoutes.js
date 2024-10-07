const express = require('express');
const channelRouter = express.Router();
const upload = require('../middleware/multerMiddleware');
const { createChannel, searchChannels, getChannelById, joinChannel } = require('../controllers/channelController');

channelRouter.post('/channels', upload.single('image'), createChannel);
channelRouter.get('/search', searchChannels);
channelRouter.get('/channel/:channelId', getChannelById);
channelRouter.post('/channel/join', joinChannel);

module.exports = channelRouter;
