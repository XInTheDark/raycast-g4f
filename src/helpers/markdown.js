// Convert markdown so that it is rendered as plain text.
// Useful because Detail only supports markdown, and sometimes we want to show plain text.
// The updated approach simply wraps the entire text in a code block, which is more reliable.
export function plainTextMarkdown(text) {
  // Determine the maximum number of consecutive backticks in the text.
  let maxConsecutive = 0;
  let current = 0;

  for (let i = 0; i < text.length; i++) {
    if (text[i] === "`") {
      current++;
      if (current > maxConsecutive) {
        maxConsecutive = current;
      }
    } else {
      current = 0;
    }
  }

  // The fence must be longer than any sequence of backticks in the text.
  // Standard markdown requires at least three backticks to open a code block.
  const fenceLength = Math.max(3, maxConsecutive + 1);
  const fence = "`".repeat(fenceLength);

  return `${fence}\n${text}\n${fence}`;
}
