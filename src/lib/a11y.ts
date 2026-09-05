import type { KeyboardEvent } from "react";

/**
 * Helper for making a non-semantic element (div/span) keyboard-accessible when
 * used as a clickable target. Returns props that satisfy jsx-a11y rules
 * (click-events-have-key-events + no-static-element-interactions).
 *
 * Usage:
 *   <div {...clickableProps(handleClick)} className="...">...</div>
 */
export function clickableProps<T extends HTMLElement = HTMLDivElement>(
  onActivate: (event: KeyboardEvent<T> | React.MouseEvent<T>) => void,
  options: { role?: string; disabled?: boolean; label?: string } = {}
) {
  const { role = "button", disabled = false, label } = options;
  return {
    role,
    tabIndex: disabled ? -1 : 0,
    "aria-disabled": disabled || undefined,
    "aria-label": label,
    onClick: (e: React.MouseEvent<T>) => {
      if (disabled) return;
      onActivate(e);
    },
    onKeyDown: (e: KeyboardEvent<T>) => {
      if (disabled) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onActivate(e);
      }
    },
  } as const;
}
