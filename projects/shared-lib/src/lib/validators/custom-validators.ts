import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export class CustomValidators {

  /**
   * Validateur d'email strict
   * Exige un format email valide avec extension de domaine d'au moins 2 caractères
   */
  static email(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      const valid = emailRegex.test(control.value);

      return valid ? null : { invalidEmail: true };
    };
  }

  /**
   * Validateur d'email avec domaines interdits
   * @param blockedDomains Liste des domaines à interdire (ex: ['tempmail.com', 'guerrillamail.com'])
   */
  static emailWithBlockedDomains(blockedDomains: string[]): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(control.value)) {
        return { invalidEmail: true };
      }

      const domain = control.value.split('@')[1]?.toLowerCase();
      if (domain && blockedDomains.some(blocked => domain.includes(blocked.toLowerCase()))) {
        return { blockedDomain: true };
      }

      return null;
    };
  }

  /**
   * Validateur de numéro de téléphone
   * Format: +33 6 12 34 56 78 ou 0612345678
   */
  static phone(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const phoneRegex = /^(\+?\d{1,3}[-.\s]?)?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}$/;
      const valid = phoneRegex.test(control.value.replace(/\s/g, ''));

      return valid ? null : { invalidPhone: true };
    };
  }

  /**
   * Validateur de mot de passe fort
   * Exige: minimum 8 caractères, 1 majuscule, 1 minuscule, 1 chiffre, 1 caractère spécial
   */
  static strongPassword(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const hasMinLength = control.value.length >= 6;
      const hasUpperCase = /[A-Z]/.test(control.value);
      const hasLowerCase = /[a-z]/.test(control.value);
      const hasNumber = /\d/.test(control.value);
      const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(control.value);

      const valid = hasMinLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;

      if (!valid) {
        return {
          weakPassword: {
            hasMinLength,
            hasUpperCase,
            hasLowerCase,
            hasNumber,
            hasSpecialChar
          }
        };
      }

      return null;
    };
  }

  /**
   * Validateur de confirmation de mot de passe
   * @param passwordField Nom du champ mot de passe à comparer
   */
  static passwordMatch(passwordField: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value || !control.parent) {
        return null;
      }

      const password = control.parent.get(passwordField);
      if (!password) {
        return null;
      }

      return control.value === password.value ? null : { passwordMismatch: true };
    };
  }

  /**
   * Validateur d'URL
   */
  static url(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
      const valid = urlRegex.test(control.value);

      return valid ? null : { invalidUrl: true };
    };
  }

  /**
   * Validateur de code postal français
   */
  static frenchPostalCode(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const postalCodeRegex = /^[0-9]{5}$/;
      const valid = postalCodeRegex.test(control.value);

      return valid ? null : { invalidPostalCode: true };
    };
  }

  /**
   * Validateur de SIRET français
   */
  static siret(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const siretRegex = /^[0-9]{14}$/;
      const valid = siretRegex.test(control.value);

      return valid ? null : { invalidSiret: true };
    };
  }

  /**
   * Validateur de longueur min/max personnalisée
   */
  static lengthRange(min: number, max: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const length = control.value.length;
      if (length < min || length > max) {
        return { lengthRange: { min, max, actual: length } };
      }

      return null;
    };
  }

  /**
   * Validateur de caractères alphanumériques uniquement
   */
  static alphanumeric(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const alphanumericRegex = /^[a-zA-Z0-9]+$/;
      const valid = alphanumericRegex.test(control.value);

      return valid ? null : { notAlphanumeric: true };
    };
  }

  /**
   * Validateur pour interdire les espaces
   */
  static noWhitespace(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const hasWhitespace = /\s/.test(control.value);
      return hasWhitespace ? { hasWhitespace: true } : null;
    };
  }

  /**
   * Validateur de valeur minimale (pour les nombres)
   */
  static minValue(min: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (control.value === null || control.value === undefined || control.value === '') {
        return null;
      }

      const value = parseFloat(control.value);
      return value < min ? { minValue: { min, actual: value } } : null;
    };
  }

  /**
   * Validateur de valeur maximale (pour les nombres)
   */
  static maxValue(max: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (control.value === null || control.value === undefined || control.value === '') {
        return null;
      }

      const value = parseFloat(control.value);
      return value > max ? { maxValue: { max, actual: value } } : null;
    };
  }
}
