import { AI_CATEGORIES } from "@/constants/categories";
import { PRICING_MODELS } from "@/constants/pricing";
import { ColumnSchema } from "../schema";
import { subMinutes } from "date-fns";
import { REGIONS } from "@/constants/region";

const DAYS = 20;

// AI Tool company names and tool names
const AI_COMPANIES = [
  "OpenAI", "Google", "Microsoft", "Anthropic", "Stability AI", "Midjourney", "Hugging Face",
  "Cohere", "Anyscale", "Replicate", "Scale AI", "Databricks", "Weights & Biases",
  "Together AI", "Cerebras", "Inflection AI", "Mistral AI", "Claude AI", "Perplexity AI"
];

const AI_TOOLS = [
  "GPT-4", "Gemini", "Copilot", "Claude", "DALL-E", "Midjourney", "Stable Diffusion",
  "ChatGPT", "Bard", "Llama", "Mistral", "Cohere", "Anthropic", "Hugging Face", "Replicate"
];

const CITIES = [
  "San Francisco", "New York", "London", "Toronto", "Berlin", "Paris", "Tokyo",
  "Singapore", "Sydney", "Amsterdam", "Seattle", "Austin", "Boston", "Chicago"
];

function getRandomRating(): number {
  // Generate rating between 1.0 and 5.0, weighted towards higher ratings
  const rand = Math.random();
  if (rand < 0.1) return Math.round((1 + Math.random() * 1) * 10) / 10; // 1.0-2.0
  if (rand < 0.3) return Math.round((2 + Math.random() * 1) * 10) / 10; // 2.0-3.0
  if (rand < 0.6) return Math.round((3 + Math.random() * 1) * 10) / 10; // 3.0-4.0
  return Math.round((4 + Math.random() * 1) * 10) / 10; // 4.0-5.0
}

function getRandomMonthlyUsers(): number {
  // Generate monthly users between 1K and 100M, log distribution
  const rand = Math.random();
  if (rand < 0.3) return Math.floor(Math.random() * 10000) + 1000; // 1K-10K
  if (rand < 0.6) return Math.floor(Math.random() * 90000) + 10000; // 10K-100K
  if (rand < 0.8) return Math.floor(Math.random() * 900000) + 100000; // 100K-1M
  return Math.floor(Math.random() * 99000000) + 1000000; // 1M-100M
}


function getRandomDescription(): string {
  const descriptions = [
    "Advanced AI-powered language model for natural conversations",
    "Cutting-edge computer vision technology for image analysis",
    "Revolutionary generative AI for creative content creation",
    "Powerful machine learning platform for data scientists",
    "State-of-the-art speech recognition and synthesis",
    "Intelligent recommendation system for personalized experiences",
    "Comprehensive data analytics and visualization tools",
    "Automated workflow optimization and task management",
    "Conversational AI for customer service and support",
    "High-quality image generation from text descriptions"
  ];
  return descriptions[Math.floor(Math.random() * descriptions.length)];
}

function getRandomAITool(): {
  companyName: string;
  toolName: string;
  category: (typeof AI_CATEGORIES)[number];
  pricingModel: (typeof PRICING_MODELS)[number];
  foundedYear: number;
  headquarters: string;
  website: string;
} {
  const companyName = AI_COMPANIES[Math.floor(Math.random() * AI_COMPANIES.length)];
  const toolName = AI_TOOLS[Math.floor(Math.random() * AI_TOOLS.length)];
  const category = AI_CATEGORIES[Math.floor(Math.random() * AI_CATEGORIES.length)];
  const pricingModel = PRICING_MODELS[Math.floor(Math.random() * PRICING_MODELS.length)];
  const foundedYear = Math.floor(Math.random() * 10) + 2014; // 2014-2024
  const headquarters = CITIES[Math.floor(Math.random() * CITIES.length)];
  const website = `https://${companyName.toLowerCase().replace(/\s+/g, '')}.com`;

  return {
    companyName,
    toolName,
    category,
    pricingModel,
    foundedYear,
    headquarters,
    website,
  };
}

// Regional popularity multipliers for AI tools
const regionalMultiplier: Record<(typeof REGIONS)[number], number> = {
  ams: 1.2, // Europe - high adoption
  iad: 1.0, // US East - baseline
  gru: 0.7, // South America - lower adoption
  syd: 0.9, // Australia - moderate adoption
  fra: 1.1, // Europe - high adoption
  hkg: 1.3, // Asia - very high adoption
};

export function createMockData({
  minutes = 0,
}: {
  size?: number;
  minutes?: number;
}): ColumnSchema[] {
  const date = subMinutes(new Date(), minutes);

  // Generate base AI tool data
  const aiTool = getRandomAITool();

  // Generate regional availability and user counts
  const regions = REGIONS.filter(() => Math.random() > 0.3); // 70% chance of being available in each region
  if (regions.length === 0) regions.push("iad"); // Ensure at least one region

  return regions.map((region) => ({
    uuid: crypto.randomUUID(),
    regions: [region],
    date,
    rating: getRandomRating(),
    monthlyUsers: Math.floor(getRandomMonthlyUsers() * regionalMultiplier[region]),
    description: getRandomDescription(),
    latency: Math.floor(Math.random() * 1000) + 50, // Random latency between 50-1050ms
    level: ["info", "warn", "error"][Math.floor(Math.random() * 3)],
    status: [200, 201, 400, 404, 500][Math.floor(Math.random() * 5)],
    method: ["GET", "POST", "PUT", "DELETE"][Math.floor(Math.random() * 4)],
    host: ["api.example.com", "app.example.com", "data.example.com"][Math.floor(Math.random() * 3)],
    pathname: ["/api/v1/users", "/api/v1/data", "/api/v1/analytics", "/health"][Math.floor(Math.random() * 4)],
    timing: {
      dns: Math.floor(Math.random() * 100),
      connection: Math.floor(Math.random() * 200),
      tls: Math.floor(Math.random() * 50),
      ttfb: Math.floor(Math.random() * 500),
      transfer: Math.floor(Math.random() * 300),
    },
    ...aiTool,
  }));
}

export const mock = Array.from({ length: DAYS * 24 })
  .map((_, i) => createMockData({ minutes: i * 60 }))
  .reduce((prev, curr) => prev.concat(curr), []) satisfies ColumnSchema[];

export const mockLive = Array.from({ length: 10 })
  // REMINDER: do not use random, otherwise data needs to be sorted
  .map((_, i) => createMockData({ minutes: -((i + 1) * 0.3) }))
  .reduce((prev, curr) => prev.concat(curr), [])
  .reverse() satisfies ColumnSchema[];
