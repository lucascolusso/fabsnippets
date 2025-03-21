/**
 * CodeEditor Component
 * 
 * A customized code editor component based on the Textarea element.
 * This component provides syntax highlighting and styling for code snippets.
 * 
 * Height behavior:
 * - When in read-only mode: Uses flexible height (min-h-0, flex-1) with smaller text
 * - When in edit mode: Uses full height (h-full) of parent container with regular text size
 *   Note: The parent container in SnippetCard.tsx sets a fixed height of 160px
 */
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  className?: string;
}

export function CodeEditor({
  value,
  onChange,
  readOnly = false,
  className
}: CodeEditorProps) {
  return (
    <Textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      readOnly={readOnly}
      className={cn(
        "font-mono leading-relaxed resize-none focus:ring-1 focus:ring-primary",
        "font-['JetBrains_Mono',Menlo,Monaco,Consolas,monospace]",
        "border-0 bg-[#1A1A1B]", // Darker background color and no border
        // Height settings:
        // - For read-only mode: Use flexible height with smaller text
        // - For edit mode: Use full height of parent container (which is set to 160px in SnippetCard)
        readOnly ? "min-h-0 flex-1 text-[14px]" : "h-full text-base",
        className
      )}
      placeholder="Paste your code here..."
    />
  );
}