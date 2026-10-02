"use client";

import { useCallback, useState } from "react";
import { CalendarDays } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import { Label } from "@/shared/ui/primitives/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/primitives/popover";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/shared/ui/primitives/sheet";
import { Calendar, type CalendarProps } from "@/shared/ui/primitives/calendar";
import { useIsMobile } from "@/shared/ui/use-mobile";
import { fmtPtBrFromYmd, fromYmdLocal } from "@/shared/date-period/date-period-presets";

interface DateFieldProps {
  label: string;
  value: string;
  title: string;
  disabled?: CalendarProps["disabled"];
  onSelect: (date?: Date) => void;
}

/** Campo de data com popover (desktop) ou sheet inferior (mobile) — igual ao `ReceitasPage.tsx` do legado. */
export function DateField({ label, value, title, disabled, onSelect }: DateFieldProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const selectedDate = fromYmdLocal(value);

  const handleSelect = useCallback(
    (date?: Date) => {
      if (!date) return;
      onSelect(date);
      setOpen(false);
    },
    [onSelect],
  );

  const trigger = (
    <Button variant="outline" className="h-11 w-full justify-start gap-2 font-normal sm:w-[170px]">
      <CalendarDays className="h-4 w-4 shrink-0" aria-hidden />
      <span className="truncate">{fmtPtBrFromYmd(value)}</span>
    </Button>
  );

  const calendar = (
    <Calendar
      mode="single"
      selected={selectedDate}
      onSelect={handleSelect}
      disabled={disabled}
      initialFocus
      className={isMobile ? "w-full p-0 pointer-events-auto" : "p-3 pointer-events-auto"}
    />
  );

  return (
    <div className="w-full space-y-1.5 sm:w-auto">
      <Label>{label}</Label>
      {isMobile ? (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>{trigger}</SheetTrigger>
          <SheetContent side="bottom" className="max-h-[92dvh] rounded-t-2xl border-border bg-card p-0">
            <SheetHeader className="border-b border-border px-4 py-4 pr-12 text-left">
              <SheetTitle className="text-base">{title}</SheetTitle>
              <SheetDescription>{fmtPtBrFromYmd(value)}</SheetDescription>
            </SheetHeader>
            <div className="overflow-y-auto px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">{calendar}</div>
          </SheetContent>
        </Sheet>
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>{trigger}</PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start" collisionPadding={12}>
            {calendar}
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
