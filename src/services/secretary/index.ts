// AI Secretary Service
// Re-exports all types, constants, and functions for backward compatibility

// Types
export type {
    AISecretarySettings,
    AISecretaryBehavior,
    AISecretaryStats,
    ScheduleEntry,
    ClinicProfessional,
    CustomMessage,
    BlockedNumber,
    PredefinedMessageType,
} from './types';

// Constants
export {
    PREDEFINED_MESSAGE_TYPES,
    DEFAULT_BEHAVIOR_SETTINGS,
    TTS_VOICES,
    PERSONALITY_TONES,
    EMOJI_OPTIONS,
    DAY_NAMES,
    DAY_NAMES_FULL,
    DEFAULT_SETTINGS,
    DEFAULT_BEHAVIOR_PROMPT,
} from './constants';

// Settings CRUD
export {
    getSecretarySettings,
    saveSecretarySettings,
    updateSecretarySetting,
    getSecretaryStats,
    generateBehaviorPrompt,
} from './settings';

// Behavior CRUD
export {
    getBehaviorSettings,
    saveBehaviorSettings,
    updateBehaviorSetting,
    updateBehaviorSettings,
} from './behavior';

// Schedule CRUD
export {
    getScheduleEntries,
    addScheduleEntry,
    updateScheduleEntry,
    deleteScheduleEntry,
    createDefaultSchedule,
} from './schedule';

// Professionals CRUD
export {
    getClinicProfessionals,
    addClinicProfessional,
    updateClinicProfessional,
    deleteClinicProfessional,
} from './professionals';

// Messages CRUD
export {
    getCustomMessages,
    addCustomMessage,
    updateCustomMessage,
    deleteCustomMessage,
    initializePredefinedMessages,
} from './messages';

// Blocked Numbers CRUD
export {
    getBlockedNumbers,
    addBlockedNumber,
    removeBlockedNumber,
} from './blocked';
