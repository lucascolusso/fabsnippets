import { Editor } from '@monaco-editor/react';
import { cn } from "@/lib/utils";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  readOnly?: boolean;
  className?: string;
}

export function CodeEditor({
  value,
  onChange,
  language = "javascript",
  readOnly = false,
  className
}: CodeEditorProps) {
  return (
    <div className={cn("w-full h-[300px] border rounded-md", className)}>
      <Editor
        value={value}
        onChange={(value) => onChange(value || "")}
        language={language}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          readOnly,
          fontSize: 14,
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          automaticLayout: true,
        }}
      />
    </div>
  );
}
