const { prisma } = require("../lib/prisma");
const { v4: uuidv4 } = require("uuid");

const createConversationIfNotExists = async (req, res) => {
  const { memberOneId, memberTwoId } = req.query;
  if (!memberOneId || !memberTwoId) {
    throw new Error("IDs not found");
  }

  try {
    let conversation = await prisma.conversation.findFirst({
      where: {
        OR: [
          { memberOneId, memberTwoId },
          { memberOneId: memberTwoId, memberTwoId: memberOneId },
        ],
      },
    });

    if (!conversation) {
      const idWithMinus = `-${uuidv4()}`;
      conversation = await prisma.conversation.create({
        data: {
          id: idWithMinus,
          memberOne: {
            connect: { id: memberOneId },
          },
          memberTwo: {
            connect: { id: memberTwoId },
          },
        },
      });
    }

    res.status(200).json(conversation);
  } catch (error) {
    console.error("Error finding or creating conversation:", error);
    res.status(500).json({ error: "Failed to create conversation" });
  }
};

const searchMessagesByContent = async (req, res) => {
  const { content } = req.query;

  if (!content) {
    return res.status(400).json({ error: "Content query parameter is required" });
  }

  try {
    const messages = await prisma.directMessage.findMany({
      where: {
        content: {
          contains: content,
          mode: "insensitive" // Поиск без учета регистра
        }
      },
      include: {
        conversation: {
          include: {
            memberOne: true,
            memberTwo: true
          }
        },
        replyToMessage: {
          include: {
            ownerProfile: true
          }
        },
        ownerProfile: true
      }
    });

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error while searching messages by content:", error);
    res.status(500).json({ error: "Server error while searching messages" });
  }
};

const getConversation = async (req, res) => {
  const { memberOneId, memberTwoId } = req.query;
  try {
    let conversation = await prisma.conversation.findFirst({
      where: {
        OR: [
          { memberOneId, memberTwoId },
          { memberOneId: memberTwoId, memberTwoId: memberOneId },
        ],
      },
      include: {
        memberOne: true,
        memberTwo: true,
      },
    });
    res.status(200).json(conversation);
  } catch (e) {
    console.log(e, "error during getting conv");
  }
};

const getConversationById = async (req, res) => {
  const { id } = req.params;
  try {
    let conversation = await prisma.conversation.findFirst({
      where: {
        id,
      },
      include: {
        memberOne: true,
        memberTwo: true,
      },
    });
    res.status(200).json(conversation);
  } catch (e) {
    console.log(e, "error during getting conv");
  }
};


const getConversationMessages = async (req, res) => {
  try {
    const MESSAGE_BATCH = 30;
    const { cursor, conversationId } = req.query;


    if (!conversationId) {
      return res.status(400).json({ message: "Conversation ID missing" });
    }

    let messages = [];
    if (cursor) {
      messages = await prisma.directMessage.findMany({
        take: MESSAGE_BATCH,
        skip: 1,
        cursor: {
          id: cursor,
        },
        where: {
          conversationId,
        },
        include: {
          conversation: {
            include: {
              memberOne: true,
              memberTwo: true,
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
          createdAt: "desc",
        },
      });
    } else {
      messages = await prisma.directMessage.findMany({
        take: MESSAGE_BATCH,
        where: {
          conversationId,
        },
        include: {
          conversation: {
            include: {
              memberOne: true,
              memberTwo: true,
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
          createdAt: "desc",
        },
      });
    }

    const categorizedMessages = {
      media: [],
      files: [],
      links: [],
    };

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
      items: messages,
      categorizedMessages,
      nextCursor,
    });
  } catch (error) {
    console.error("CONVERSATION_MESSAGE_ERROR", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const sendDirectMessage = async (req, res, aWss) => {
  const { profileId, conversationId } = req.query;
  const { content, type, reply } = req.body;
  const files = req.files;

  if (!content && !files) {
    return res.status(400).json({ message: "Content missing" });
  }

  try {
    const currentUser = await prisma.profile.findUnique({
      where: { id: profileId },
    });

    const fileData = { type, fileUrls: files };

    if (!currentUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        memberOne: true,
        memberTwo: true,
      },
    });

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const isParticipant =
      conversation.memberOneId === profileId ||
      conversation.memberTwoId === profileId;

    if (!isParticipant) {
      return res
        .status(403)
        .json({ error: "You are not a participant in this conversation" });
    }
    const data = {
      content: content,
      files: fileData,
      memberId: profileId,
      conversationId,
    }

    if (reply) {
      data.replyId = reply
    }

    const newDirectMessage = await prisma.directMessage.create({
      data,
      include: {
        conversation: true,
        replyToMessage: {
          include: {
            ownerProfile: true,
          },
        }
      }
    });
    const conversationKey = `conversation:${conversationId}:messages`;
    const memberOneUpdateKey = `user:${newDirectMessage.conversation.memberOneId}:lastMessageUpdate`;
    const memberTwoUpdateKey = `user:${newDirectMessage.conversation.memberTwoId}:lastMessageUpdate`;

    aWss.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(JSON.stringify({ key: conversationKey, data: newDirectMessage }));

        client.send(JSON.stringify({
          key: memberOneUpdateKey,
          data: { conversationId: newDirectMessage.conversationId, lastMessage: newDirectMessage.content }
        }));
        client.send(JSON.stringify({
          key: memberTwoUpdateKey,
          data: { conversationId: newDirectMessage.conversationId, lastMessage: newDirectMessage.content }
        }));
      }
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessage: content,
      },
    })
    res.status(200).json(newDirectMessage);
  } catch (error) {
    console.error("Error while sending direct message:", error);
    res
      .status(500)
      .json({ error: "Server error while sending direct message" });
  }
};

const updateMessage = async (req, res, aWss) => {
  const { id } = req.params;
  const { content, owner, profile } = req.body;
  try {
    if (!id || !content) {
      return res.status(400).json({ message: "Message ID and new content are required." });
    }
    if (owner !== profile.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const updatedMessage = await prisma.directMessage.update({
      where: { id },
      data: { content }
    });
    const conversationKey = `conversation:${updatedMessage.conversationId}:messages:update`;
    aWss.clients.forEach((client) => {
      client.send(JSON.stringify({ key: conversationKey, data: updatedMessage }));
    });
    res.status(200).json(updatedMessage);
  } catch (error) {
    console.error("Error while updating message:", error);
    res
      .status(500)
      .json({ error: "Server error while updating message" });
  }
}

const deleteMessage = async (req, res, aWss) => {
  try {
    const { messageId, owner } = req.params
    if (!messageId) {
      return res.status(400).json({ message: "Message ID and new content are required." });
    }
    const message = await prisma.directMessage.findUnique({
      where: {
        id: messageId,
      },
    });

    if (!message) {
      return res.status(404).json({ message: "Message not found." });
    }

    if (message.memberId !== owner) {
      return res.status(401).json({ message: "Unauthorized: You do not have permission to delete this message." });
    }
    const updatedMessage = await prisma.directMessage.update({
      where: {
        id: messageId,
      },
      data: {
        files: null,
        content: 'Deleted message.',
        deleted: true,
      }
    });

    const conversationKey = `conversation:${updatedMessage.conversationId}:messages:update`;
    aWss.clients.forEach((client) => {
      client.send(JSON.stringify({ key: conversationKey, data: message }));
    });
    res.status(200).json(message);
  } catch (e) {
    console.log(e, "failed to delete message")
  }
}

const markMessageAsRead = async (req, res, aWss) => {
  try {
    const { messageId } = req.params;
    const { userId, recipientId } = req.body;

    const message = await prisma.directMessage.findUnique({
      where: {
        id: messageId,
      },
    });

    if (message.memberId !== userId && message.memberId === recipientId) {
      const updatedMessage = await prisma.directMessage.update({
        where: {
          id: messageId,
        },
        data: {
          isRead: true,
        },
      });
      const readStatusKey = `message:${messageId}:read`;
      aWss.clients.forEach((client) => {
        if (client.readyState === 1) {
          client.send(JSON.stringify({
            key: readStatusKey,
            data: { messageId, isRead: true },
          }));
        }
      });
      res.status(200).json(updatedMessage);
    } else {
      res.status(403).json({ error: "Вы не можете отметить это сообщение как прочитанное." });
    }
  } catch (e) {
    console.log(e, "Не удалось отметить сообщение как прочитанное собеседником");
    res.status(500).json({ error: "Произошла ошибка" });
  }
};

module.exports = {
  createConversationIfNotExists,
  getConversation,
  getConversationById,
  getConversationMessages,
  sendDirectMessage,
  updateMessage,
  deleteMessage,
  markMessageAsRead,
  searchMessagesByContent // Экспорт новой функции
};