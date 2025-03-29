import { useEffect, useState, useRef } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import { createClient, Challenge } from "@openauthjs/openauth/client"; // Import Challenge type if using PKCE

// --- Configuration ---
const AUTH_ISSUER_URL = "http://localhost:3001"; // Base URL of the issuer mounted path

// Redirect URI: Where the user is sent back *TO* after authentication.
// Must be consistent between authorize and exchange.
// Using root path is common for SPAs handling callback on any page load via useEffect.
const REDIRECT_URI = window.location.origin + "/";
// --- ---

// --- OpenAuth Client ---
const client = createClient({
  // clientID: Required by createClient according to ClientInput docs
  clientID: "frontend-app",
  // issuer: Required by createClient
  issuer: AUTH_ISSUER_URL,
});
// --- ---

// --- Token Storage (localStorage) ---
// (saveTokens, clearTokens, getTokens functions remain the same)
function saveTokens(access: string, refresh?: string) {
  localStorage.setItem("access_token", access);
  if (refresh) {
    localStorage.setItem("refresh_token", refresh);
  } else {
    localStorage.removeItem("refresh_token");
  }
  console.log("[Frontend] Tokens saved to localStorage");
}
function clearTokens() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  console.log("[Frontend] Tokens cleared from localStorage");
}
function getTokens(): { access: string | null; refresh: string | null } {
  return {
    access: localStorage.getItem("access_token"),
    refresh: localStorage.getItem("refresh_token"),
  };
}
// --- ---

// --- Auth Actions ---
async function login() {
  console.log("[Frontend] Initiating login (code flow)...");
  try {
    // Standard Code Flow (no PKCE for this example, add if needed)
    const { url } = await client.authorize(REDIRECT_URI, "code");
    console.log("[Frontend] Redirecting to authorization URL:", url);
    window.location.href = url;

    /* // --- PKCE Flow Example (if you want to enable it) ---
       console.log("[Frontend] Initiating login (PKCE flow)...");
       const { url, challenge } = await client.authorize(REDIRECT_URI, "code", { pkce: true });
       // Store challenge securely (sessionStorage is okay for demo)
       sessionStorage.setItem("pkce_challenge", JSON.stringify(challenge));
       console.log("[Frontend] Stored PKCE challenge:", challenge);
       console.log("[Frontend] Redirecting to authorization URL:", url);
       window.location.href = url;
    */
  } catch (error) {
    console.error("[Frontend] Error initiating authorization:", error);
  }
}

function logout() {
  console.log("[Frontend] Logging out...");
  clearTokens();
  // sessionStorage.removeItem("pkce_challenge"); // Clear PKCE challenge if used
  window.location.href = "/";
}
// --- ---

// --- React Component ---
function App() {
  const [authStatus, setAuthStatus] = useState<boolean | null>(null);
  const isHandlingCallback = useRef(false);

  useEffect(() => {
    const handleAuthFlow = async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");
      const errorDescription = url.searchParams.get("error_description");

      // --- Handle OAuth Callback ---
      if (code && !isHandlingCallback.current) {
        isHandlingCallback.current = true;
        console.log("[Frontend] Callback: Code found:", code);
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );

        console.log("[Frontend] Callback: Exchanging code...");
        try {
          // Standard Code Flow exchange
          const exchanged = await client.exchange(code, REDIRECT_URI);

          /* // --- PKCE Flow Exchange Example ---
              const challengeString = sessionStorage.getItem("pkce_challenge");
              if (!challengeString) {
                 throw new Error("PKCE challenge not found in sessionStorage.");
              }
              const challenge: Challenge = JSON.parse(challengeString);
              console.log("[Frontend] Callback: Using PKCE verifier:", challenge.verifier);
              const exchanged = await client.exchange(code, REDIRECT_URI, challenge.verifier);
              sessionStorage.removeItem("pkce_challenge"); // Clean up challenge
           */

          if (exchanged.err) {
            console.error(
              "[Frontend] Callback Error:",
              exchanged.err,
              exchanged.error_description
            );
            clearTokens();
            setAuthStatus(false);
          } else {
            console.log(
              "[Frontend] Callback: Exchange successful!",
              exchanged.tokens
            );
            saveTokens(exchanged.tokens.access, exchanged.tokens.refresh);
            setAuthStatus(true);
          }
        } catch (exchangeError) {
          console.error("[Frontend] Callback Critical:", exchangeError);
          clearTokens();
          setAuthStatus(false);
        } finally {
          isHandlingCallback.current = false;
        }
        return; // Handled callback
      } else if (error) {
        console.error("[Frontend] Callback Error:", error, errorDescription);
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );
        clearTokens();
        // sessionStorage.removeItem("pkce_challenge"); // Clear PKCE challenge if used
        setAuthStatus(false);
        return; // Handled error
      }

      // --- Handle Initial Load ---
      if (!isHandlingCallback.current && authStatus === null) {
        const { access } = getTokens();
        if (access) {
          console.log(
            "[Frontend] Initial Load: Token found. Assuming logged in."
          );
          // TODO: Verify token for real applications (check expiry, call userinfo)
          setAuthStatus(true);
        } else {
          console.log("[Frontend] Initial Load: No token found.");
          setAuthStatus(false);
        }
      }
    };

    handleAuthFlow();
  }, [authStatus]);

  // --- Render Logic (same as before) ---
  const renderContent = () => {
    if (authStatus === null) {
      return <p>Loading...</p>;
    }
    if (authStatus === true) {
      return (
        <div>
          <p>Status: Logged In</p>
          <button onClick={logout}>Logout</button>
        </div>
      );
    }
    return (
      <div>
        <p>Status: Logged Out</p>
        <button onClick={login}>Login</button>
      </div>
    );
  };
  // --- ---

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank" rel="noreferrer">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank" rel="noreferrer">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React + OpenAuthJS</h1>
      <div className="card">{renderContent()}</div>
      <p className="read-the-docs">Click logos to learn more</p>
    </>
  );
}

export default App;
// --- ---
