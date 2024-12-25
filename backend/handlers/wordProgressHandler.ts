//@ts-ignore
import TelegramBot, { Message } from 'node-telegram-bot-api';
import { SupabaseClient } from '@supabase/supabase-js';
import { mainKeyboard } from '../utils/keyboards.js';

interface WordStats {
  total: number;
  learned: number;
  learning: number;
  new: number;
}

export const handleWordProgress = (bot: TelegramBot, supabase: SupabaseClient) => {
  return async (msg: Message): Promise<void> => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;

    if (!userId) return;

    try {
      // Get total words count
      const { count: totalCount } = await supabase
        .from('words')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Get learned words count (progress >= 100)
      const { count: learnedCount } = await supabase
        .from('words')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('progress', 100);

      // Get learning words count (0 < progress < 100)
      const { count: learningCount } = await supabase
        .from('words')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gt('progress', 0)
        .lt('progress', 100);

      const stats: WordStats = {
        total: totalCount || 0,
        learned: learnedCount || 0,
        learning: learningCount || 0,
        new: (totalCount || 0) - (learnedCount || 0) - (learningCount || 0)
      };

      const message =
        `📊 Your Progress:\n\n` +
        `Total words: ${stats.total}\n` +
        `✅ Learned: ${stats.learned}\n` +
        `📚 Learning: ${stats.learning}\n` +
        `🆕 New: ${stats.new}`;

      await bot.sendMessage(chatId, message, mainKeyboard);
    } catch (error) {
      console.error('Error getting word progress:', error);
      await bot.sendMessage(
        chatId,
        '❌ Failed to get word progress. Please try again.',
        mainKeyboard
      );
    }
  };
};
