import useGPT from "./api/gpt";

export default function Summarize(props) {
  return useGPT(props, {
    context: "Summarize the given text.",
    showFormText: "Text",
    useSelected: true,
    allowUploadFiles: true,
  });
}
