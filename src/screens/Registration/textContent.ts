/**
 * Registration screen — sign-up form with validation messages.
 */
const textContent = {
  brandName: 'SIMBA',
  tagline: 'Create your account',
  namePlaceholder: 'Full Name',
  emailPlaceholder: 'Email',
  passwordPlaceholder: 'Password',
  confirmPasswordPlaceholder: 'Confirm Password',
  createAccount: 'Create Account',
  signInPrompt: "Already have an account? ",
  signIn: 'Sign In',
  validationName: 'Please enter your name.',
  validationEmail: 'Please enter your email address.',
  validationPassword: 'Please enter a password.',
  validationPasswordLength: 'Password must be at least 6 characters.',
  validationPasswordMatch: 'Passwords do not match.',
  registrationFailed: 'Registration failed',
} as const;

export default textContent;
