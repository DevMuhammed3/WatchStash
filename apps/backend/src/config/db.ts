// apps/backend/src/config/db.ts
import mongoose from 'mongoose';
import logger from './logger';

export const connectDB = async () => {
  try {

    if(process.env.MONGODB_URI === undefined){
      throw(Error("MONGODB_URI is missing"))
    }

    const mongoURI = process.env.MONGODB_URI;

    const conn = await mongoose.connect(mongoURI);

    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error(`Error connecting to MongoDB: ${(error as Error).message}`);
    process.exit(1);
  }
};
