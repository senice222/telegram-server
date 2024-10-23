const { prisma } = require('../lib/prisma');
const { v4: uuidv4 } = require('uuid');

const createGroup = async (req, res) => {
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
              ownerProfile: true, // Включаем данные профиля для сообщения, на которое идет ответ
            },
          },
          ownerProfile: true
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
              ownerProfile: true, // Включаем данные профиля для сообщения, на которое идет ответ
            },
          },
          ownerProfile: true
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

    // Проходим по каждому сообщению и классифицируем их
    messages.forEach((message) => {
      // Проверка на наличие файлов и их тип
      if (message.files) {
        let parsedFiles;

        // Проверяем, является ли message.files строкой или объектом
        if (typeof message.files === "string") {
          try {
            parsedFiles = JSON.parse(message.files); // Парсим, если это строка
          } catch (error) {
            console.error("Error parsing JSON", error);
          }
        } else {
          parsedFiles = message.files; // Если это объект, просто используем его
        }

        // Если удалось успешно получить объект файлов
        if (parsedFiles?.type === "imgs") {
          categorizedMessages.media.push(message);
        } else if (parsedFiles?.type === "files") {
          categorizedMessages.files.push(message);
        }
      }

      // Проверка на наличие ссылки в контенте
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

const sendMessage = async (req, res) => {
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


module.exports = { createGroup, getUserGroups, getGroupById, getGroupMessages, sendMessage }