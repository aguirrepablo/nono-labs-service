import * as mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Migration: Add defaultVirtualAgentId and maxContextMessages to Channel collection
 *
 * This script updates existing Channel documents to include the new properties:
 * - defaultVirtualAgentId: Optional reference to VirtualAgent
 * - maxContextMessages: Number with default value of 20 (range: 1-100)
 *
 * Run with: npm run migrate:add-channel-properties
 */

async function migrateChannels() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/nono-labs';

  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection failed');
    }
    const channelCollection = db.collection('channels');

    // Count existing documents
    const totalCount = await channelCollection.countDocuments({});
    console.log(`Found ${totalCount} channel documents to update`);

    if (totalCount === 0) {
      console.log('No channels to migrate');
      await mongoose.disconnect();
      return;
    }

    // Update all documents that don't have maxContextMessages
    const result = await channelCollection.updateMany(
      {
        $or: [
          { maxContextMessages: { $exists: false } },
          { defaultVirtualAgentId: { $exists: false } },
        ],
      },
      {
        $set: {
          maxContextMessages: 20, // Default value
          // defaultVirtualAgentId is left undefined/null - can be set per channel
        },
      },
    );

    console.log(`Updated ${result.modifiedCount} channel documents`);
    console.log(`Matched ${result.matchedCount} channel documents`);

    // Verify the update
    const verifyCount = await channelCollection.countDocuments({
      maxContextMessages: { $exists: true },
    });

    console.log(`Verification: ${verifyCount} channels now have maxContextMessages`);

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

migrateChannels();
