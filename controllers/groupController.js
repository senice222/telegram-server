const { prisma } = require('../lib/prisma');
const { v4: uuidv4 } = require('uuid');

const createGroup = async (req, res, aWss) => {
  try {
    const { name, ownerId, members } = req.body
    const toObjectMembers = JSON.parse(members)
    const idWithMinus = `-1${uuidv4()}`;
    const imagePath = req.file ? req.file.filename : ""

    const currentUser = await prisma.profile.findUnique({
      where: {
        id: ownerId
      }
    })
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    const membersWithOwner = [currentUser, ...toObjectMembers]
    const newGroup = await prisma.group.create({
      data: {
        id: idWithMinus,
        name,
        image: imagePath,
        ownerId,
        members: {
          create: membersWithOwner.map(user => ({
            memberId: user.id,
          })),
        },
      },
      include: {
        members: true,
      },
    });
    newGroup.members.forEach((member) => {
      const groupKey = `group:${member.memberId}:created`;
      aWss.clients.forEach((client) => {
        if (client.readyState === 1 && client.clientId === member.memberId) {
          console.log({ key: groupKey, newGroup })
          client.send(JSON.stringify({ key: groupKey, newGroup }));
        }
      });
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

const getGroupById = async (req, res) => {
  try {
    const { id } = req.params
    const group = await prisma.group.findUnique({
      where: {
        id,
      },
      include: {
        owner: true,
        messages: true,
        members: {
          include: {
            profile: true,
          },
        },
      },
    });

    return res.status(200).json(group);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'An error occurred while getting group by ID' });
  }
}

const getGroupMessages = async (req, res) => {
  try {
    const MESSAGE_BATCH = 30;
    const { cursor, groupId } = req.query;

    if (!groupId) {
      return res.status(400).json({ message: 'Group ID is missing' });
    }
    let messages = [];

    if (cursor) {
      messages = await prisma.groupMessage.findMany({
        take: MESSAGE_BATCH,
        skip: 1,
        cursor: {
          id: cursor,
        },
        where: {
          groupId,
        },
        include: {
          group: {
            include: {
              members: {
                include: {
                  profile: true,
                },
              },
            },
          },
          replyToMessage: {
            include: {
              ownerProfile: true,
            },
          },
          ownerProfile: true,
          readBy: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    } else {
      messages = await prisma.groupMessage.findMany({
        take: MESSAGE_BATCH,
        where: {
          groupId,
        },
        include: {
          group: {
            include: {
              members: {
                include: {
                  profile: true,
                },
              },
            },
          },
          replyToMessage: {
            include: {
              ownerProfile: true,
            },
          },
          ownerProfile: true,
          readBy: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    }

    const categorizedMessages = {
      media: [],
      files: [],
      links: [],
    };

    // Регулярное выражение для поиска ссылок
    const urlRegex = /(https?:\/\/[^\s]+)/g;

    messages.forEach((message) => {
      if (message.files) {
        let parsedFiles;

        if (typeof message.files === "string") {
          try {
            parsedFiles = JSON.parse(message.files);
          } catch (error) {
            console.error("Error parsing JSON", error);
          }
        } else {
          parsedFiles = message.files;
        }

        if (parsedFiles?.type === "imgs") {
          categorizedMessages.media.push(message);
        } else if (parsedFiles?.type === "files") {
          categorizedMessages.files.push(message);
        }
      }

      if (urlRegex.test(message.content)) {
        categorizedMessages.links.push(message);
      }
    });

    let nextCursor = null;

    if (messages.length === MESSAGE_BATCH) {
      nextCursor = messages[MESSAGE_BATCH - 1].id;
    }

    return res.status(200).json({
      categorizedMessages,
      items: messages,
      nextCursor,
    });
  } catch (error) {
    console.error('Error fetching group messages:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

const sendMessage = async (req, res, aWss) => {
  const { profileId, groupId } = req.query;
  const { content, type, reply } = req.body;
  const files = req.files;

  if (!content && !files) {
    return res.status(400).json({ message: "Content or files missing" });
  }

  try {
    const currentUser = await prisma.profile.findUnique({
      where: { id: profileId }
    });

    if (!currentUser) {
      return res.status(404).json({ error: "User not found" });
    }
    const groupExists = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: true
      }
    });

    if (!groupExists) {
      return res.status(404).json({ error: "Group not found" });
    }

    const isCurrentUserMember = groupExists.members.some(
      (member) => member.memberId === currentUser.id
    );

    if (!isCurrentUserMember) {
      return res.status(403).json({ error: "You are not a member of this group" });
    }

    const fileData = { type, fileUrls: files };
    let data = {
      content,
      files: fileData,
      groupId,
      memberId: currentUser.id
    }
    if (reply) {
      data.replyId = reply
    }
    const newMessage = await prisma.groupMessage.create({
      data,
      include: {
        group: {
          include: {
            members: true
          },
        },
        replyToMessage: {
          include: {
            ownerProfile: true,
          },
        }
      },
    });
    const groupKey = `group:${groupId}:messages`;

    aWss.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(JSON.stringify({ key: groupKey, data: newMessage }));
        newMessage.group.members.map(item => {
          client.send(JSON.stringify({
            key: `user:${item.memberId}:lastMessageUpdate`,
            data: { groupId: newMessage.groupId, lastMessage: newMessage.content }
          }));
        })
      }
    });

    await prisma.group.update({
      where: { id: groupId },
      data: {
        lastMessage: content,
      },
    })
    res.status(200).json(newMessage);
  } catch (error) {
    console.error("Error while sending group message:", error);
    res.status(500).json({ error: "Server error while sending message" });
  }
};

const markGroupMessageAsRead = async (req, res, aWss) => {
  try {
    const { messageId } = req.params;
    const { recipientId } = req.body;

    const message = await prisma.groupMessage.findUnique({
      where: { id: messageId },
      include: { readBy: true },
    });

    if (!message) {
      return res.status(404).json({ error: "Сообщение не найдено" });
    }

    const hasRead = message.readBy.some((user) => user.id === recipientId);
    if (!hasRead) {
      const updatedMessage = await prisma.groupMessage.update({
        where: { id: messageId },
        data: {
          readBy: {
            connect: { id: recipientId }, 
          },
        },
      });

      const readStatusKey = `message:${messageId}:read`;
      
      aWss.clients.forEach((client) => {
        if (client.readyState === 1) {
          client.send(JSON.stringify({
            key: readStatusKey,
            data: { messageId, readByUserId: recipientId },
          }));
        }
      });

      res.status(200).json(updatedMessage);
    } else {
      res.status(200).json({ message: "Сообщение уже отмечено как прочитанное этим пользователем" });
    }
  } catch (e) {
    console.log("Ошибка при отметке сообщения как прочитанного", e);
    res.status(500).json({ error: "Не удалось отметить сообщение как прочитанное" });
  }
};



module.exports = { createGroup, getUserGroups, getGroupById, getGroupMessages, sendMessage, markGroupMessageAsRead }