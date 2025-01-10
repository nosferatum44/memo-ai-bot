import { BUTTONS } from '../../constants/buttons.js';
import { translationStore } from './translateAIHandler.js';

export function handleTranslationCallback(bot, supabase, openai) {
  return async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const userId = callbackQuery.from.id;
    const messageId = callbackQuery.message.message_id;

    // Handle add translation callback
    if (callbackQuery.data.startsWith('add_trans_')) {
      try {
        const translationKey = callbackQuery.data.replace('add_trans_', '');
        const translationData = translationStore.get(translationKey);

        if (!translationData) {
          await bot.answerCallbackQuery(callbackQuery.id, {
            text: '❌ Translation data expired. Please try again.',
            show_alert: true
          });
          return;
        }

        const { word, translation, categoryId } = translationData;

        const { error } = await supabase.from('words').insert([
          {
            user_id: userId,
            category_id: categoryId,
            word: translation,
            translation: word,
            created_at: new Date()
          }
        ]);

        if (error) throw error;

        // Clean up stored data
        translationStore.delete(translationKey);

        // Update the message to show success
        await bot.editMessageText(`✅ Added "${translation} - ${word}" to your vocabulary!`, {
          chat_id: chatId,
          message_id: messageId
        });

        // Answer the callback query
        await bot.answerCallbackQuery(callbackQuery.id, {
          text: 'Word added successfully!'
        });
      } catch (error) {
        console.error('Error adding word:', error);
        await bot.answerCallbackQuery(callbackQuery.id, {
          text: '❌ Failed to add word. Please try again.',
          show_alert: true
        });
      }
    }

    // Handle more examples callback
    if (callbackQuery.data.startsWith('more_examples_')) {
      try {
        const translationKey = callbackQuery.data.replace('more_examples_', '');
        const translationData = translationStore.get(translationKey);

        if (!translationData) {
          await bot.answerCallbackQuery(callbackQuery.id, {
            text: '❌ Translation data expired. Please try again.',
            show_alert: true
          });
          return;
        }

        const { word, translation, contexts } = translationData;

        // Show loading state
        await bot.answerCallbackQuery(callbackQuery.id, {
          text: 'Generating more examples...'
        });
        await bot.sendChatAction(chatId, 'typing');

        const completion = await openai.chat.completions.create({
          messages: [
            {
              role: 'system',
              content:
                'You are a helpful language learning assistant. Provide 5 example sentences using the given word.\n' +
                'Format each example as follows:\n' +
                `1. [Example sentence in ${contexts.learning_context}]\n([translation in ${contexts.original_context}])\n` +
                '[If the sentence contains kanji or Chinese characters, add their reading on the next line in parentheses. Do not add readings for hiragana or katakana.]\n' +
                '\n' +
                'Number each example from 1 to 5.'
            },
            {
              role: 'user',
              content: `Provide 5 different example sentences using the word "${translation}" (${word}). Make the examples progressively more complex. Include English translations for each example.`
            }
          ],
          model: 'gpt-4o'
        });

        const examples = completion.choices[0].message.content;

        // Send examples as a new message with both More Examples and Follow-up buttons
        await bot.sendMessage(chatId, `📝 More examples with "${translation}":\n\n${examples}`, {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: BUTTONS.MORE_EXAMPLES,
                  callback_data: `more_examples_${translationKey}`
                },
                {
                  text: BUTTONS.FOLLOW_UP,
                  callback_data: `translate_followup_${translation}`
                }
              ]
            ]
          }
        });
      } catch (error) {
        console.error('Error generating examples:', error);
        await bot.answerCallbackQuery(callbackQuery.id, {
          text: '❌ Failed to generate examples. Please try again.',
          show_alert: true
        });
      }
    }

    if (callbackQuery.data.startsWith('translate_followup_')) {
      try {
        const word = callbackQuery.data.replace('translate_followup_', '');

        const sentMessage = await bot.sendMessage(chatId, `What would you like to know"?`, {
          reply_markup: { keyboard: [[BUTTONS.CANCEL]], resize_keyboard: true }
        });

        translationStore.set(`followup_${chatId}`, {
          word,
          keyboardMessageId: sentMessage.message_id // Store the message ID
        });

        await bot.answerCallbackQuery(callbackQuery.id);
      } catch (error) {
        console.error('Translation callback error:', error);
        await bot.answerCallbackQuery(callbackQuery.id, {
          text: '❌ Failed to start follow-up. Please try again.',
          show_alert: true
        });
      }
    }
  };
}
