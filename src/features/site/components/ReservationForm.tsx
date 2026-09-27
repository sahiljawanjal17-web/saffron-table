"use client";
// Source: arnobt78/Restaurant-Landing-Page-1--NextJS-Frontend (MIT) — components/ReservationForm.
// Changes: base-ui Popover (render prop), phone/time/notes fields, optional pre-order,
// submit to /api/reservations.

/**
 * ReservationForm – Form fields: name, date picker (Popover + react-day-picker), time, guest count.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { IconCalendar as CalendarIcon } from "@tabler/icons-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { LiveMenuItem } from "../types";

const TIMES = ["12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00"];
const field = "bg-white/5 border-white/15 text-white placeholder:text-white/40 h-11";
const selectField = "w-full [&_select]:h-11 [&_select]:border-white/15 [&_select]:bg-white/5 [&_select]:text-white";

export default function ReservationForm({ menu, today }: { menu: LiveMenuItem[]; today: string }) {
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [preorder, setPreorder] = useState<Record<number, number>>({});
  const [showPreorder, setShowPreorder] = useState(false);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!date) {
      toast.error("Please pick a date");
      return;
    }
    const form = new FormData(e.currentTarget);
    setPending(true);
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${form.get("firstname")} ${form.get("lastname")}`.trim(),
          phone: form.get("phone"),
          email: form.get("email"),
          partySize: Number(form.get("person")),
          date: format(date, "yyyy-MM-dd"),
          time: form.get("time"),
          notes: form.get("notes"),
          items: Object.entries(preorder)
            .filter(([, q]) => q > 0)
            .map(([id, qty]) => ({ menuItemId: Number(id), qty }))
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not book");
      setDone(data.code);
      toast.success("Table requested. We will confirm shortly.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not book");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col gap-4">
        <p className="font-display text-3xl">Thank you, your request is in.</p>
        <p className="text-white/70">
          Booking reference <span className="font-mono text-primary">{done}</span>. We will call to confirm your table.
        </p>
        <Button variant="outline" className="w-fit" onClick={() => setDone(null)}>
          Make another booking
        </Button>
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-y-10" onSubmit={onSubmit}>
      <div className="grid gap-[30px]">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-[30px]">
          <div className="space-y-2">
            <Label htmlFor="firstname">First name</Label>
            <Input id="firstname" name="firstname" type="text" required className={field} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastname">Last name</Label>
            <Input id="lastname" name="lastname" type="text" className={field} />
          </div>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-[30px]">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" type="tel" required className={field} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email (optional)</Label>
            <Input id="email" name="email" type="email" className={field} />
          </div>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-[30px]">
          <div className="space-y-2">
            <Label>Date</Label>
            {/* base-ui Popover: trigger renders as our Button; content holds the Calendar */}
            <Popover>
              <PopoverTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", field)}
                  />
                }
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : <span>Pick a date</span>}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={{ before: new Date(`${today}T00:00:00`) }}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label htmlFor="time">Time</Label>
            <NativeSelect id="time" name="time" required className={selectField}>
              {TIMES.map((t) => (
                <NativeSelectOption key={t} value={t} className="text-black">
                  {t}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-2">
            <Label htmlFor="person">Guests</Label>
            <NativeSelect id="person" name="person" required defaultValue="2" className={selectField}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                <NativeSelectOption key={n} value={n} className="text-black">
                  {n} {n === 1 ? "guest" : "guests"}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">Occasion or requests</Label>
          <Input id="notes" name="notes" type="text" className={field} placeholder="Birthday, window table, allergies" />
        </div>

        {menu.length > 0 && (
          <div>
            <button type="button" className="text-primary text-sm underline-offset-4 hover:underline" onClick={() => setShowPreorder((v) => !v)}>
              {showPreorder ? "Hide pre-order" : "+ Pre-order dishes so they are ready when you arrive"}
            </button>
            {showPreorder && (
              <div className="mt-4 grid max-h-64 gap-2 overflow-y-auto pr-2 sm:grid-cols-2">
                {menu.map((m) => (
                  <div key={m.menuItemId} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 px-3 py-2 text-sm">
                    <span className="truncate">{m.name}</span>
                    <Input
                      type="number"
                      min={0}
                      max={20}
                      value={preorder[m.menuItemId] ?? 0}
                      onChange={(e) => setPreorder((p) => ({ ...p, [m.menuItemId]: Number(e.target.value) }))}
                      className={cn(field, "h-8 w-16")}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <Button type="submit" disabled={pending} className="uppercase tracking-widest h-12 w-full xl:w-auto xl:px-10 xl:self-end">
          {pending ? "Booking..." : "Book a table"}
        </Button>
      </div>
    </form>
  );
}
