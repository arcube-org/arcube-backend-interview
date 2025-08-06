import { UserModel } from '../models';
import { UserRole } from '../types';

interface SeedUser {
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
}

const defaultUsers: SeedUser[] = [
  {
    name: 'System Administrator',
    email: 'admin@arcube.com',
    role: 'admin',
    isActive: true,
  },
  {
    name: 'Partner User',
    email: 'partner@emirates.com',
    role: 'partner',
    isActive: true,
  },
  {
    name: 'Vijaykumar Prakash',
    email: 'vijaykumar4495@gmail.com',
    role: 'user',
    isActive: true,
  },
  {
    name: 'System Service',
    email: 'system@arcube.com',
    role: 'system',
    isActive: true,
  },
];

export const seedDatabase = async (): Promise<void> => {
  try {
    console.log('🌱 Starting database seeding...');

    // Check if any users exist
    const existingUserCount = await UserModel.countDocuments();
    
    if (existingUserCount > 0) {
      console.log(`✅ Database already has ${existingUserCount} user(s). Skipping seed.`);
      return;
    }

    // Create default users
    const createdUsers = await UserModel.insertMany(defaultUsers);

    console.log(`✅ Successfully seeded database with ${createdUsers.length} default users:`);
    
    createdUsers.forEach(user => {
      console.log(`   - ${user.name} (${user.email}) - Role: ${user.role}`);
    });

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
};

export const checkSeedStatus = async (): Promise<void> => {
  try {
    const userCount = await UserModel.countDocuments();
    const usersByRole = await UserModel.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    console.log(`Database Status:`);
    console.log(`Total Users: ${userCount}`);
    
    if (usersByRole.length > 0) {
      console.log(`   Users by Role:`);
      usersByRole.forEach(({ _id, count }) => {
        console.log(`     - ${_id}: ${count}`);
      });
    }

  } catch (error) {
    console.error('❌ Error checking seed status:', error);
  }
}; 