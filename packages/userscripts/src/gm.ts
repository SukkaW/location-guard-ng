/// <reference types="greasemonkey" />

// None of these are part of the GM4 spec / @types/greasemonkey, so they are
// feature-detected at runtime. registerMenuCommand's options object
// (Tampermonkey 4.20+) lets us reuse the previous id so a caption update
// replaces the entry in place, keeping its menu position; managers that
// ignore it get an unregister + re-register fallback.
// (method-shorthand signatures on purpose: bivariance keeps the GM object
// assignable to this partial view)
export interface GMExtra {
  // third param is a union because GM4 typings declare it as accessKey?: string;
  // the union + method-shorthand bivariance keeps GM assignable to this view
  registerMenuCommand(caption: string, onClick: () => void, optionsOrAccessKey?: string | { id: unknown }): unknown,
  unregisterMenuCommand(id: unknown): unknown,
  addValueChangeListener(name: string, cb: (name: string, oldValue: unknown, newValue: unknown, remote: boolean) => void): unknown
}

export const gm: Partial<GMExtra> = GM;
