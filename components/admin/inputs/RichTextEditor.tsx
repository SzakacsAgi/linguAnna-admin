"use client";

import {
  Bold,
  Italic,
  Link,
  Smile,
  Heading,
  List,
  ListOrdered,
  Palette,
  Type,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

type EditorTool = "bold" | "italic" | "link" | "emoji" | "heading" | "lists" | "color" | "fontFamily" | "fontWeight";

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  editorKey: string;
  tools?: EditorTool[];
  editorClassName?: string;
  label?: string;
  required?: boolean;
  error?: string;
};

const EmojiPicker = dynamic(
  () => import("@emoji-mart/react").then((mod) => mod.default),
  { ssr: false },
);

const hasContent = (html: string) =>
  html.replace(/<br>|&nbsp;|\s/g, "").length > 0;

function rgbToHex(rgb: string): string {
  const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!match) return rgb;
  const r = parseInt(match[1]).toString(16).padStart(2, "0");
  const g = parseInt(match[2]).toString(16).padStart(2, "0");
  const b = parseInt(match[3]).toString(16).padStart(2, "0");
  return `#${r}${g}${b}`;
}

const COLOR_PRESETS = [
  // Project palette
  { color: "#7B6E9E", label: "Purple" },
  { color: "#3B5249", label: "Dark Green" },
  { color: "#D4B483", label: "Gold" },
  { color: "#B45309", label: "Amber" },
  // Neutrals
  { color: "#000000", label: "Black" },
  { color: "#374151", label: "Dark Gray" },
  { color: "#6B7280", label: "Gray" },
  { color: "#9CA3AF", label: "Light Gray" },
  // Accents
  { color: "#EF4444", label: "Red" },
  { color: "#F97316", label: "Orange" },
  { color: "#3B82F6", label: "Blue" },
  { color: "#22C55E", label: "Green" },
];

const FONT_PRESETS = [
  { className: "font-inter", label: "Inter" },
  { className: "font-playfair", label: "Playfair Display" },
];

const WEIGHT_PRESETS = [
  { value: "400", label: "Normal" },
  { value: "500", label: "Medium" },
  { value: "600", label: "Semibold" },
  { value: "700", label: "Bold" },
  { value: "800", label: "Extra Bold" },
  { value: "900", label: "Black" },
];

function syncLinkTitles(root: HTMLElement) {
  const anchors = root.querySelectorAll<HTMLAnchorElement>("a[href]");
  anchors.forEach((a) => {
    const href = a.getAttribute("href");
    if (!href) return;
    if (a.getAttribute("title") !== href) {
      a.setAttribute("title", href);
    }
  });
}

function unwrapLink(a: HTMLAnchorElement) {
  const parent = a.parentNode;
  if (!parent) return;

  while (a.firstChild) {
    parent.insertBefore(a.firstChild, a);
  }
  parent.removeChild(a);
}

function insertPlainTextAtSelection(text: string) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);
  range.deleteContents();

  const fragment = document.createDocumentFragment();
  const lines = text.split(/\r\n|\r|\n/);

  lines.forEach((line, index) => {
    fragment.appendChild(document.createTextNode(line));
    if (index < lines.length - 1) {
      fragment.appendChild(document.createElement("br"));
    }
  });

  range.insertNode(fragment);

  // Move caret to end of inserted content.
  selection.removeAllRanges();
  const newRange = document.createRange();
  newRange.selectNodeContents(range.commonAncestorContainer);
  newRange.collapse(false);
  selection.addRange(newRange);
}

const RichTextEditor = ({
  value,
  onChange,
  placeholder,
  editorKey,
  tools = ["bold", "italic", "link", "emoji", "heading", "lists", "color", "fontFamily", "fontWeight"],
  editorClassName,
  label,
  required = false,
  error,
}: RichTextEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [activeTools, setActiveTools] = useState<EditorTool[]>([]);
  const [activeListState, setActiveListState] = useState<{
    unordered: boolean;
    ordered: boolean;
  }>({ unordered: false, ordered: false });
  const [activeHeadingLevel, setActiveHeadingLevel] = useState<
    1 | 2 | 3 | 4 | 5 | 6 | null
  >(null);
  const isInitializedRef = useRef(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [emojiPickerData, setEmojiPickerData] = useState<any>(null);
  const [emojiPickerDataLoading, setEmojiPickerDataLoading] = useState(false);
  const emojiWrapRef = useRef<HTMLDivElement>(null);
  const [headingOpen, setHeadingOpen] = useState(false);
  const headingWrapRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const editorWrapRef = useRef<HTMLDivElement>(null);
  const [colorOpen, setColorOpen] = useState(false);
  const [activeColor, setActiveColor] = useState<string | null>(null);
  const colorWrapRef = useRef<HTMLDivElement>(null);
  const customColorInputRef = useRef<HTMLInputElement>(null);
  const [fontFamilyOpen, setFontFamilyOpen] = useState(false);
  const fontFamilyWrapRef = useRef<HTMLDivElement>(null);
  const [activeFontFamily, setActiveFontFamily] = useState<string | null>(null);
  const [fontWeightOpen, setFontWeightOpen] = useState(false);
  const fontWeightWrapRef = useRef<HTMLDivElement>(null);
  const [activeFontWeight, setActiveFontWeight] = useState<string | null>(null);

  const ensureEmojiPickerDataLoaded = () => {
    if (emojiPickerData || emojiPickerDataLoading) return;
    setEmojiPickerDataLoading(true);
    void import("@emoji-mart/data")
      .then((mod: any) => {
        setEmojiPickerData(mod?.default ?? mod);
      })
      .finally(() => {
        setEmojiPickerDataLoading(false);
      });
  };

  const [linkEditorOpen, setLinkEditorOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkPos, setLinkPos] = useState<{ left: number; top: number } | null>(
    null,
  );
  const linkPopoverRef = useRef<HTMLDivElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);
  const linkSavedRangeRef = useRef<Range | null>(null);
  const currentLinkElRef = useRef<HTMLAnchorElement | null>(null);

  /* -----------------------------------------------------------
   * Initial load
   * --------------------------------------------------------- */
  useEffect(() => {
    if (editorRef.current && !isInitializedRef.current) {
      editorRef.current.innerHTML = value || "";
      syncLinkTitles(editorRef.current);
      isInitializedRef.current = true;
    }
  }, []);

  /* -----------------------------------------------------------
   * Reset when editorKey changes (section switch)
   * --------------------------------------------------------- */
  useEffect(() => {
    isInitializedRef.current = false;
    if (editorRef.current) {
      editorRef.current.innerHTML = value || "";
      syncLinkTitles(editorRef.current);
      isInitializedRef.current = true;
    }
  }, [editorKey]);

  /* -----------------------------------------------------------
   * Sync external value (async load)
   * --------------------------------------------------------- */
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    // While the link popover is open we intentionally avoid re-syncing
    // innerHTML, because that would recreate DOM nodes and break selection.
    if (linkEditorOpen) return;

    if (!isFocused && editor.innerHTML !== (value || "")) {
      editor.innerHTML = value || "";
      syncLinkTitles(editor);
    }
  }, [value, isFocused, linkEditorOpen]);

  /* -----------------------------------------------------------
   * Input handler
   * --------------------------------------------------------- */
  const handleInput = () => {
    if (editorRef.current) {
      // Ensure hovering links shows their URL.
      syncLinkTitles(editorRef.current);

      onChange(editorRef.current.innerHTML);
      updateActiveTools();
    }
  };

  const handleEditorMouseOver = (e: React.MouseEvent<HTMLDivElement>) => {
    const editor = editorRef.current;
    if (!editor) return;

    const target = e.target as Element | null;
    const a = target?.closest?.("a[href]") as HTMLAnchorElement | null;
    if (!a || !editor.contains(a)) return;

    const href = a.getAttribute("href");
    if (!href) return;
    if (a.getAttribute("title") !== href) {
      a.setAttribute("title", href);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    if (!text) return;

    // Insert as plain text (no styles / HTML from source).
    // Try execCommand first (keeps caret behavior consistent), then fall back.
    const inserted = document.execCommand("insertText", false, text);
    if (!inserted) {
      insertPlainTextAtSelection(text);
    }
    handleInput();
  };

  const insertTextAtCaret = (text: string) => {
    editorRef.current?.focus();

    // Restore selection if toolbar/picker focus moved it.
    const selection = window.getSelection();
    const savedRange = savedRangeRef.current;
    if (selection && savedRange) {
      selection.removeAllRanges();
      selection.addRange(savedRange);
    }

    const inserted = document.execCommand("insertText", false, text);
    if (!inserted) {
      insertPlainTextAtSelection(text);
    }
    handleInput();
  };

  /* -----------------------------------------------------------
   * Exec helper
   * --------------------------------------------------------- */
  const exec = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const applyColor = (color: string) => {
    restoreSavedSelection();
    document.execCommand("foreColor", false, color);
    editorRef.current?.focus();
    handleInput();
    setActiveColor(color);
    setColorOpen(false);
  };

  const clearColor = () => {
    restoreSavedSelection();
    // Enable CSS styling so foreColor produces a span with color:inherit
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand("foreColor", false, "inherit");
    document.execCommand("styleWithCSS", false, "false");
    editorRef.current?.focus();
    handleInput();
    setActiveColor(null);
    setColorOpen(false);
  };

  const restoreSavedSelection = () => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    const savedRange = savedRangeRef.current;
    if (!editor || !selection || !savedRange) return;

    editor.focus();
    selection.removeAllRanges();
    selection.addRange(savedRange);
  };

  const removeHeading = () => {
    restoreSavedSelection();
    // Revert to normal paragraph block
    const candidates = ["<div>", "DIV", "div", "<p>", "P", "p"];
    for (const candidate of candidates) {
      if (document.execCommand("formatBlock", false, candidate)) break;
    }
    editorRef.current?.focus();
    handleInput();
    setHeadingOpen(false);
  };

  const applyHeading = (level: 1 | 2 | 3 | 4 | 5 | 6) => {
    restoreSavedSelection();

    // Toggle: if already at this level, revert to normal paragraph
    if (activeHeadingLevel === level) {
      removeHeading();
      return;
    }

    // `formatBlock` is finicky across browsers; some expect `<h1>`.
    // We'll try the most compatible variants.
    const candidates = [`<h${level}>`, `H${level}`, `h${level}`];
    let applied = false;
    for (const candidate of candidates) {
      applied = document.execCommand("formatBlock", false, candidate);
      if (applied) break;
    }

    editorRef.current?.focus();
    handleInput();
    setHeadingOpen(false);
  };

  const applyFontFamily = (className: string) => {
    restoreSavedSelection();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (range.collapsed) { setFontFamilyOpen(false); return; }

    // Remove any existing font class from ancestor spans
    const fragment = range.extractContents();
    const span = document.createElement("span");
    FONT_PRESETS.forEach((f) => span.classList.remove(f.className));
    span.classList.add(className);
    span.appendChild(fragment);
    range.insertNode(span);

    selection.removeAllRanges();
    const newRange = document.createRange();
    newRange.selectNodeContents(span);
    selection.addRange(newRange);

    editorRef.current?.focus();
    handleInput();
    setActiveFontFamily(className);
    setFontFamilyOpen(false);
  };

  const clearFontFamily = () => {
    restoreSavedSelection();
    const selection = window.getSelection();
    const editor = editorRef.current;
    if (!selection || !editor) { setFontFamilyOpen(false); return; }

    const node = selection.focusNode ?? selection.anchorNode;
    const el = node?.nodeType === Node.ELEMENT_NODE
      ? (node as HTMLElement)
      : (node?.parentElement as HTMLElement | null);
    const fontEl = el?.closest?.(".font-inter, .font-playfair") as HTMLElement | null;
    if (fontEl && editor.contains(fontEl)) {
      FONT_PRESETS.forEach((f) => fontEl.classList.remove(f.className));
      if (fontEl.classList.length === 0) fontEl.removeAttribute("class");
    }

    editorRef.current?.focus();
    handleInput();
    setActiveFontFamily(null);
    setFontFamilyOpen(false);
  };

  const applyFontWeight = (weight: string) => {
    restoreSavedSelection();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (range.collapsed) { setFontWeightOpen(false); return; }

    const fragment = range.extractContents();
    const span = document.createElement("span");
    span.style.fontWeight = weight;
    span.appendChild(fragment);
    range.insertNode(span);

    selection.removeAllRanges();
    const newRange = document.createRange();
    newRange.selectNodeContents(span);
    selection.addRange(newRange);

    editorRef.current?.focus();
    handleInput();
    setActiveFontWeight(weight);
    setFontWeightOpen(false);
  };

  const clearFontWeight = () => {
    restoreSavedSelection();
    const selection = window.getSelection();
    const editor = editorRef.current;
    if (!selection || !editor) { setFontWeightOpen(false); return; }

    const node = selection.focusNode ?? selection.anchorNode;
    const el = node?.nodeType === Node.ELEMENT_NODE
      ? (node as HTMLElement)
      : (node?.parentElement as HTMLElement | null);
    // Walk up to find span with explicit font-weight
    let current = el;
    while (current && editor.contains(current)) {
      if (current instanceof HTMLElement && current.style?.fontWeight) {
        current.style.fontWeight = "";
        if (!current.getAttribute("style")?.trim()) current.removeAttribute("style");
        break;
      }
      current = current.parentElement;
    }

    editorRef.current?.focus();
    handleInput();
    setActiveFontWeight(null);
    setFontWeightOpen(false);
  };

  /* -----------------------------------------------------------
   * Toolbar handlers
   * --------------------------------------------------------- */
  const computeLinkPopoverPosition = () => {
    const selection = window.getSelection();
    const editor = editorRef.current;
    const wrap = editorWrapRef.current;
    if (!selection || selection.rangeCount === 0 || !editor || !wrap) return;

    const range = selection.getRangeAt(0);
    const node = selection.focusNode ?? selection.anchorNode;
    const el =
      node?.nodeType === Node.ELEMENT_NODE
        ? (node as Element)
        : (node?.parentElement as Element | null);
    const linkEl = (el?.closest?.("a") as HTMLAnchorElement | null) ?? null;

    const rect = (
      range.collapsed && linkEl ? linkEl : range
    ).getBoundingClientRect();
    const wrapRect = wrap.getBoundingClientRect();

    const left = rect.left + rect.width / 2 - wrapRect.left;
    const top = Math.max(0, rect.top - wrapRect.top - 10);
    setLinkPos({ left, top });
  };

  const openLinkEditor = () => {
    const selection = window.getSelection();
    const editor = editorRef.current;
    if (!selection || selection.rangeCount === 0 || !editor) return;

    const range = selection.getRangeAt(0);
    const hasSelectionText = Boolean(selection.toString());

    const node = selection.focusNode ?? selection.anchorNode;
    const el =
      node?.nodeType === Node.ELEMENT_NODE
        ? (node as Element)
        : (node?.parentElement as Element | null);
    const linkEl = (el?.closest?.("a") as HTMLAnchorElement | null) ?? null;

    // If nothing is selected and we aren't inside a link, there's nothing to link.
    if (!hasSelectionText && !linkEl) return;

    linkSavedRangeRef.current = range.cloneRange();
    currentLinkElRef.current = linkEl;

    setLinkUrl(linkEl?.getAttribute("href") ?? "https://");
    setLinkEditorOpen(true);
    computeLinkPopoverPosition();
  };

  const resolveCurrentLinkElement = () => {
    const editor = editorRef.current;
    if (!editor) return null;

    const selection = window.getSelection();
    const node = selection?.focusNode ?? selection?.anchorNode;
    const el =
      node?.nodeType === Node.ELEMENT_NODE
        ? (node as Element)
        : (node?.parentElement as Element | null);
    const linkEl = (el?.closest?.("a") as HTMLAnchorElement | null) ?? null;
    if (linkEl && editor.contains(linkEl)) return linkEl;

    // If focus moved (e.g. to the popover input), restore the saved range.
    const savedRange = linkSavedRangeRef.current;
    if (!savedRange) return null;

    editor.focus();
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(savedRange);
    }

    const node2 = sel?.focusNode ?? sel?.anchorNode;
    const el2 =
      node2?.nodeType === Node.ELEMENT_NODE
        ? (node2 as Element)
        : (node2?.parentElement as Element | null);
    const linkEl2 = (el2?.closest?.("a") as HTMLAnchorElement | null) ?? null;
    if (linkEl2 && editor.contains(linkEl2)) return linkEl2;

    return null;
  };

  const applyLink = () => {
    const url = linkUrl.trim();
    const editor = editorRef.current;
    if (!editor) return;

    const currentLink = resolveCurrentLinkElement() ?? currentLinkElRef.current;

    if (!url) {
      if (currentLink && editor.contains(currentLink)) {
        // Treat empty URL as unlink when editing an existing link.
        unwrapLink(currentLink);
        currentLinkElRef.current = null;
        handleInput();
      }

      setLinkEditorOpen(false);
      return;
    }
    if (currentLink && editor.contains(currentLink)) {
      currentLink.setAttribute("href", url);
      currentLink.setAttribute("title", url);
      setLinkEditorOpen(false);
      handleInput();
      return;
    }

    editor.focus();
    const selection = window.getSelection();
    const savedRange = linkSavedRangeRef.current;
    if (selection && savedRange) {
      selection.removeAllRanges();
      selection.addRange(savedRange);
    }

    exec("createLink", url);
    setLinkEditorOpen(false);
  };

  const removeLink = () => {
    const editor = editorRef.current;
    const currentLink = resolveCurrentLinkElement() ?? currentLinkElRef.current;
    if (!editor || !currentLink || !editor.contains(currentLink)) {
      setLinkEditorOpen(false);
      return;
    }

    unwrapLink(currentLink);
    currentLinkElRef.current = null;
    handleInput();
    setLinkEditorOpen(false);
  };

  const handlers: Record<EditorTool, (e: React.MouseEvent) => void> = {
    bold: (e) => {
      e.preventDefault();
      const wasBold = document.queryCommandState("bold");
      exec("bold");
      // If we intended to remove bold but it persisted (e.g. font-weight inline style),
      // force removal via CSS approach
      if (wasBold && document.queryCommandState("bold")) {
        document.execCommand("styleWithCSS", false, "true");
        document.execCommand("bold", false);
        document.execCommand("styleWithCSS", false, "false");
        handleInput();
      }
    },
    italic: (e) => {
      e.preventDefault();
      exec("italic");
    },
    link: (e) => {
      e.preventDefault();
      openLinkEditor();
    },

    emoji: (e) => {
      e.preventDefault();

      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        savedRangeRef.current = selection.getRangeAt(0).cloneRange();
      }

      const nextOpen = !emojiOpen;
      setEmojiOpen(nextOpen);
      if (nextOpen) {
        ensureEmojiPickerDataLoaded();
      }
      editorRef.current?.focus();
    },

    heading: (e) => {
      e.preventDefault();

      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        savedRangeRef.current = selection.getRangeAt(0).cloneRange();
      }

      setHeadingOpen((prev) => !prev);
      editorRef.current?.focus();
    },

    // Rendered as two separate buttons; handler is unused.
    lists: (e) => {
      e.preventDefault();
    },

    color: (e) => {
      e.preventDefault();

      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        savedRangeRef.current = selection.getRangeAt(0).cloneRange();
      }

      setColorOpen((prev) => !prev);
    },

    fontFamily: (e) => {
      e.preventDefault();

      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        savedRangeRef.current = selection.getRangeAt(0).cloneRange();
      }

      setFontFamilyOpen((prev) => !prev);
    },

    fontWeight: (e) => {
      e.preventDefault();

      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        savedRangeRef.current = selection.getRangeAt(0).cloneRange();
      }

      setFontWeightOpen((prev) => !prev);
    },
  };

  useEffect(() => {
    if (!emojiOpen) return;

    const handleDown = (e: MouseEvent) => {
      const wrap = emojiWrapRef.current;
      if (!wrap) return;
      if (wrap.contains(e.target as Node)) return;
      setEmojiOpen(false);
    };

    document.addEventListener("mousedown", handleDown);
    return () => {
      document.removeEventListener("mousedown", handleDown);
    };
  }, [emojiOpen]);

  useEffect(() => {
    if (!headingOpen) return;

    const handleDown = (e: MouseEvent) => {
      const wrap = headingWrapRef.current;
      if (!wrap) return;
      if (wrap.contains(e.target as Node)) return;
      setHeadingOpen(false);
    };

    document.addEventListener("mousedown", handleDown);
    return () => {
      document.removeEventListener("mousedown", handleDown);
    };
  }, [headingOpen]);

  useEffect(() => {
    if (!colorOpen) return;

    const handleDown = (e: MouseEvent) => {
      const wrap = colorWrapRef.current;
      if (!wrap) return;
      if (wrap.contains(e.target as Node)) return;
      setColorOpen(false);
    };

    document.addEventListener("mousedown", handleDown);
    return () => {
      document.removeEventListener("mousedown", handleDown);
    };
  }, [colorOpen]);

  useEffect(() => {
    if (!fontFamilyOpen) return;

    const handleDown = (e: MouseEvent) => {
      const wrap = fontFamilyWrapRef.current;
      if (!wrap) return;
      if (wrap.contains(e.target as Node)) return;
      setFontFamilyOpen(false);
    };

    document.addEventListener("mousedown", handleDown);
    return () => {
      document.removeEventListener("mousedown", handleDown);
    };
  }, [fontFamilyOpen]);

  useEffect(() => {
    if (!fontWeightOpen) return;

    const handleDown = (e: MouseEvent) => {
      const wrap = fontWeightWrapRef.current;
      if (!wrap) return;
      if (wrap.contains(e.target as Node)) return;
      setFontWeightOpen(false);
    };

    document.addEventListener("mousedown", handleDown);
    return () => {
      document.removeEventListener("mousedown", handleDown);
    };
  }, [fontWeightOpen]);

  useEffect(() => {
    if (!linkEditorOpen) return;

    const t = window.setTimeout(() => {
      linkInputRef.current?.focus();
      linkInputRef.current?.select();
    }, 0);

    const handleDown = (e: MouseEvent) => {
      const pop = linkPopoverRef.current;
      if (pop && pop.contains(e.target as Node)) return;
      setLinkEditorOpen(false);
    };

    const handleReposition = () => computeLinkPopoverPosition();

    document.addEventListener("mousedown", handleDown);
    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);

    return () => {
      window.clearTimeout(t);
      document.removeEventListener("mousedown", handleDown);
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
    };
  }, [linkEditorOpen]);

  /* -----------------------------------------------------------
   * Active tool detection
   * --------------------------------------------------------- */
  const updateActiveTools = () => {
    const active: EditorTool[] = [];

    if (document.queryCommandState("bold")) active.push("bold");
    if (document.queryCommandState("italic")) active.push("italic");

    let unordered = false;
    let ordered = false;
    try {
      unordered = document.queryCommandState("insertUnorderedList");
      ordered = document.queryCommandState("insertOrderedList");
    } catch {
      // Some browsers may throw for unsupported commands.
    }
    setActiveListState({ unordered, ordered });
    if (unordered || ordered) active.push("lists");

    const formatBlock = String(
      (document.queryCommandValue("formatBlock") ?? "") as string,
    )
      .replace(/[<>]/g, "")
      .toLowerCase();
    const match = formatBlock.match(/^h([1-6])$/);
    const headingLevel = match
      ? (Number(match[1]) as 1 | 2 | 3 | 4 | 5 | 6)
      : null;
    setActiveHeadingLevel(headingLevel);
    if (headingLevel) active.push("heading");

    // Detect current foreground color.
    try {
      const colorVal = document.queryCommandValue("foreColor");
      if (colorVal && colorVal !== "rgb(0, 0, 0)" && colorVal !== "rgba(0, 0, 0, 0)" && colorVal !== "") {
        const hex = rgbToHex(colorVal);
        setActiveColor(hex !== "#000000" ? hex : null);
      } else {
        setActiveColor(null);
      }
    } catch {
      // ignore
    }

    // `queryCommandState('createLink')` is unreliable across browsers.
    // Detect link by checking whether current selection/caret is inside an <a>.
    const selection = window.getSelection();
    const node = selection?.focusNode ?? selection?.anchorNode;
    const editor = editorRef.current;
    if (node && editor) {
      const el =
        node.nodeType === Node.ELEMENT_NODE
          ? (node as Element)
          : (node.parentElement as Element | null);

      const linkEl = el?.closest?.("a");
      if (linkEl && editor.contains(linkEl)) {
        active.push("link");
      }
    }

    // Detect current font family from CSS class.
    try {
      if (node && editor) {
        const fEl = node.nodeType === Node.ELEMENT_NODE
          ? (node as HTMLElement)
          : (node.parentElement as HTMLElement | null);
        const fontEl = fEl?.closest?.(".font-inter, .font-playfair") as HTMLElement | null;
        if (fontEl && editor.contains(fontEl)) {
          const matchedFont = FONT_PRESETS.find((f) => fontEl.classList.contains(f.className));
          setActiveFontFamily(matchedFont?.className ?? null);
          if (matchedFont) active.push("fontFamily");
        } else {
          setActiveFontFamily(null);
        }
      }
    } catch {
      // ignore
    }

    // Detect current font weight from inline style.
    try {
      if (node && editor) {
        const wEl = node.nodeType === Node.ELEMENT_NODE
          ? (node as HTMLElement)
          : (node.parentElement as HTMLElement | null);
        let current: HTMLElement | null = wEl;
        let foundWeight: string | null = null;
        while (current && editor.contains(current)) {
          if (current.style?.fontWeight) {
            foundWeight = current.style.fontWeight;
            break;
          }
          current = current.parentElement;
        }
        if (foundWeight && foundWeight !== "inherit") {
          setActiveFontWeight(foundWeight);
          active.push("fontWeight");
        } else {
          setActiveFontWeight(null);
        }
      }
    } catch {
      // ignore
    }

    setActiveTools(active);
  };

  /* -----------------------------------------------------------
   * Selection + cursor tracking
   * --------------------------------------------------------- */
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const handleSelectionChange = () => {
      if (!editor.contains(document.activeElement)) return;
      updateActiveTools();
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    editor.addEventListener("keyup", updateActiveTools);
    editor.addEventListener("mouseup", updateActiveTools);

    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
      editor.removeEventListener("keyup", updateActiveTools);
      editor.removeEventListener("mouseup", updateActiveTools);
    };
  }, []);

  /* -----------------------------------------------------------
   * Keyboard shortcuts
   * --------------------------------------------------------- */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;
      if (!isMod) return;

      if (e.key.toLowerCase() === "b" && tools.includes("bold")) {
        e.preventDefault();
        exec("bold");
      }
      if (e.key.toLowerCase() === "i" && tools.includes("italic")) {
        e.preventDefault();
        exec("italic");
      }
      if (e.key.toLowerCase() === "k" && tools.includes("link")) {
        e.preventDefault();
        openLinkEditor();
      }
    };

    const editor = editorRef.current;
    editor?.addEventListener("keydown", handleKeyDown);

    return () => {
      editor?.removeEventListener("keydown", handleKeyDown);
    };
  }, [tools]);

  /* -----------------------------------------------------------
   * Render
   * --------------------------------------------------------- */
  const hasError = Boolean(error && error.trim().length > 0);
  return (
    <div className="space-y-2">
      {label ? (
        <label
          className={`block text-sm font-medium ${hasError ? "text-red-600" : "text-[#3B5249]/85"
            }`.trim()}
        >
          {label}
          {required ? <span className="text-red-600"> *</span> : null}
        </label>
      ) : null}

      <div
        className={`border rounded-lg overflow-visible focus-within:ring-2 focus-within:border-transparent ${hasError
          ? "border-red-500 focus-within:ring-red-500"
          : "border-[#D4B483]/35 bg-[#FAF6F0] focus-within:ring-[#7B6E9E]/30"
          }`.trim()}
      >
        {/* Toolbar */}
        {tools.length > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 bg-[#FAF6F0] border-b border-[#D4B483]/20">
            {tools.map((tool) => {
              if (tool === "heading") {
                return (
                  <div key={tool} className="relative" ref={headingWrapRef}>
                    <ToolbarButton
                      onClick={handlers[tool]}
                      title="Heading (H1–H6)"
                      active={activeTools.includes("heading") || headingOpen}
                    >
                      <div className="flex items-center gap-1">
                        <Heading size={16} />
                        <span className="text-[11px] font-semibold">
                          {activeHeadingLevel ? `H${activeHeadingLevel}` : "H"}
                        </span>
                      </div>
                    </ToolbarButton>

                    {headingOpen ? (
                      <div className="absolute z-50 mt-2 w-36 overflow-hidden rounded-lg border border-[#D4B483]/25 bg-white shadow-2xl ring-1 ring-black/5">
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            removeHeading();
                          }}
                          className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-[#FAF6F0] ${!activeHeadingLevel ? "text-[#7B6E9E] font-medium" : "text-[#3B5249]/85"
                            }`}
                        >
                          <span>Normal text</span>
                          {!activeHeadingLevel ? <span className="text-[#7B6E9E] text-xs">✓</span> : null}
                        </button>
                        <div className="border-t border-[#D4B483]/15" />
                        {[1, 2, 3, 4, 5, 6].map((level) => (
                          <button
                            key={level}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              applyHeading(level as 1 | 2 | 3 | 4 | 5 | 6);
                            }}
                            className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-[#FAF6F0] ${activeHeadingLevel === level ? "text-[#7B6E9E] font-medium" : "text-[#3B5249]/85"
                              }`}
                          >
                            <span>Heading</span>
                            <span className="font-mono text-xs text-[#3B5249]/55">
                              H{level}
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              }

              if (tool === "lists") {
                return (
                  <div key={tool} className="flex items-center gap-1">
                    <ToolbarButton
                      onClick={(e) => {
                        e.preventDefault();
                        exec("insertUnorderedList");
                      }}
                      title="Bullet list"
                      active={activeListState.unordered}
                    >
                      <List size={16} />
                    </ToolbarButton>

                    <ToolbarButton
                      onClick={(e) => {
                        e.preventDefault();
                        exec("insertOrderedList");
                      }}
                      title="Numbered list"
                      active={activeListState.ordered}
                    >
                      <ListOrdered size={16} />
                    </ToolbarButton>
                  </div>
                );
              }

              if (tool === "color") {
                return (
                  <div key={tool} className="relative" ref={colorWrapRef}>
                    <ToolbarButton
                      onClick={handlers[tool]}
                      title="Text color"
                      active={colorOpen}
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        <Palette size={14} />
                        <div
                          className="h-[3px] w-4 rounded-full"
                          style={{ background: activeColor ?? "#000000" }}
                        />
                      </div>
                    </ToolbarButton>

                    {colorOpen ? (
                      <div className="absolute z-50 mt-2 p-3 rounded-lg border border-[#D4B483]/25 bg-white shadow-2xl ring-1 ring-black/5 w-[188px]">
                        {/* Preset swatches */}
                        <div className="grid grid-cols-4 gap-1.5 mb-3">
                          {COLOR_PRESETS.map(({ color, label }) => (
                            <button
                              key={color}
                              type="button"
                              title={label}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                applyColor(color);
                              }}
                              className="w-8 h-8 rounded-md border-2 transition-transform hover:scale-110 focus:outline-none"
                              style={{
                                background: color,
                                borderColor:
                                  activeColor === color
                                    ? "#374151"
                                    : color === "#FFFFFF"
                                      ? "#D1D5DB"
                                      : "transparent",
                              }}
                            />
                          ))}
                        </div>

                        {/* Custom color */}
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs text-[#3B5249]/55 whitespace-nowrap">Custom:</span>
                          <label
                            className="w-8 h-8 rounded-md border border-[#D4B483]/25 overflow-hidden cursor-pointer hover:scale-110 transition-transform flex items-center justify-center"
                            title="Pick a custom color"
                          >
                            <input
                              ref={customColorInputRef}
                              type="color"
                              defaultValue={activeColor ?? "#000000"}
                              className="opacity-0 absolute w-0 h-0"
                              onChange={() => {
                                // apply on blur
                              }}
                              onBlur={(e) => {
                                applyColor(e.target.value);
                              }}
                            />
                            <div
                              className="w-5 h-5 rounded-sm border border-[#D4B483]/35"
                              style={{ background: activeColor ?? "#000000" }}
                            />
                          </label>
                        </div>

                        {/* Clear button */}
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            clearColor();
                          }}
                          className="w-full mt-1 py-1 text-xs text-[#3B5249]/55 hover:text-[#3B5249] hover:bg-[#FAF6F0] rounded-md transition-colors"
                        >
                          ✕ Szín törlése
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              }

              if (tool === "emoji") {
                return (
                  <div key={tool} className="relative" ref={emojiWrapRef}>
                    <ToolbarButton
                      onClick={handlers[tool]}
                      title="Emoji"
                      active={emojiOpen}
                    >
                      <Smile size={16} />
                    </ToolbarButton>

                    {emojiOpen ? (
                      <div className="absolute z-50 mt-2 w-[352px] max-h-[420px] overflow-hidden rounded-lg border border-[#D4B483]/25 bg-white shadow-2xl ring-1 ring-black/5">
                        {emojiPickerData ? (
                          <EmojiPicker
                            data={emojiPickerData as any}
                            theme="light"
                            set="native"
                            previewPosition="none"
                            searchPosition="sticky"
                            emojiSize={18}
                            maxFrequentRows={1}
                            onEmojiSelect={(emoji: any) => {
                              const native =
                                typeof emoji?.native === "string"
                                  ? emoji.native
                                  : "";
                              if (!native) return;
                              insertTextAtCaret(native);
                              setEmojiOpen(false);
                            }}
                          />
                        ) : (
                          <div className="flex items-center justify-center p-6 text-sm text-[#3B5249]/65">
                            {emojiPickerDataLoading
                              ? "Loading emojis…"
                              : "Emoji picker is loading…"}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              }

              if (tool === "fontFamily") {
                const activeFontLabel = FONT_PRESETS.find((f) => f.className === activeFontFamily)?.label ?? null;
                return (
                  <div key={tool} className="relative" ref={fontFamilyWrapRef}>
                    <ToolbarButton
                      onClick={handlers[tool]}
                      title="Betűtípus"
                      active={activeTools.includes("fontFamily") || fontFamilyOpen}
                    >
                      <div className="flex items-center gap-1">
                        <Type size={16} />
                        <span className="text-[11px] font-semibold max-w-[72px] truncate">
                          {activeFontLabel ?? "Font"}
                        </span>
                      </div>
                    </ToolbarButton>

                    {fontFamilyOpen ? (
                      <div className="absolute z-50 mt-2 w-48 overflow-hidden rounded-lg border border-[#D4B483]/25 bg-white shadow-2xl ring-1 ring-black/5">
                        {FONT_PRESETS.map(({ className, label }) => (
                          <button
                            key={className}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              applyFontFamily(className);
                            }}
                            className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm text-[#3B5249]/85 hover:bg-[#FAF6F0] ${className}`}
                          >
                            <span>{label}</span>
                            {activeFontFamily === className ? (
                              <span className="text-[#7B6E9E] text-xs">✓</span>
                            ) : null}
                          </button>
                        ))}
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            clearFontFamily();
                          }}
                          className="w-full py-2 text-xs text-[#3B5249]/55 hover:text-[#3B5249] hover:bg-[#FAF6F0] border-t border-[#D4B483]/15 transition-colors"
                        >
                          ✕ Font törlése
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              }

              if (tool === "fontWeight") {
                const activeWeightLabel = WEIGHT_PRESETS.find((w) => w.value === activeFontWeight)?.label ?? null;
                return (
                  <div key={tool} className="relative" ref={fontWeightWrapRef}>
                    <ToolbarButton
                      onClick={handlers[tool]}
                      title="Betűvastagság"
                      active={activeTools.includes("fontWeight") || fontWeightOpen}
                    >
                      <div className="flex items-center gap-1">
                        <span className="text-[13px] font-bold">B</span>
                        <span className="text-[10px] font-medium">
                          {activeWeightLabel ?? "w"}
                        </span>
                      </div>
                    </ToolbarButton>

                    {fontWeightOpen ? (
                      <div className="absolute z-50 mt-2 w-40 overflow-hidden rounded-lg border border-[#D4B483]/25 bg-white shadow-2xl ring-1 ring-black/5">
                        {WEIGHT_PRESETS.map(({ value, label }) => (
                          <button
                            key={value}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              applyFontWeight(value);
                            }}
                            className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-[#3B5249]/85 hover:bg-[#FAF6F0]"
                          >
                            <span style={{ fontWeight: value }}>{label}</span>
                            <span className="font-mono text-xs text-[#3B5249]/55">{value}</span>
                          </button>
                        ))}
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            clearFontWeight();
                          }}
                          className="w-full py-2 text-xs text-[#3B5249]/55 hover:text-[#3B5249] hover:bg-[#FAF6F0] border-t border-[#D4B483]/15 transition-colors"
                        >
                          ✕ Vastagság törlése
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              }

              return (
                <ToolbarButton
                  key={tool}
                  onClick={handlers[tool]}
                  title={
                    tool === "bold"
                      ? "Ctrl+B"
                      : tool === "italic"
                        ? "Ctrl+I"
                        : tool === "link"
                          ? "Ctrl+K"
                          : tool
                  }
                  active={activeTools.includes(tool)}
                >
                  {tool === "bold" && <Bold size={16} />}
                  {tool === "italic" && <Italic size={16} />}
                  {tool === "link" && <Link size={16} />}
                </ToolbarButton>
              );
            })}
          </div>
        )}

        {/* Editor */}
        <div className="relative px-4 py-3" ref={editorWrapRef}>
          {!hasContent(value) && !isFocused && placeholder && (
            <div className="pointer-events-none absolute top-3 left-4 text-[#3B5249]/40">
              {placeholder}
            </div>
          )}

          {linkEditorOpen && linkPos ? (
            <div
              ref={linkPopoverRef}
              className="absolute z-50 -translate-x-1/2 -translate-y-full"
              style={{ left: linkPos.left, top: linkPos.top }}
            >
              <div className="flex items-center gap-2 rounded-lg border border-[#D4B483]/25 bg-white px-2 py-1.5 shadow-xl ring-1 ring-black/5">
                <input
                  ref={linkInputRef}
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="h-8 w-[260px] rounded-md border border-[#D4B483]/35 px-2 text-sm outline-none focus:ring-2 focus:ring-[#7B6E9E]/30"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      applyLink();
                    }
                    if (e.key === "Escape") {
                      e.preventDefault();
                      setLinkEditorOpen(false);
                    }
                  }}
                />

                <button
                  type="button"
                  onMouseDown={(e) => {
                    // Prevent selection loss before we restore it.
                    e.preventDefault();
                    applyLink();
                  }}
                  className="h-8 rounded-md bg-[#3B5249] px-3 text-sm font-medium text-[#FAF6F0] hover:bg-[#7B6E9E]"
                >
                  OK
                </button>

                {currentLinkElRef.current ? (
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      removeLink();
                    }}
                    className="h-8 rounded-md border border-[#D4B483]/25 bg-white px-3 text-sm font-medium text-[#3B5249]/85 hover:bg-[#FAF6F0]"
                  >
                    Unlink
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          <div
            ref={editorRef}
            contentEditable
            role="textbox"
            aria-multiline="true"
            aria-invalid={hasError}
            onPaste={handlePaste}
            onInput={handleInput}
            onMouseOver={handleEditorMouseOver}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={`min-h-[100px] focus:outline-none leading-[1.7] pb-[2px]
              [&_a]:underline [&_a]:text-[#7B6E9E]
              [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-3
              [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-3
              [&_li]:my-1
              [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:leading-tight [&_h1]:mt-6 [&_h1]:mb-3
              [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:leading-tight [&_h2]:mt-5 [&_h2]:mb-3
              [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:leading-tight [&_h3]:mt-4 [&_h3]:mb-2
              [&_h4]:text-lg [&_h4]:font-semibold [&_h4]:leading-tight [&_h4]:mt-4 [&_h4]:mb-2
              [&_h5]:text-base [&_h5]:font-semibold [&_h5]:leading-tight [&_h5]:mt-3 [&_h5]:mb-2
              [&_h6]:text-sm [&_h6]:font-semibold [&_h6]:leading-tight [&_h6]:mt-3 [&_h6]:mb-2
              ${editorClassName ?? ""}`.trim()}
            style={{ whiteSpace: "pre-wrap" }}
            suppressContentEditableWarning
          />
        </div>
      </div>
      <span className="text-xs text-[#3B5249]/45 ml-2">
        Select text to format or use keyboard shortcuts (hover the icons to see
        them)
      </span>
      {hasError ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
};

export default RichTextEditor;

/* -----------------------------------------------------------
 * Toolbar Button
 * --------------------------------------------------------- */
const ToolbarButton = ({
  children,
  onClick,
  title,
  active,
}: {
  children: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  title: string;
  active?: boolean;
}) => (
  <button
    type="button"
    onMouseDown={onClick}
    title={title}
    className={`p-1.5 rounded transition-colors
      ${active ? "bg-[#7B6E9E] text-white" : "text-[#3B5249]/80 hover:bg-[#D4B483]/20"}`}
  >
    {children}
  </button>
);
