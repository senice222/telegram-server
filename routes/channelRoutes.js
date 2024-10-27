const express = require('express');
const upload = require('../middleware/multerMiddleware');
const {
    createChannel,
    searchChannels,
    getChannelById,
    joinChannel,
    sendMessage,
    getChannelMessages,
} = require('../controllers/channelController');

module.exports = (aWss) => {
    const channelRouter = express.Router();

    channelRouter.post('/channels', upload.single('image'), (req, res) => createChannel(req, res, aWss));
    channelRouter.get('/search', (req, res) => searchChannels(req, res));
    channelRouter.get('/channel/:channelId', (req, res) => getChannelById(req, res));
    channelRouter.get('/get-channel/messages', (req, res) => getChannelMessages(req, res));
    channelRouter.post('/channel/join', (req, res) => joinChannel(req, res));
    channelRouter.post('/channel/messages', upload.array('fileUrls'), (req, res) => sendMessage(req, res, aWss));

    return channelRouter;
};
