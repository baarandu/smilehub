import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Secure Storage Adapter for Supabase Auth
 * Uses expo-secure-store for encrypted storage on iOS (Keychain) and Android (EncryptedSharedPreferences)
 * Includes migration from AsyncStorage for existing users
 */

const MIGRATION_KEY = 'supabase_migrated_to_secure_store';

// Check if we've already migrated
let migrationDone = false;

async function migrateFromAsyncStorage(key: string): Promise<string | null> {
    if (migrationDone) return null;

    try {
        // Check if already migrated
        const alreadyMigrated = await SecureStore.getItemAsync(MIGRATION_KEY);
        if (alreadyMigrated === 'true') {
            migrationDone = true;
            return null;
        }

        // Try to get value from old AsyncStorage
        const oldValue = await AsyncStorage.getItem(key);
        if (oldValue) {
            // Migrate to SecureStore
            await SecureStore.setItemAsync(key, oldValue);
            // Remove from AsyncStorage
            await AsyncStorage.removeItem(key);
            return oldValue;
        }
    } catch {
        // Migration failed, will retry on next access
    }
    return null;
}

async function markMigrationComplete(): Promise<void> {
    try {
        await SecureStore.setItemAsync(MIGRATION_KEY, 'true');
        migrationDone = true;
    } catch {
        // Will retry on next setItem
    }
}

export const SecureStorageAdapter = {
    async getItem(key: string): Promise<string | null> {
        try {
            // First try SecureStore
            const secureValue = await SecureStore.getItemAsync(key);
            if (secureValue) {
                return secureValue;
            }

            // If not found, try migrating from AsyncStorage
            const migratedValue = await migrateFromAsyncStorage(key);
            if (migratedValue) {
                return migratedValue;
            }

            return null;
        } catch {
            // Fallback to AsyncStorage if SecureStore fails (e.g., device locked on iOS)
            // Note: This is a security trade-off for reliability
            return AsyncStorage.getItem(key);
        }
    },

    async setItem(key: string, value: string): Promise<void> {
        try {
            await SecureStore.setItemAsync(key, value, {
                keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY
            });
            // Mark migration as complete when we successfully set a value
            await markMigrationComplete();
        } catch {
            // Fallback to AsyncStorage if SecureStore fails (e.g., device locked on iOS)
            // Note: This is a security trade-off for reliability
            await AsyncStorage.setItem(key, value);
        }
    },

    async removeItem(key: string): Promise<void> {
        try {
            await SecureStore.deleteItemAsync(key);
            // Also remove from AsyncStorage in case it exists there
            await AsyncStorage.removeItem(key);
        } catch {
            // Ensure item is removed from AsyncStorage even if SecureStore fails
            await AsyncStorage.removeItem(key);
        }
    },
};
