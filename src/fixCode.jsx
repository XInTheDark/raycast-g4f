import useGPT from "./api/gpt";

export default function FixCode(props) {
  return useGPT(props, {
    context:
      "Fix errors and bugs in the given code, without changing its intended functionality." +
      " ONLY return the fixed code and nothing else. Enclose the entire code in a single code block.",
    useSelected: true,
    showFormText: "Code",
    allowPaste: true,
  });
}
