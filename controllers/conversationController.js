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

// const sendMessageInConversation = async (req, res) => {
//     const { conversationId } = req.query;
//     const { content, fileUrl, memberId } = req.body;

//     if (!conversationId) {
//         return res.status(400).json({ error: "Conversation ID is required" });
//     }

//     try {
//         const conversation = await prisma.conversation.findUnique({
//             where: { id: conversationId }
//         });

//         if (!conversation) {
//             return res.status(404).json({ error: "Conversation not found" });
//         }

//         const message = await prisma.directMessage.create({
//             data: {
//                 content,
//                 fileUrl,
//                 memberId,
//                 conversationId: conversation.id,
//             }
//         });

//         res.status(200).json({ message: "Message sent", message });
//     } catch (error) {
//         console.log(error, "Error sending message");
//         res.status(500).json({ error: "Failed to send message" });
//     }
// };

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
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    }

    // Определим объект, который будет содержать нужные поля
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
      items: messages, // Возвращаем сами сообщения
      categorizedMessages, // Возвращаем отдельно объект с классифицированными сообщениями
      nextCursor,
    });
  } catch (error) {
    console.error("CONVERSATION_MESSAGE_ERROR", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};



const sendDirectMessage = async (req, res) => {
  const { profileId, conversationId } = req.query;
  const { content, type } = req.body;
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

    const newDirectMessage = await prisma.directMessage.create({
      data: {
        content: content,
        files: fileData,
        memberId: profileId,
        conversationId,
      },
      include: {
        conversation: true
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

const updateMessage = async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  try {
    const updatedMessage = await prisma.directMessage.update({
      where: { id },
      data: { content },
    });
    res.status(200).json(updatedMessage);
  } catch (error) {
    console.error("Error while updating message:", error);
    res
      .status(500)
      .json({ error: "Server error while updating message" });
  }
}

const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params
    const message = await prisma.directMessage.update({
      where: {
        id: messageId,
      },
      data: {
        files: null,
        content: 'This message has been deleted',
        deleted: true,
      }
    });
    res.status(200).json(message);
  } catch (e) {
    console.log(e, "failed to delete message")
  }
}

module.exports = {
  createConversationIfNotExists,
  getConversation,
  getConversationById,
  getConversationMessages,
  sendDirectMessage,
  updateMessage,
  deleteMessage
};
