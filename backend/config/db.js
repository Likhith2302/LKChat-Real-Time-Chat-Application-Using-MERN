import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI;
    
    if (!mongoURI) {
      console.error('MONGO_URI is not defined in environment variables');
      process.exit(1);
    }

    const conn = await mongoose.connect(mongoURI, {
      // Connection options for better reliability
      serverSelectionTimeoutMS: 10000, // Timeout after 10s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
      // Use a specific database name (optional - can be in connection string)
      // dbName: 'lkchat',
    });
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.error('Please check:');
    console.error('1. Your MONGO_URI in .env file');
    console.error('2. MongoDB Atlas IP whitelist (if using Atlas)');
    console.error('3. Internet connection');
    process.exit(1);
  }
};

export default connectDB;

