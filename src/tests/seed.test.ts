import mongoose from 'mongoose';
import { UserModel } from '../models';
import { seedDatabase, checkSeedStatus } from '../utils/seed-database';
import { env } from '../config/environment';

describe('Database Seeding', () => {
  beforeAll(async () => {
    await mongoose.connect(env.MONGODB_URI);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear all users before each test
    await UserModel.deleteMany({});
  });

  afterEach(async () => {
    // Clear all users after each test
    await UserModel.deleteMany({});
  });

  it('should seed database with default users when empty', async () => {
    // Verify database is empty
    const initialCount = await UserModel.countDocuments();
    expect(initialCount).toBe(0);

    // Run seeding
    await seedDatabase();

    // Verify users were created
    const finalCount = await UserModel.countDocuments();
    expect(finalCount).toBe(4); // 4 default users

    // Verify each role exists
    const adminUser = await UserModel.findOne({ role: 'admin' });
    const partnerUser = await UserModel.findOne({ role: 'partner' });
    const regularUser = await UserModel.findOne({ role: 'user' });
    const systemUser = await UserModel.findOne({ role: 'system' });

    expect(adminUser).toBeDefined();
    expect(adminUser?.email).toBe('admin@arcube.com');
    expect(adminUser?.name).toBe('System Administrator');

    expect(partnerUser).toBeDefined();
    expect(partnerUser?.email).toBe('partner@arcube.com');
    expect(partnerUser?.name).toBe('Partner User');

    expect(regularUser).toBeDefined();
    expect(regularUser?.email).toBe('user@arcube.com');
    expect(regularUser?.name).toBe('Regular User');

    expect(systemUser).toBeDefined();
    expect(systemUser?.email).toBe('system@arcube.com');
    expect(systemUser?.name).toBe('System Service');
  });

  it('should not seed database when users already exist', async () => {
    // Create multiple test users first
    const testUsers = [
      {
        name: 'Existing Test User 1',
        email: 'existing-user-1@example.com',
        role: 'user' as const,
        isActive: true,
      },
      {
        name: 'Existing Test User 2',
        email: 'existing-user-2@example.com',
        role: 'admin' as const,
        isActive: true,
      },
      {
        name: 'Existing Test User 3',
        email: 'existing-user-3@example.com',
        role: 'partner' as const,
        isActive: false,
      },
    ];

    await UserModel.insertMany(testUsers);

    // Verify users exist
    const initialCount = await UserModel.countDocuments();
    expect(initialCount).toBe(3);

    // Run seeding again
    await seedDatabase();

    // Verify no additional users were created
    const finalCount = await UserModel.countDocuments();
    expect(finalCount).toBe(3); // Still only 3 users

    // Verify the original users still exist
    const existingUser1 = await UserModel.findOne({ email: 'existing-user-1@example.com' });
    const existingUser2 = await UserModel.findOne({ email: 'existing-user-2@example.com' });
    const existingUser3 = await UserModel.findOne({ email: 'existing-user-3@example.com' });

    expect(existingUser1).toBeDefined();
    expect(existingUser1?.name).toBe('Existing Test User 1');
    expect(existingUser1?.role).toBe('user');

    expect(existingUser2).toBeDefined();
    expect(existingUser2?.name).toBe('Existing Test User 2');
    expect(existingUser2?.role).toBe('admin');

    expect(existingUser3).toBeDefined();
    expect(existingUser3?.name).toBe('Existing Test User 3');
    expect(existingUser3?.role).toBe('partner');
    expect(existingUser3?.isActive).toBe(false);
  });

  it('should handle seeding errors gracefully', async () => {
    // Mock a database error by trying to seed with invalid data
    // This test verifies error handling
    const originalInsertMany = UserModel.insertMany;
    
    try {
      // Mock insertMany to throw an error
      UserModel.insertMany = jest.fn().mockRejectedValue(new Error('Database error'));
      
      await expect(seedDatabase()).rejects.toThrow('Database error');
    } finally {
      // Restore original method
      UserModel.insertMany = originalInsertMany;
    }
  });

  it('should work with mixed existing data scenarios', async () => {
    // Create test users with different scenarios
    const testUsers = [
      {
        name: 'Active Admin User',
        email: 'active-admin@example.com',
        role: 'admin' as const,
        isActive: true,
      },
      {
        name: 'Inactive Partner User',
        email: 'inactive-partner@example.com',
        role: 'partner' as const,
        isActive: false,
      },
      {
        name: 'Regular User',
        email: 'regular-user@example.com',
        role: 'user' as const,
        isActive: true,
      },
      {
        name: 'System Service Account',
        email: 'system-service@example.com',
        role: 'system' as const,
        isActive: true,
      },
    ];

    await UserModel.insertMany(testUsers);

    // Verify initial state
    const initialCount = await UserModel.countDocuments();
    expect(initialCount).toBe(4);

    // Run seeding - should skip since users exist
    await seedDatabase();

    const finalCount = await UserModel.countDocuments();
    expect(finalCount).toBe(4);

    const activeAdmin = await UserModel.findOne({ email: 'active-admin@example.com' });
    const inactivePartner = await UserModel.findOne({ email: 'inactive-partner@example.com' });
    const regularUser = await UserModel.findOne({ email: 'regular-user@example.com' });
    const systemService = await UserModel.findOne({ email: 'system-service@example.com' });

    expect(activeAdmin).toBeDefined();
    expect(activeAdmin?.role).toBe('admin');
    expect(activeAdmin?.isActive).toBe(true);

    expect(inactivePartner).toBeDefined();
    expect(inactivePartner?.role).toBe('partner');
    expect(inactivePartner?.isActive).toBe(false);

    expect(regularUser).toBeDefined();
    expect(regularUser?.role).toBe('user');
    expect(regularUser?.isActive).toBe(true);

    expect(systemService).toBeDefined();
    expect(systemService?.role).toBe('system');
    expect(systemService?.isActive).toBe(true);
  });
}); 