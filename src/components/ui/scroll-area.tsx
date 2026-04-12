"use client"

import { useMemo } from "react"
import {
  OverlayScrollbarsComponent,
  type OverlayScrollbarsComponentRef,
} from "overlayscrollbars-react"
import type { OverlayScrollbarsComponentProps } from "overlayscrollbars-react"

type ScrollAreaProps = {
  children: React.ReactNode
  className?: string
  x?: "scroll" | "hidden"
  y?: "scroll" | "hidden"
  onScroll?: (event: Event) => void
  ref?: React.Ref<OverlayScrollbarsComponentRef>
}

const BASE_OPTIONS: OverlayScrollbarsComponentProps["options"] = {
  scrollbars: {
    theme: "os-theme-codeg",
    autoHide: "leave",
    clickScroll: true,
  },
}

export function ScrollArea({
  children,
  className,
  x = "hidden",
  y = "scroll",
  onScroll,
  ref,
}: ScrollAreaProps) {
  const options = useMemo<OverlayScrollbarsComponentProps["options"]>(
    () => ({
      ...BASE_OPTIONS,
      overflow: { x, y },
    }),
    [x, y]
  )

  const events = useMemo<OverlayScrollbarsComponentProps["events"]>(
    () => (onScroll ? { scroll: (_instance, event) => onScroll(event) } : {}),
    [onScroll]
  )

  return (
    <OverlayScrollbarsComponent
      ref={ref}
      className={className}
      options={options}
      events={events}
      defer
    >
      {children}
    </OverlayScrollbarsComponent>
  )
}
