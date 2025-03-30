import { issuer } from "@openauthjs/openauth"
import { CodeUI } from "@openauthjs/openauth/ui/code"
import { createSubjects } from "@openauthjs/openauth/subject"
import { CodeProvider } from "@openauthjs/openauth/provider/code"

import { object, string } from "valibot"
import { MemoryStorage } from "@openauthjs/openauth/storage/memory"

async function getUser(email: string) {
  // Get user from database and return user ID
  return "123"
}



const subjects = createSubjects({
  user: object({
    userID: string(),
    workspaceID: string(),
  }),
})

const app = issuer({
  providers: {
    code: CodeProvider(
      CodeUI({
        sendCode: async (email, code) => {
          console.log(email, code)
        },
      }),
    ),
  },
  storage: MemoryStorage(),
  subjects,
  success: async (ctx, value) => {
    if (value.provider === "code") {
      return ctx.subject("user", {
        userID: value.claims.email ? await getUser(value.claims.email) : "",
        workspaceID: ""
      })
    }
    throw new Error("Invalid provider")
  },
})

console.log("Hello via Bun!");

export default app