import useGPT from "./api/gpt";

export default function Explain(props) {
  return useGPT(props, {
    context: "Explain the following text.",
    showFormText: "Text",
    useSelected: true,
    allowUploadFiles: true,
  });
}
