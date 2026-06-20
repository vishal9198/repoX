import dotenv from "dotenv";
import { z } from "zod";

// Load environment variables from the .env file
dotenv.config();

// Define the configuration schema using Zod
const configSchema = z.object({
  PORT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default(8000), // possible error might be in future
  GROQ_API_KEY: z.string().default(""),
  GROQ_MODEL: z.string().default("llama-3.1-8b-instant"),
  OLLAMA_BASE_URL: z.string().default("http://localhost:11434"),
  OLLAMA_MODEL: z.string().default("llama3"),
  GITHUB_TOKEN: z.string().default(""),
  CHROMA_HOST: z.string().default("localhost"),
  CHROMA_PORT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default(8001),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

// Validate process.env against the schema
const parseConfig = () => {
  const result = configSchema.safeParse(process.env);

  if (!result.success) {
    console.error("Invalid environment configuration:");
    console.error(JSON.stringify(result.error.format(), null, 2));
    process.exit(1);
  }

  return result.data;
};

export const config = parseConfig();
export type Config = z.infer<typeof configSchema>;
