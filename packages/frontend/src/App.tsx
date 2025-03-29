import React, { useEffect, useState, useRef } from 'react';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import './App.css';
import { createClient } from "@openauthjs/openauth/client";

const client = createClient({
  clientID: "my-client",
  issuer: "http://localhost:3000",
});

function setTokens(access: string, refresh: string) {
  document.cookie = `access_token=${access}; SameSite=Lax; Path=/; Max-Age=34560000`;
  document.cookie = `refresh_token=${refresh}; SameSite=Lax; Path=/; Max-Age=34560000`;
}

function clearTokens() {
  document.cookie = "access_token=; Path=/; Max-Age=0";
  document.cookie = "refresh_token=; Path=/; Max-Age=0";
}

function getCookies() {
  const cookies: Record<string, string> = {};
  document.cookie.split(';').forEach(cookie => {
    const [name, value] = cookie.split('=').map(c => c.trim());
    cookies[name] = value;
  });
  return cookies;
}

async function authenticate() {
  console.log("Checking authentication...");
  const cookies = getCookies();
  const accessToken = cookies["access_token"];
  const refreshToken = cookies["refresh_token"];

  if (!accessToken) {
    console.log("No access token found, redirecting to login...");
    login(); // Call login() to redirect
    return false;
  }

  console.log("Verifying access token...");
  try {
    const verified = await client.verify({}, accessToken, { refresh: refreshToken });

    if (verified.err) {
      console.error("Verification failed:", verified.err);
      if (refreshToken) {
        console.log("Attempting token refresh...");
        const refreshed = await client.refresh(refreshToken);
        if (refreshed.err) {
          console.error("Token refresh failed:", refreshed.err);
          clearTokens();
          return false;
        }
        if (refreshed.tokens) {
          setTokens(refreshed.tokens.access, refreshed.tokens.refresh);
          return refreshed.tokens.access;
        }
        clearTokens();
        return false;
      }
      clearTokens();
      return false;
    }

    console.log("Authentication successful. Subject:", verified.subject);
    return verified.subject;
  } catch (error) {
       console.error("Error during verification:", error);
       clearTokens();
       return false;
  }
}

async function login() {
  console.log("Initiating login...");
  const host = window.location.host;
  const protocol = host.includes("localhost") ? "http" : "https";
  const redirectUri = `${protocol}://${host}/api/callback`;

  const { url } = await client.authorize(redirectUri, "code");
  console.log("Redirecting to authorization URL:", url);
  window.location.href = url;
}

function logout() {
  console.log("Clearing tokens and redirecting to home...");
  clearTokens();
  window.location.href = "/";
}

function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const exchangedCodeRef = useRef(null);
  const hasCodeInUrlRef = useRef(false);
  const isAuthenticatingRef = useRef(false);

  const exchangeAuthCode = async (code, redirectUri) => {
    console.log("exchangeAuthCode called with code:", code);

    if (exchangedCodeRef.current === code) {
      console.log("Code already exchanged, skipping.");
      return;
    }

    console.log("Authorization Code found, exchanging for tokens...");
    try {
      const exchanged = await client.exchange(code, redirectUri);
      if (exchanged.err) {
        console.error("Error exchanging code:", exchanged.err);
      } else {
        console.log("Token exchange successful!");
        setTokens(exchanged.tokens.access, exchanged.tokens.refresh);
        window.history.replaceState({}, document.title, window.location.origin);
        setAuthenticated(true);
        exchangedCodeRef.current = code;
        console.log("exchangedCodeRef.current set to:", code);
      }
    } catch (error) {
      console.error("Error during token exchange:", error);
    }
  };

  useEffect(() => {
    const handleAuth = async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
  
      if (code) {
        console.log("Authorization code found:", code);
  
        // Entferne den Code aus der URL, um doppelte Abrufe zu verhindern
        window.history.replaceState({}, document.title, url.origin);
  
        console.log("Exchanging code:", code);
        const exchanged = await client.exchange(code, `${url.origin}/api/callback`);
  
        if (exchanged.err) {
          console.error("Error exchanging code:", exchanged.err);
          return;
        }
  
        setTokens(exchanged.tokens.access, exchanged.tokens.refresh);
        setAuthenticated(true);
      }
    };
  
    handleAuth();
  }, []);

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        {authenticated ? (
          <button onClick={logout}>Logout</button>
        ) : (
          <button onClick={login}>Login</button>
        )}
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  );
}

export default App;
