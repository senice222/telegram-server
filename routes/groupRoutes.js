const express = require('express');
const groupRoute = express.Router();
const { createGroup, getUserGroups } = require('../controllers/groupController');
const upload = require('../middleware/multerMiddleware');

groupRoute.post('/group', upload.single('image'),  createGroup);
groupRoute.get('/groups', getUserGroups);

module.exports = groupRoute;
