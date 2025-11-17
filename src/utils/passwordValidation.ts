/**
 * Password validation utility
 * Validates that passwords meet security requirements
 */

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  suggestions: string[];
}

export interface PasswordRequirements {
  hasUpperCase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
  meetsAllRequirements: boolean;
}

/**
 * Validates password against security requirements:
 * - At least one uppercase letter
 * - At least one number
 * - At least one special character
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  const suggestions: string[] = [];

  // Check for uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
    suggestions.push('Add an uppercase letter (A-Z)');
  }

  // Check for number
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
    suggestions.push('Add a number (0-9)');
  }

  // Check for special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
    suggestions.push('Add a special character (!@#$%^&*()_+-=[]{};\':"|,.<>/?)');
  }

  return {
    isValid: errors.length === 0,
    errors,
    suggestions,
  };
}

/**
 * Check which password requirements are met
 */
export function checkPasswordRequirements(password: string): PasswordRequirements {
  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  return {
    hasUpperCase,
    hasNumber,
    hasSpecialChar,
    meetsAllRequirements: hasUpperCase && hasNumber && hasSpecialChar,
  };
}

/**
 * Get a user-friendly password requirements message
 */
export function getPasswordRequirementsMessage(): string {
  return 'Password must contain: 1 uppercase letter, 1 number, and 1 special character';
}
