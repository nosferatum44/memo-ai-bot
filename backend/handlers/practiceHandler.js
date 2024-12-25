import { generateSentence } from '../utils/openai.js';

export const handlePractice = (bot, supabase) => async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  try {
    // First, fetch categories
    const { data: categories } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId);

    if (!categories?.length) {
      await bot.sendMessage(chatId, 'You need to add some words first!');
      return;
    }

    let message = 'Choose a category to practice:\n\n';
    message += categories.map((cat, i) => `${i + 1}. ${cat.name}`).join('\n');

    const response = await bot.sendMessage(chatId, message);

    // Wait for category selection
    bot.once('message', async (categoryMsg) => {
      try {
        if (!/^\d+$/.test(categoryMsg.text)) {
          await bot.sendMessage(chatId, '❌ Please select a valid category number.');
          return;
        }

        const index = parseInt(categoryMsg.text) - 1;
        const selectedCategory = categories[index];

        if (!selectedCategory) {
          await bot.sendMessage(chatId, '❌ Invalid category selection.');
          return;
        }

        // Get words for practice
        const { data: words, error } = await supabase
          .from('words')
          .select('*')
          .eq('user_id', userId)
          .eq('category_id', selectedCategory.id)
          .lt('mastery_level', 90)
          .order('last_practiced', { ascending: true })
          .limit(5);

        if (error) throw error;

        if (!words.length) {
          await bot.sendMessage(
            chatId,
            `No words to practice in category "${selectedCategory.name}"! All words are well learned or you need to add new ones.`
          );
          return;
        }

        // Select a word to practice
        const word = words[Math.floor(Math.random() * words.length)];

        // Randomly select practice type
        const practiceTypes = ['translate', 'multiple_choice', 'fill_blank'];
        const practiceType = practiceTypes[Math.floor(Math.random() * practiceTypes.length)];

        switch (practiceType) {
          case 'translate':
            await bot.sendMessage(chatId, `Translate this word: ${word.word}`);
            break;

          case 'multiple_choice':
            const options = words
              .map((w) => w.translation)
              .sort(() => Math.random() - 0.5)
              .slice(0, 4);

            if (!options.includes(word.translation)) {
              options[3] = word.translation;
            }

            const keyboard = {
              reply_markup: {
                keyboard: options.map((option) => [{ text: option }]),
                one_time_keyboard: true
              }
            };

            await bot.sendMessage(
              chatId,
              `Choose the correct translation for: ${word.word}`,
              keyboard
            );
            break;

          case 'fill_blank':
            const sentence = await generateSentence(word.word, word.translation);
            await bot.sendMessage(chatId, sentence);
            break;
        }

        return {
          state: 'practicing',
          wordId: word.id,
          correctAnswer: word.translation,
          practiceType,
          categoryName: selectedCategory.name
        };
      } catch (error) {
        console.error('Category selection error:', error);
        await bot.sendMessage(
          chatId,
          '❌ Failed to start practice. Please try again.',
          mainKeyboard
        );
      }
    });
  } catch (error) {
    console.error('Practice error:', error);
    await bot.sendMessage(chatId, '❌ Failed to start practice. Please try again.', mainKeyboard);
  }
};
