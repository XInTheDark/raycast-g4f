import useGPT from "./api/gpt";

export default function FindSynonym(props) {
  return useGPT(props, {
    context:
      "Find a list of synonyms for the given word, separated in bullet points. Only return the synonyms, and add nothing else. " +
      "Keep the casing of the word the same. Your response should only return the BULLET POINTS of the synonyms.",
    allowPaste: true,
  });
}
