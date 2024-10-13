const express = require('express');
const groupRoute = express.Router();
const { createGroup } = require('../controllers/groupController');

groupRoute.post('/group', createGroup);

module.exports = groupRoute;
