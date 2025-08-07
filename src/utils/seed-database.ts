import { UserModel } from '../models';
import { UserRole } from '../types';

interface SeedUser {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  isActive: boolean;
  dateOfBirth?: Date;
  nationality?: string;
}

const defaultUsers: SeedUser[] = [
  {
    name: 'System Administrator',
    email: 'admin@arcube.com',
    password: 'Admin@123456',
    role: 'admin',
    isActive: true,
    dateOfBirth: new Date('1985-03-15'),
    nationality: 'United States',
  },
  {
    name: 'Partner User',
    email: 'partner@emirates.com',
    password: 'Partner@123456',
    role: 'partner',
    isActive: true,
    dateOfBirth: new Date('1990-07-22'),
    nationality: 'United Arab Emirates',
  },
  {
    name: 'Vijaykumar Prakash',
    email: 'vijaykumar4495@gmail.com',
    password: 'User@123456',
    role: 'user',
    isActive: true,
    dateOfBirth: new Date('1995-04-04'),
    nationality: 'India',
  },
  {
    name: 'Vijay Games',
    email: 'gamebyvijay@gmail.com',
    password: 'User@123456',
    role: 'user',
    isActive: true,
    dateOfBirth: new Date('1990-05-20'),
    nationality: 'United Kingdom',
  },
  {
    name: 'System Service',
    email: 'system@arcube.com',
    password: 'System@123456',
    role: 'system',
    isActive: true,
    // No dateOfBirth or nationality for system role
  },
];

export const seedDatabase = async (): Promise<void> => {
  try {
    console.log('🌱 Starting database seeding...');

    // Get the list of default user emails
    const defaultEmails = defaultUsers.map(user => user.email);
    
    // Check if default users already exist
    const existingDefaultUsers = await UserModel.find({ email: { $in: defaultEmails } });
    
    if (existingDefaultUsers.length > 0) {
      console.log(`✅ Database already has ${existingDefaultUsers.length} default user(s):`);
      existingDefaultUsers.forEach(user => {
        console.log(`   - ${user.name} (${user.email}) - Role: ${user.role}`);
      });
      console.log('Skipping seed.');
      return;
    }

    // Create default users one by one to ensure password hashing middleware runs
    const createdUsers = [];
    for (const userData of defaultUsers) {
      const user = new UserModel(userData);
      const savedUser = await user.save();
      createdUsers.push(savedUser);
    }

    console.log(`✅ Successfully seeded database with ${createdUsers.length} default users:`);
    
    createdUsers.forEach(user => {
      console.log(`   - ${user.name} (${user.email}) - Role: ${user.role}`);
    });

    console.log('\n🔐 Default Passwords (for testing):');
    console.log('   - Admin: Admin@123456');
    console.log('   - Partner: Partner@123456');
    console.log('   - User: User@123456');
    console.log('   - System: System@123456');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
};

export const clearDefaultUsers = async (): Promise<number> => {
  try {
    const defaultEmails = defaultUsers.map(user => user.email);
    const result = await UserModel.deleteMany({ email: { $in: defaultEmails } });
    console.log(`🗑️  Cleared ${result.deletedCount} default user(s)`);
    return result.deletedCount;
  } catch (error) {
    console.error('❌ Error clearing default users:', error);
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