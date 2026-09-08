import mongoose from "mongoose"

const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable inside .env.local")
}

interface GlobalMongo {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

declare global {
  var _mongoose: GlobalMongo | undefined
}

let cached = global._mongoose

if (!cached) {
  cached = global._mongoose = { conn: null, promise: null }
}

async function connectDB() {
  if (cached!.conn) {
    console.log("Using cached MongoDB connection")
    return cached!.conn
  }

  if (!cached!.promise) {
    console.log("Creating new MongoDB connection...")
    console.log("MongoDB URI:", MONGODB_URI.replace(/\/\/.*@/, "//***@"))
    
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10, // Increased for better performance
      serverSelectionTimeoutMS: 10000, // 10 seconds
      socketTimeoutMS: 30000, // 30 seconds
      connectTimeoutMS: 15000, // 15 seconds
      maxIdleTimeMS: 10000, // 10 seconds
      retryWrites: true,
      retryReads: true,
    }

    cached!.promise = mongoose.connect(MONGODB_URI, opts)
      .then((mongoose) => {
        console.log("MongoDB connected successfully")
        return mongoose
      })
      .catch((error) => {
        console.error("MongoDB connection error:", error)
        cached!.promise = null
        throw error
      })
  }

  try {
    cached!.conn = await cached!.promise
  } catch (e) {
    cached!.promise = null
    throw e
  }

  return cached!.conn
}

if (mongoose.connection) {
  mongoose.connection.on("connected", () => {
    console.log("MongoDB connected successfully")
  })

  mongoose.connection.on("error", (error) => {
    console.error("MongoDB connection error:", error)
  })

  mongoose.connection.on("disconnected", () => {
    console.log("MongoDB disconnected")
  })

  mongoose.connection.on("reconnected", () => {
    console.log("MongoDB reconnected")
  })
}

// Handle graceful shutdown
process.on("SIGTERM", async () => {
  if (cached!.conn) {
    await cached!.conn.disconnect()
    console.log("MongoDB disconnected through app termination")
    process.exit(0)
  }
})

process.on("SIGINT", async () => {
  if (cached!.conn) {
    await cached!.conn.disconnect()
    console.log("MongoDB disconnected through app interruption")
    process.exit(0)
  }
})

export default connectDB
