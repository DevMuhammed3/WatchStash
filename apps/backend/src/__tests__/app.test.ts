import { test , expect } from "bun:test"
import request from "supertest";
import App from "../app.js"

const app = App()

test("GET / return success", async () => {
  const response = await request(app).get("/")

  expect(response.status).toBe(200);
  expect(response.body.message).toBe("WatchStash API is up and running!")
})
