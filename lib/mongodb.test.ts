import mongoose from 'mongoose'
import { connectToDatabase, disconnectFromDatabase } from './mongodb'

jest.mock('mongoose', () => ({
  connect: jest.fn(),
  connection: {
    close: jest.fn(),
  },
  disconnect: jest.fn(),
}))

describe('MongoDB Connection', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.MONGODB_URI = 'mongodb://test-uri'
  })

  describe('connectToDatabase', () => {
    it('should connect to MongoDB successfully', async () => {
      ;(mongoose.connect as jest.Mock).mockResolvedValueOnce(undefined)

      await connectToDatabase()

      expect(mongoose.connect).toHaveBeenCalledWith(process.env.MONGODB_URI)
    })

    it('should throw error if MONGODB_URI is not defined', async () => {
      delete process.env.MONGODB_URI

      await expect(connectToDatabase()).rejects.toThrow(
        'Please define the MONGODB_URI environment variable inside .env'
      )
    })

    it('should handle connection errors', async () => {
      const error = new Error('Connection failed')
      ;(mongoose.connect as jest.Mock).mockRejectedValueOnce(error)

      await expect(connectToDatabase()).rejects.toThrow('Connection failed')
    })

    it('should reuse existing connection', async () => {
      ;(mongoose.connect as jest.Mock).mockResolvedValueOnce(undefined)

      await connectToDatabase()
      await connectToDatabase()

      expect(mongoose.connect).toHaveBeenCalledTimes(1)
    })
  })

  describe('disconnectFromDatabase', () => {
    it('should disconnect from MongoDB successfully', async () => {
      ;(mongoose.disconnect as jest.Mock).mockResolvedValueOnce(undefined)

      await disconnectFromDatabase()

      expect(mongoose.disconnect).toHaveBeenCalled()
    })

    it('should handle disconnection errors', async () => {
      const error = new Error('Disconnection failed')
      ;(mongoose.disconnect as jest.Mock).mockRejectedValueOnce(error)

      await expect(disconnectFromDatabase()).rejects.toThrow('Disconnection failed')
    })
  })
})
