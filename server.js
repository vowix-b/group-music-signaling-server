const express = require("express")
const http = require("http")
const socketIo = require("socket.io")
const cors = require("cors")

const app = express()
const server = http.createServer(app)

// Configure CORS for Socket.IO
const io = socketIo(server, {
  cors: {
    origin: "*", // In production, specify your frontend domain
    methods: ["GET", "POST"],
    credentials: true,
  },
})

app.use(cors())
app.use(express.json())

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    status: "Group Music Signaling Server Running",
    timestamp: new Date().toISOString(),
    connections: io.engine.clientsCount,
  })
})

// Store room information
const rooms = new Map()

io.on("connection", (socket) => {
  console.log(`🔗 User connected: ${socket.id}`)

  // Handle joining a room
  socket.on("join-room", (data) => {
    const { roomCode, userName, userId } = data

    console.log(`👤 ${userName} (${userId}) joining room ${roomCode}`)

    // Leave any existing rooms
    Array.from(socket.rooms).forEach((room) => {
      if (room !== socket.id) {
        socket.leave(room)
      }
    })

    // Join the new room
    socket.join(roomCode)

    // Store user info
    socket.userId = userId
    socket.userName = userName
    socket.roomCode = roomCode

    // Get existing users in room
    const existingUsers = []
    const socketsInRoom = io.sockets.adapter.rooms.get(roomCode)

    if (socketsInRoom) {
      socketsInRoom.forEach((socketId) => {
        const existingSocket = io.sockets.sockets.get(socketId)
        if (existingSocket && existingSocket.id !== socket.id && existingSocket.userId) {
          existingUsers.push({
            userId: existingSocket.userId,
            userName: existingSocket.userName,
          })
        }
      })
    }

    // Send existing users to the new user
    socket.emit("room-users", existingUsers)

    // Notify others in room about new user
    socket.to(roomCode).emit("user-joined", {
      userId: userId,
      userName: userName,
    })

    console.log(`✅ ${userName} joined room ${roomCode}. Room size: ${socketsInRoom ? socketsInRoom.size : 1}`)
  })

  // Handle WebRTC signaling
  socket.on("webrtc-offer", (data) => {
    console.log(`📞 Relaying offer from ${socket.userName} to ${data.targetUserId}`)
    socket.to(socket.roomCode).emit("webrtc-offer", {
      senderUserId: socket.userId,
      senderName: socket.userName,
      offer: data.offer,
    })
  })

  socket.on("webrtc-answer", (data) => {
    console.log(`📞 Relaying answer from ${socket.userName} to ${data.targetUserId}`)
    socket.to(socket.roomCode).emit("webrtc-answer", {
      senderUserId: socket.userId,
      senderName: socket.userName,
      answer: data.answer,
    })
  })

  socket.on("webrtc-ice-candidate", (data) => {
    console.log(`🧊 Relaying ICE candidate from ${socket.userName}`)
    socket.to(socket.roomCode).emit("webrtc-ice-candidate", {
      senderUserId: socket.userId,
      senderName: socket.userName,
      candidate: data.candidate,
    })
  })

  // Handle music synchronization
  socket.on("music-state", (data) => {
    console.log(`🎵 Relaying music state from ${socket.userName}`)
    socket.to(socket.roomCode).emit("music-state", {
      senderUserId: socket.userId,
      senderName: socket.userName,
      ...data,
    })
  })

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log(`👋 User disconnected: ${socket.userName} (${socket.id})`)

    if (socket.roomCode && socket.userId) {
      socket.to(socket.roomCode).emit("user-left", {
        userId: socket.userId,
        userName: socket.userName,
      })
    }
  })
})

const PORT = process.env.PORT || 8080

server.listen(PORT, () => {
  console.log(`🚀 Group Music Signaling Server running on port ${PORT}`)
  console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}`)
})
