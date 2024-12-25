export const handleWordProgress = async (supabase, wordId, isCorrect) => {
  try {
    const { data: word } = await supabase
      .from('words')
      .select('correct_answers, incorrect_answers')
      .eq('id', wordId)
      .single();

    if (!word) return;

    const correct_answers = word.correct_answers + (isCorrect ? 1 : 0);
    const incorrect_answers = word.incorrect_answers + (isCorrect ? 0 : 1);
    const total_attempts = correct_answers + incorrect_answers;
    const mastery_level = Math.round((correct_answers / total_attempts) * 100);

    await supabase
      .from('words')
      .update({
        correct_answers,
        incorrect_answers,
        mastery_level,
        last_result: isCorrect,
        last_practiced: new Date()
      })
      .eq('id', wordId);
  } catch (error) {
    console.error('Error updating word progress:', error);
  }
};
