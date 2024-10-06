const express = require('express');
const channelRouter = express.Router();
const upload = require('../middleware/multerMiddleware');
const { createChannel, searchChannels } = require('../controllers/channelController');

channelRouter.post('/channels', upload.single('image'), createChannel);
channelRouter.get('/search', searchChannels);

module.exports = channelRouter;
