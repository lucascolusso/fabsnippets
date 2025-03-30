/**
 * CodeEditor Component
 * 
 * A streamlined code editor component that provides consistent styling for code snippets
 * throughout the application. This component serves as a foundation for code input and display,
 * optimized for both editing and viewing experiences.
 * 
 * Architecture Notes:
 * ------------------
 * This is an intentionally lightweight component that wraps the base Textarea element
 * from shadcn/ui. It focuses on presentation rather than advanced editing features,
 * prioritizing consistency and simplicity.
 * 
 * Key Features:
 * - Monospace font styling for proper code presentation
 * - Dark theme optimized for code readability
 * - Responsive height based on mode (edit vs. read-only)
 * - Consistent styling across the application
 * 
 * Usage Contexts:
 * - NewSnippetModal: For creating new code snippets
 * - SnippetCard: For displaying and editing existing snippets
 * - Comments: For code snippets within comment replies
 * 
 * Height Behavior:
 * - When in read-only mode: Uses flexible height (min-h-0, flex-1) with smaller text
 * - When in edit mode: Uses full height (h-full) of parent container with regular text size
 *   Note: The parent container in SnippetCard.tsx sets a fixed height of 160px
 * 
 * For Future Consideration:
 * - Integration with a full-featured code editor like Monaco or CodeMirror
 * - Syntax highlighting based on selected language/category
 * - Line numbering for improved readability
 * - Code folding for longer snippets
 */
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

/**
 * Interface for the CodeEditor component props
 * 
 * @property value - The code content to display or edit
 * @property onChange - Callback function when code content changes
 * @property readOnly - Whether the editor is in read-only mode
 * @property className - Additional CSS classes to apply
 */
interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  className?: string;
}

/**
 * CodeEditor component implementation
 * 
 * This component renders a styled textarea for code input and display.
 * It adapts its styling based on whether it's in edit or read-only mode.
 */
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
        // Base styling for all modes
        "font-mono leading-relaxed resize-none focus:ring-1 focus:ring-primary",
        "font-['JetBrains_Mono',Menlo,Monaco,Consolas,monospace]",
        "border-0 bg-[#1A1A1B]", // Darker background color and no border
        
        // Conditional styling based on mode:
        // - For read-only mode: Use flexible height with smaller text
        // - For edit mode: Use full height of parent container with regular text size
        readOnly ? "min-h-0 flex-1 text-[14px]" : "h-full text-base",
        
        // Apply any custom classes passed from parent
        className
      )}
      placeholder="Paste your code here..."
    />
  );
}