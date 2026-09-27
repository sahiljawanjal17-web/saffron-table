"use client";
// Source: arnobt78/Restaurant-Landing-Page-1--NextJS-Frontend (MIT) — components/Menu.
// Changes: live DB items grouped by category, veg badge, stock left, add-to-cart, motion/react.

/**
 * Menu – Displays featured dishes in a responsive grid.
 * Data from data/menu.ts (img, title, price). Hover scales image via group-hover.
 */
import { fadeIn } from "../variants";
import { motion } from "motion/react";
import Image from "next/image";
import type { LiveMenuItem } from "../types";
import { useCart } from "../cart/cart-context";

export default function Menu({ items }: { items: LiveMenuItem[] }) {
  const { add, money } = useCart();
  const categories = [...new Set(items.map((i) => i.category))];
  return (
    <section
      className="relative pt-32 pb-12 xl:pb-24"
      id="menu"
    >
      <div className="container">
        {/* Section title + "View all" link; animates from left */}
        <motion.div
          variants={fadeIn("up", 0.1)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="max-w-[640px] mx-auto text-center"
        >
          <p className="eyebrow text-primary mb-3">Cooked fresh today</p>
          <h2 className="font-display font-medium mb-4">Today’s Menu</h2>
          <p className="text-muted-foreground mb-16">Quantities are live — once a dish is gone for the day, it is gone.</p>
        </motion.div>
        {items.length === 0 && (
          <p className="text-center text-muted-foreground">The kitchen has not opened today’s menu yet. Please check back soon.</p>
        )}
        {categories.map((cat) => (
        <div key={cat} className="mb-16">
        <h3 className="font-display text-3xl mb-6 border-b pb-3">{cat}</h3>
        <motion.div
          variants={fadeIn("up", 0.2)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.1 }}
          className="grid grid-cols-1 gap-[30px] sm:grid-cols-2 md:gap-[15px] xl:grid-cols-4"
        >
          {items.filter((i) => i.category === cat).map((item) => (
            <div
              key={item.menuItemId}
              className="bg-card shadow-md rounded-2xl overflow-hidden group flex flex-col"
            >
              <div className="overflow-hidden relative">
                <Image
                  src={item.imageUrl ?? "/media/space/plates.jpg"}
                  width={400}
                  height={300}
                  alt={item.name}
                  className="aspect-[4/3] w-full object-cover group-hover:scale-110 transition-all duration-300"
                />
                <span className={`absolute top-3 left-3 size-4 rounded-sm border-2 bg-white ${item.isVeg ? "border-green-700" : "border-red-800"}`} aria-label={item.isVeg ? "Vegetarian" : "Non-vegetarian"}>
                  <span className={`block size-1.5 m-[3px] rounded-full ${item.isVeg ? "bg-green-700" : "bg-red-800"}`} />
                </span>
                {item.remaining > 0 && item.remaining <= 5 && (
                  <span className="absolute top-3 right-3 rounded-full bg-background/90 px-2 py-0.5 text-xs">Only {item.remaining} left</span>
                )}
              </div>
              <div className="pt-[20px] pb-[24px] px-[24px] flex flex-col flex-1">
                <h3 className="font-display text-2xl text-foreground mb-2">
                  {item.name}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{item.description}</p>
                <div className="mt-auto flex items-center justify-between">
                  <div className="text-xl font-semibold text-primary">
                    {money(item.price)}
                  </div>
                  <button
                    type="button"
                    disabled={item.remaining <= 0}
                    onClick={() => add(item)}
                    className="rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:bg-muted disabled:text-muted-foreground"
                  >
                    {item.remaining > 0 ? "Add" : "Sold out"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </motion.div>
        </div>
        ))}
      </div>
    </section>
  );
}
