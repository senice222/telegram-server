const express = require('express');
const groupRoute = express.Router();
const { createGroup } = require('../controllers/groupController');
const upload = require('../middleware/multerMiddleware');

groupRoute.post('/group', upload.single('image'),  createGroup);

module.exports = groupRoute;
