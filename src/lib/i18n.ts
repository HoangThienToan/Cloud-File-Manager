// Translation utility for non-React files
import en from '../translations/en.json';
import vi from '../translations/vi.json';

type TranslationKey = string;
type TranslationParams = Record<string, string | number>;

// Get current language from localStorage or default to 'en'
function getCurrentLanguage(): 'en' | 'vi' {
  if (typeof window === 'undefined') return 'en';
  
  try {
    return (localStorage.getItem('language') as 'en' | 'vi') || 'en';
  } catch {
    return 'en';
  }
}

// Get nested value from object using dot notation
function getNestedValue(obj: any, path: string): string | undefined {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

// Translate function for non-React contexts
export function translate(key: TranslationKey, params?: TranslationParams): string {
  const language = getCurrentLanguage();
  const translations = language === 'vi' ? vi : en;
  
  const value = getNestedValue(translations, key);
  
  if (!value) {
    // Fallback to English if key not found in current language
    if (language === 'vi') {
      const fallbackValue = getNestedValue(en, key);
      if (fallbackValue) {
        return interpolate(fallbackValue, params);
      }
    }
    
    // Return key if not found anywhere
    console.warn(`Translation key not found: ${key}`);
    return key;
  }
  
  return interpolate(value, params);
}

// Simple interpolation for {{param}} placeholders
function interpolate(template: string, params?: TranslationParams): string {
  if (!params) return template;
  
  return Object.entries(params).reduce(
    (result, [key, value]) => result.replace(new RegExp(`{{${key}}}`, 'g'), String(value)),
    template
  );
}

// Alias for shorter usage - always returns string
export const t = (key: TranslationKey, params?: TranslationParams): string => {
  return translate(key, params);
};
