import { Hono } from 'hono'
import { issuer } from "@openauthjs/openauth"
import { CodeUI } from "@openauthjs/openauth/ui/code"
import { CodeProvider } from "@openauthjs/openauth/provider/code"
import { MemoryStorage } from "@openauthjs/openauth/storage/memory"
import { object, string } from "valibot"
import { createSubjects } from "@openauthjs/openauth/subject"

// Define subjects
const subjects = createSubjects({
  user: object({
    id: string(),
    email: string(),
  }),
})

// Mock user database
const users = new Map<string, { id: string; email: string }>()

async function getUser(email: string) {
  // Check if user exists
  if (users.has(email)) {
    return users.get(email)!
  }
  
  // Create new user if not exists
  const newUser = { id: crypto.randomUUID(), email }
  users.set(email, newUser)
  return newUser
}

// Create OpenAuth issuer
const authIssuer = issuer({
  subjects,
  storage: MemoryStorage(),
  providers: {
    code: CodeProvider(
      CodeUI({
        sendCode: async (email, code) => {
          console.log(`Login code for ${email}: ${code}`)
          // In production, you would send this via email
        },
      }),
    ),
  },
  success: async (ctx, value) => {
    if (value.provider === "code") {
      const user = await getUser(value.claims.email)
      return ctx.subject("user", {
        id: user.id,
        email: user.email
      })
    }
    throw new Error("Invalid provider")
  },
})

// Create Hono app
const app = new Hono()

// Add OpenAuth routes
app.route('/auth', authIssuer.hono())

// Health check endpoint
app.get('/', (c) => c.json({ status: 'ok' }))

export default {
  port: 3001,
  fetch: app.fetch,
}