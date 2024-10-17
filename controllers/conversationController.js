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
    const MESSAGE_BATCH = 10;
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

    let nextCursor = null;

    if (messages.length === MESSAGE_BATCH) {
      nextCursor = messages[MESSAGE_BATCH - 1].id;
    }

    return res.status(200).json({
      items: messages,
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
    console.log(files, 228)
    if (!content && !files) {
      return res.status(400).json({ message: "Content missing" });
    }
  
    try {
      const fileUrls = files ? files.map(file => file.filename) : [];
  
      const currentUser = await prisma.profile.findUnique({
        where: { id: profileId },
      });
  
      const fileData = { type, fileUrls : files };
  
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
      });
      res.status(200).json(newDirectMessage);
    } catch (error) {
      console.error("Error while sending direct message:", error);
      res
        .status(500)
        .json({ error: "Server error while sending direct message" });
    }
  };

module.exports = {
  createConversationIfNotExists,
  getConversation,
  getConversationById,
  getConversationMessages,
  sendDirectMessage,
};
