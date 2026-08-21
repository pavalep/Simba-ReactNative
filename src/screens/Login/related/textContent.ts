/**
 * Login screen — brand tagline and sign-in actions.
 *
 * Note: `brandName` mirrors `BRAND.name` from
 * `src/constants/brand.ts`. If you change it here, change it
 * there too — the constant is the single source of truth. In
 * practice, render `<AppText variant="brandScript">{BRAND.name}</AppText>`
 * in the screen instead of reading from this file.
 */
const textContent = {
  brandName: 'Simba',
  tagline: 'Your media, your way',
  signUpPrompt: "Don't have an account? ",
  signUp: 'Create One',
  googleSignIn: 'Sign in with Google',
} as const;

export default textContent;
