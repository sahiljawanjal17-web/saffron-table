"use client";
// Source: arnobt78/Restaurant-Landing-Page-1--NextJS-Frontend (MIT) — components/Reservation. Changes: motion/react, photo, props.

/**
 * Reservation – Book-a-table section: dark card with heading and ReservationForm.
 * Section fades in on scroll; inner card has a slight delay for staggered effect.
 */
import { fadeIn } from "../variants";
import { motion } from "motion/react";
import Image from "next/image";
import ReservationForm from "./ReservationForm";
import type { LiveMenuItem } from "../types";

export default function Reservation({ menu, today }: { menu: LiveMenuItem[]; today: string }) {
  return (
    <motion.section
      variants={fadeIn("up", 0.2)}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.05 }}
      className="relative my-16 xl:my-24 xl:min-h-[860px] xl:flex xl:flex-col xl:justify-end xl:items-end scroll-mt-20 container"
      id="reserve"
    >
      <Image src="/media/space/dining-room.jpg" alt="" fill sizes="100vw" className="hidden xl:block object-cover rounded-[2rem]" />
      <motion.div
        variants={fadeIn("up", 0.3)}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.05 }}
        className="relative z-10 bg-[#17130f] text-white w-full xl:max-w-[868px] min-h-[518px] p-8 md:p-14 xl:p-16 xl:rounded-tl-[2rem]"
      >
        <p className="eyebrow text-primary mb-3">Reservations</p>
        <h2 className="font-display font-medium !text-white mb-9">Book a table</h2>
        <ReservationForm menu={menu} today={today} />
      </motion.div>
    </motion.section>
  );
}
