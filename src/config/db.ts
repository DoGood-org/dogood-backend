import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    await mongoose.connect(
      process.env.MONGO_URI || 'mongodb://localhost:27017/mydatabase'
    );
    console.log('✅ MongoDB підключено');
  } catch (error) {
    console.error('❌ Помилка підключення до MongoDB:', error);
    process.exit(1);
  }
};

export default connectDB;
