/**
 * Framer Motion animation variants used site-wide (Hero, Menu, About, Footer, Map, Reservation).
 * hidden = starting state (offset by direction, opacity 0); show = final state (opacity 1, no offset).
 */
// Source: arnobt78/Restaurant-Landing-Page-1--NextJS-Frontend (MIT) — lib/variants.
import type { Variants } from "motion/react";

type FadeDirection = "up" | "down" | "left" | "right";

/**
 * Framer Motion fade-in variants.
 * @param direction - 'up' | 'down' | 'left' | 'right'
 * @param delay - delay in seconds
 */
export function fadeIn(direction: FadeDirection, delay: number): Variants {
  return {
    hidden: {
      y: direction === "up" ? 32 : direction === "down" ? -32 : 0,
      opacity: 0,
      x: direction === "left" ? 32 : direction === "right" ? -32 : 0,
      transition: {
        type: "tween",
        duration: 0.9,
        delay,
        ease: [0.25, 0.6, 0.3, 0.8],
      },
    },
    show: {
      y: 0,
      x: 0,
      opacity: 1,
      transition: {
        type: "tween",
        duration: 0.8,
        delay,
        ease: [0.25, 0.25, 0.25, 0.75],
      },
    },
  };
}
