"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ms } from "@/constants/ms";

interface VenueRow {
  id: string;
  nama: string;
  facilityCount: number;
}

export function VenueListDrawer({ venues }: { venues: VenueRow[] }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">{ms.aset.dashboard.senaraiPremisButang}</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{ms.aset.dashboard.senaraiPremisTajuk}</SheetTitle>
        </SheetHeader>
        <ul className="mt-4 flex flex-col gap-1">
          {venues.map((v) => (
            <li key={v.id}>
              <Link
                href={`/aset/premis/${v.id}`}
                className="flex items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-muted"
              >
                <span>{v.nama}</span>
                <span className="text-muted-foreground">
                  {ms.aset.dashboard.senaraiPremisFasiliti(v.facilityCount)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
