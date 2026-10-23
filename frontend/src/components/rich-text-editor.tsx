"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/components/ui/primitives";

/**
 * A small rich-text editor for the email wording.
 *
 * contenteditable with document.execCommand, rather than a library.
 * execCommand is deprecated and every article says so, but it is
 * implemented everywhere, it is the only built-in that handles selections
 * and undo across browsers, and the alternative here is ProseMirror or
 * similar — a large dependency for bold, italic and bullets on a page a
 * hiring manager visits occasionally. The server sanitises whatever comes
 * out of it, so the editor is not the thing standing between a paste and
 * a candidate's inbox.
 *
 * The markup is only read out of the DOM on change, never written back
 * into it while focused: assigning innerHTML to a focused contenteditable
 * puts the caret at the start, which makes typing jump to the beginning
 * of the email after every keystroke.
 */

type Command = {
  label: string;
  /** execCommand name, or a function for the ones it has no command for. */
  run: (exec: (command: string, value?: string) => void) => void;
  icon: React.ReactNode;
  /** The query execCommand answers for "is this on where the caret is". */
  state?: string;
};

const GROUPS: Command[][] = [
  [
    {
      label: "Bold",
      state: "bold",
      run: (exec) => exec("bold"),
      icon: <path d="M6 4h6a4 4 0 0 1 0 8H6zM6 12h7a4 4 0 0 1 0 8H6z" />,
    },
    {
      label: "Italic",
      state: "italic",
      run: (exec) => exec("italic"),
      icon: <path d="M15 4h-5M14 20H9M15 4l-4 16" />,
    },
    {
      label: "Underline",
      state: "underline",
      run: (exec) => exec("underline"),
      icon: <path d="M6 4v6a6 6 0 0 0 12 0V4M5 20h14" />,
    },
    {
      label: "Strikethrough",
      state: "strikeThrough",
      run: (exec) => exec("strikeThrough"),
      icon: <path d="M5 12h14M16 7a4 3 0 0 0-4-2c-2 0-4 1-4 3s2 2.5 4 3M8 17a4 3 0 0 0 4 2c2 0 4-1 4-3" />,
    },
  ],
  [
    {
      label: "Heading 2",
      run: (exec) => exec("formatBlock", "<h2>"),
      icon: <path d="M4 6v12M12 6v12M4 12h8M17 12a2 2 0 1 1 4 0c0 1.5-4 2.5-4 6h4" />,
    },
    {
      label: "Heading 3",
      run: (exec) => exec("formatBlock", "<h3>"),
      icon: <path d="M4 6v12M12 6v12M4 12h8M17 10a2 2 0 1 1 2 2 2 2 0 1 1-2 2" />,
    },
    {
      label: "Paragraph",
      run: (exec) => exec("formatBlock", "<p>"),
      icon: <path d="M13 4v16M9 4v8M17 4H9a4 4 0 0 0 0 8" />,
    },
  ],
  [
    {
      label: "Bullet list",
      state: "insertUnorderedList",
      run: (exec) => exec("insertUnorderedList"),
      icon: <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />,
    },
    {
      label: "Numbered list",
      state: "insertOrderedList",
      run: (exec) => exec("insertOrderedList"),
      icon: <path d="M9 6h11M9 12h11M9 18h11M4 4v4M3 8h2M3 12h2l-2 4h2" />,
    },
    {
      label: "Quote",
      run: (exec) => exec("formatBlock", "<blockquote>"),
      icon: <path d="M6 7h5v5a4 4 0 0 1-4 4M14 7h5v5a4 4 0 0 1-4 4" />,
    },
  ],
  [
    {
      label: "Align left",
      state: "justifyLeft",
      run: (exec) => exec("justifyLeft"),
      icon: <path d="M4 6h16M4 12h10M4 18h14" />,
    },
    {
      label: "Align centre",
      state: "justifyCenter",
      run: (exec) => exec("justifyCenter"),
      icon: <path d="M4 6h16M8 12h8M6 18h12" />,
    },
    {
      label: "Align right",
      state: "justifyRight",
      run: (exec) => exec("justifyRight"),
      icon: <path d="M4 6h16M10 12h10M6 18h14" />,
    },
  ],
  [
    {
      label: "Link",
      run: (exec) => {
        const href = window.prompt("Link address", "https://");
        if (href) exec("createLink", href);
      },
      icon: (
        <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
      ),
    },
    {
      label: "Remove formatting",
      run: (exec) => exec("removeFormat"),
      icon: <path d="M6 5h12M9 5l-2 14M15 5l1 7M14 19l6-6M14 13l6 6" />,
    },
  ],
  [
    {
      label: "Undo",
      run: (exec) => exec("undo"),
      icon: <path d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12H9" />,
    },
    {
      label: "Redo",
      run: (exec) => exec("redo"),
      icon: <path d="m15 14 5-5-5-5M20 9H10a6 6 0 0 0 0 12h5" />,
    },
  ],
];

export function RichTextEditor({
  value,
  onChange,
  ariaLabel,
}: {
  value: string;
  onChange: (html: string) => void;
  ariaLabel: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<Record<string, boolean>>({});

  // Seed the editor once, and again only when the value changes from the
  // outside — never on every render, which would fight the caret.
  useEffect(() => {
    const node = box.current;
    if (!node) return;
    if (node.innerHTML !== value && document.activeElement !== node) {
      node.innerHTML = value;
    }
  }, [value]);

  function exec(command: string, argument?: string) {
    box.current?.focus();
     
    document.execCommand(command, false, argument);
    emit();
    refreshState();
  }

  function emit() {
    const node = box.current;
    if (node) onChange(node.innerHTML);
  }

  function refreshState() {
    const next: Record<string, boolean> = {};
    for (const group of GROUPS) {
      for (const command of group) {
        if (!command.state) continue;
        try {
           
          next[command.state] = document.queryCommandState(command.state);
        } catch {
          next[command.state] = false;
        }
      }
    }
    setActive(next);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-card-muted">
      <div
        role="toolbar"
        aria-label="Formatting"
        className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-line px-2 py-1.5"
      >
        {GROUPS.map((group, index) => (
          <div key={index} className="flex items-center gap-0.5">
            {group.map((command) => (
              <button
                key={command.label}
                type="button"
                title={command.label}
                aria-label={command.label}
                aria-pressed={
                  command.state ? (active[command.state] ?? false) : undefined
                }
                // Keeps the selection: a button that takes focus first
                // collapses the range the command is meant to act on.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => command.run(exec)}
                className={cn(
                  "grid size-8 place-items-center rounded-md transition-colors",
                  command.state && active[command.state]
                    ? "bg-brand-100 text-brand-700"
                    : "text-ink-muted hover:bg-card hover:text-ink-strong",
                )}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-[18px]"
                  aria-hidden
                >
                  {command.icon}
                </svg>
              </button>
            ))}
          </div>
        ))}
      </div>

      <div
        ref={box}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline
        aria-label={ariaLabel}
        onInput={emit}
        onBlur={emit}
        onKeyUp={refreshState}
        onMouseUp={refreshState}
        /*
          Pasted content comes in as plain text. A paste from Word or a web
          page carries fonts, colours and classes that the sanitiser strips
          anyway — taking the text up front means what you see in the
          editor is what will be sent.
        */
        onPaste={(event) => {
          event.preventDefault();
          const text = event.clipboardData.getData("text/plain");
           
          document.execCommand("insertText", false, text);
          emit();
        }}
        className="email-body min-h-72 max-h-[30rem] overflow-y-auto bg-card px-4 py-3 text-sm leading-relaxed text-ink outline-none"
      />
    </div>
  );
}
