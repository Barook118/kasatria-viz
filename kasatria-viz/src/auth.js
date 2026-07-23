/**
 * auth.js — Google OAuth 2.0 via Google Identity Services (GIS)
 *
 * Uses the newer GIS library (accounts.google.com/gsi/client) which renders
 * a proper "Sign in with Google" button and calls our callback with a JWT
 * credential. We decode the JWT client-side to extract name/picture.
 *
 * Setup checklist (Google Cloud Console):
 *  1. Create a project at https://console.cloud.google.com/
 *  2. APIs & Services → OAuth consent screen → External → fill in app name/email
 *  3. APIs & Services → Credentials → Create → OAuth 2.0 Client ID → Web application
 *  4. Add your domain to "Authorised JavaScript origins":
 *       http://localhost:5173          (for local dev)
 *       https://your-deployed-domain   (for production)
 *  5. Copy the Client ID → paste into .env as VITE_GOOGLE_CLIENT_ID
 */

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

/**
 * Initialises the GIS library, injects the Sign-In button into
 * #google-signin-btn, and wires up the data-client_id on the One Tap div.
 *
 * @param {function(UserProfile): void} onSuccess - called after successful login
 *
 * @typedef {Object} UserProfile
 * @property {string} name
 * @property {string} email
 * @property {string} picture
 */
export function initAuth(onSuccess) {
  if (!CLIENT_ID) {
    console.error(
      '[auth] VITE_GOOGLE_CLIENT_ID is not set. ' +
      'Copy .env.example → .env and add your Client ID.'
    );
    // Show a helpful error on the login card instead of silently failing
    showAuthError('Google Client ID is not configured. See .env.example.');
    return;
  }

  // Patch the data-client_id attribute on the One Tap div dynamically,
  // because we can't read env vars at HTML parse time.
  const onloadDiv = document.getElementById('g_id_onload');
  if (onloadDiv) {
    onloadDiv.dataset.clientId = CLIENT_ID;
  }

  // Wait for the GIS script to be ready (it loads async)
  waitForGIS(() => {
    // Initialise GIS
    window.google.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback:  (response) => handleCredentialResponse(response, onSuccess),
      auto_select: false,
    });

    // Render the styled sign-in button
    window.google.accounts.id.renderButton(
      document.getElementById('google-signin-btn'),
      {
        theme:  'filled_blue',
        size:   'large',
        shape:  'pill',
        width:  260,
        text:   'signin_with',
        logo_alignment: 'left',
      }
    );
  });
}

/**
 * Handles the JWT credential returned by GIS after a successful login.
 * Decodes the JWT payload (no signature verification needed client-side —
 * the token came directly from Google over TLS).
 *
 * @param {{ credential: string }} response
 * @param {function(UserProfile): void} onSuccess
 */
function handleCredentialResponse(response, onSuccess) {
  try {
    const profile = decodeJWT(response.credential);
    // Persist session in sessionStorage so a page refresh keeps the user in
    sessionStorage.setItem('gis_user', JSON.stringify(profile));
    onSuccess(profile);
  } catch (err) {
    console.error('[auth] Failed to decode credential JWT:', err);
    showAuthError('Login failed — could not decode credentials.');
  }
}

/**
 * Checks sessionStorage for an existing session.
 * Returns the stored UserProfile or null.
 *
 * @returns {UserProfile|null}
 */
export function getStoredUser() {
  try {
    const raw = sessionStorage.getItem('gis_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Clears the stored session and reloads the page, sending the user
 * back to the login screen.
 */
export function signOut() {
  sessionStorage.removeItem('gis_user');
  // Also revoke the GIS session if the library is loaded
  if (window.google?.accounts?.id) {
    window.google.accounts.id.disableAutoSelect();
  }
  window.location.reload();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Decodes the payload section of a JWT (base64url → JSON).
 * Does NOT verify the signature — that's fine for client-side profile display.
 *
 * @param {string} token
 * @returns {UserProfile}
 */
function decodeJWT(token) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT format');

  // Base64url → base64 → decode
  const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const json    = decodeURIComponent(
    atob(base64)
      .split('')
      .map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
      .join('')
  );

  const payload = JSON.parse(json);
  return {
    name:    payload.name    || payload.email,
    email:   payload.email   || '',
    picture: payload.picture || '',
  };
}

/**
 * Polls until window.google is available (GIS script loaded async).
 *
 * @param {function(): void} callback
 * @param {number} [maxWait=10000] milliseconds before giving up
 */
function waitForGIS(callback, maxWait = 10_000) {
  const start    = Date.now();
  const interval = setInterval(() => {
    if (window.google?.accounts?.id) {
      clearInterval(interval);
      callback();
    } else if (Date.now() - start > maxWait) {
      clearInterval(interval);
      showAuthError('Google Sign-In library failed to load. Check your internet connection.');
    }
  }, 100);
}

/**
 * Displays an error message inside the login card.
 *
 * @param {string} message
 */
function showAuthError(message) {
  const btn = document.getElementById('google-signin-btn');
  if (btn) {
    btn.innerHTML = `<p style="color:#e94560;font-size:0.8rem;margin-top:8px;">${message}</p>`;
  }
}
