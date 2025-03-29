import { Hono } from 'hono'
import { createClient } from "@openauthjs/openauth/client"
import { object, string } from "valibot"
import { createSubjects } from "@openauthjs/openauth/subject"

// Define subjects (same as auth server)
const subjects = createSubjects({
  user: object({
    id: string(),
    email: string(),
  }),
})

// Create OpenAuth client
const client = createClient({
  clientID: "hono-app",
  issuer: "http://localhost:3001/auth",
})

// Create Hono app
const app = new Hono()

// Session middleware
app.use('*', async (c, next) => {
  // Get tokens from cookies
  const accessToken = c.req.cookie('access_token')
  const refreshToken = c.req.cookie('refresh_token')
  
  // Verify tokens if they exist
  if (accessToken) {
    const verified = await client.verify(subjects, accessToken, {
      refresh: refreshToken,
    })
    
    if (!verified.err) {
      // Update tokens if refreshed
      if (verified.tokens) {
        c.cookie('access_token', verified.tokens.access, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'Lax',
          maxAge: 60 * 60 * 24 * 30, // 30 days
        })
        c.cookie('refresh_token', verified.tokens.refresh, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'Lax',
          maxAge: 60 * 60 * 24 * 30, // 30 days
        })
      }
      
      // Add user to context
      c.set('user', verified.subject)
    }
  }
  
  await next()
})

// Home route
app.get('/', (c) => {
  const user = c.get('user')
  
  if (user) {
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Hono with OpenAuth</title>
          <style>
            body { font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            .button { padding: 10px 20px; background: #333; color: white; border: none; border-radius: 4px; cursor: pointer; }
          </style>
        </head>
        <body>
          <h1>Welcome ${user.properties.email}!</h1>
          <p>You are logged in with ID: ${user.properties.id}</p>
          <form action="/logout" method="post">
            <button type="submit" class="button">Logout</button>
          </form>
        </body>
      </html>
    `)
  }
  
  return c.html(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Hono with OpenAuth</title>
        <style>
          body { font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          .button { padding: 10px 20px; background: #333; color: white; border: none; border-radius: 4px; cursor: pointer; }
        </style>
      </head>
      <body>
        <h1>Welcome to Hono with OpenAuth</h1>
        <p>Please login to continue</p>
        <form action="/login" method="post">
          <button type="submit" class="button">Login with OpenAuth</button>
        </form>
      </body>
    </html>
  `)
})

// Login route
app.post('/login', async (c) => {
  const { url } = await client.authorize(`${c.req.url.origin}/callback`)
  return c.redirect(url)
})

// Callback route
app.get('/callback', async (c) => {
  const code = c.req.query('code')
  if (!code) return c.text('Missing code', 400)
  
  const exchanged = await client.exchange(code, `${c.req.url.origin}/callback`)
  if (exchanged.err) return c.text('Authentication failed', 400)
  
  // Set cookies
  c.cookie('access_token', exchanged.tokens.access, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })
  c.cookie('refresh_token', exchanged.tokens.refresh, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })
  
  return c.redirect('/')
})

// Logout route
app.post('/logout', (c) => {
  // Clear cookies
  c.cookie('access_token', '', { maxAge: 0 })
  c.cookie('refresh_token', '', { maxAge: 0 })
  return c.redirect('/')
})

export default {
  port: 3000,
  fetch: app.fetch,
}