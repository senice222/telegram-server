const { prisma } = require('../lib/prisma');
const { v4: uuidv4 } = require('uuid');

const createGroup = async (req, res) => {
  try {
    const { name, description, ownerId, members } = req.body
    const toObjectMembers = JSON.parse(members)

    const idWithMinus = `-1${uuidv4()}`;
    const newGroup = await prisma.group.create({
      data: {
        id: idWithMinus,
        name,
        description,
        image: req.file.filename,
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

module.exports = { createGroup }