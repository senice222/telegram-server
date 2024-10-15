const { prisma } = require('../lib/prisma');
const { v4: uuidv4 } = require('uuid');

const createGroup = async (req, res) => {
  try {
    const { name, ownerId, members } = req.body
    const toObjectMembers = JSON.parse(members)
    const idWithMinus = `-1${uuidv4()}`;
    const imagePath = req.file ? req.file.filename : ""

    const newGroup = await prisma.group.create({
      data: {
        id: idWithMinus,
        name,
        image: imagePath,
        ownerId,
        members: {
          create: toObjectMembers.map(user => ({
            memberId: user.id,
          })),
        },
      },
    });

    return res.status(200).json(newGroup);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'An error occurred while creating the group' });
  }
}

const getUserGroups = async (req, res) => {
  try {
    const { userId } = req.params
    const userGroups = await prisma.group.findMany({
      where: {
        members: { some: { memberId: userId } },
      },
    });

    return res.status(200).json(userGroups);
  } catch (e) {
    console.error(e)
    return res.status(500).json({ message: 'An error occurred while getting user groups' });
  }
}

module.exports = { createGroup, getUserGroups }