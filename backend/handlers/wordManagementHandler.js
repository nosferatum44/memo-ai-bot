import { createWordActionsKeyboard, mainKeyboard, cancelKeyboard } from '../utils/keyboards.js';

export const handleWordManagement = (bot, supabase) => async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  try {
    const { data: words, error } = await supabase
      .from('words')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!words.length) {
      await bot.sendMessage(chatId, "You haven't added any words yet!");
      return;
    }

    for (const word of words) {
      const progress = word.mastery_level || 0;
      const message = `
📖 ${word.word} - ${word.translation}
📊 Progress: ${progress}%
✅ Correct: ${word.correct_answers || 0}
❌ Incorrect: ${word.incorrect_answers || 0}
🎯 Status: ${progress >= 90 ? 'Learned' : 'Learning'}
`;
      await bot.sendMessage(chatId, message, createWordActionsKeyboard(word.id));
    }
  } catch (error) {
    console.error('Error fetching words:', error);
    await bot.sendMessage(chatId, '❌ Failed to fetch your words.');
  }
};

export const handleWordEdit = (bot, supabase) => async (msg, wordId) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  try {
    const { data: word } = await supabase
      .from('words')
      .select('*')
      .eq('id', wordId)
      .eq('user_id', userId)
      .single();

    if (!word) {
      await bot.sendMessage(chatId, '❌ Word not found.');
      return;
    }

    await bot.sendMessage(
      chatId,
      `Enter new translation for "${word.word}" in format:\n${word.word} - new_translation`,
      cancelKeyboard
    );

    // Set user state for editing
    return { state: 'editing_word', wordId };
  } catch (error) {
    console.error('Error editing word:', error);
    await bot.sendMessage(chatId, '❌ Failed to edit word.');
  }
};

export const handleWordDelete = (bot, supabase) => async (msg, wordId) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  try {
    const { error } = await supabase.from('words').delete().eq('id', wordId).eq('user_id', userId);

    if (error) throw error;

    await bot.sendMessage(chatId, '✅ Word deleted successfully.', mainKeyboard);
  } catch (error) {
    console.error('Error deleting word:', error);
    await bot.sendMessage(chatId, '❌ Failed to delete word.');
  }
};
