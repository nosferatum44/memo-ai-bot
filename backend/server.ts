//@ts-ignore
import express from 'express';
//@ts-ignore
import cors from 'cors';
//@ts-ignore
import TelegramBot from 'node-telegram-bot-api';
//@ts-ignore
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

import { handleStart } from './handlers/startHandler.js';
import { handleAddWord } from './handlers/wordHandler.js';
import { handleBulkImport } from './handlers/bulkImportHandler.js';
import { handlePractice } from './handlers/practiceHandler.js';
import { handleWordProgress } from './handlers/wordProgressHandler';
import { handleWordManagement } from './handlers/wordManagementHandler.js';
import { handleTranslate } from './handlers/translateHandler.js';

dotenv.config();

const app = express();
const port: number = Number(process.env.PORT) || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Initialize bot
const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  throw new Error('TELEGRAM_BOT_TOKEN is not defined');
}

const bot = new TelegramBot(token, { polling: true });

// Command handlers
bot.onText(/\/start/, handleStart(bot));
bot.onText(/\/add|📝 Add Word/, handleAddWord(bot, supabase));
bot.onText(/\/import|📥 Import/, handleBulkImport(bot, supabase));
bot.onText(/\/practice|🔄 Practice/, handlePractice(bot, supabase));
bot.onText(/\/progress|📊 Progress/, handleWordProgress(bot, supabase));
bot.onText(/\/words|📚 Words/, handleWordManagement(bot, supabase));
bot.onText(/\/translate/, handleTranslate(bot));

// Error handling
bot.on('error', (error: Error) => {
  console.error('Telegram bot error:', error);
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// Handle process termination
process.on('SIGINT', () => {
  bot.stopPolling();
  process.exit();
});

process.on('SIGTERM', () => {
  bot.stopPolling();
  process.exit();
});
