// Per-row "⋮" client actions menu for the AdvisorClients table.

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Mail, FileUp, Clock, StickyNote } from "lucide-react";
import {
  SendReminderDialog,
  RequestDocumentsDialog,
  LogTimeDialog,
  InternalNoteDialog,
} from "./WLClientActionDialogs";

interface Props {
  companyId: string;
  companyName: string;
  contactEmail?: string | null;
}

type DlgKind = null | "reminder" | "request" | "time" | "note";

export function WLClientRowMenu({ companyId, companyName, contactEmail }: Props) {
  const [dlg, setDlg] = useState<DlgKind>(null);
  const client = { companyId, companyName, contactEmail };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            onClick={(e) => e.stopPropagation()}
            className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-[#F1F5F9] text-[#64748B]"
            aria-label="Klientåtgärder"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onClick={() => setDlg("reminder")}>
            <Mail className="h-3.5 w-3.5 mr-2" /> Skicka påminnelse
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setDlg("request")}>
            <FileUp className="h-3.5 w-3.5 mr-2" /> Begär underlag
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setDlg("time")}>
            <Clock className="h-3.5 w-3.5 mr-2" /> Logga tid
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setDlg("note")}>
            <StickyNote className="h-3.5 w-3.5 mr-2" /> Öppna anteckning
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {dlg === "reminder" && (
        <SendReminderDialog open onOpenChange={(v) => !v && setDlg(null)} client={client} />
      )}
      {dlg === "request" && (
        <RequestDocumentsDialog open onOpenChange={(v) => !v && setDlg(null)} client={client} />
      )}
      {dlg === "time" && (
        <LogTimeDialog open onOpenChange={(v) => !v && setDlg(null)} client={client} />
      )}
      {dlg === "note" && (
        <InternalNoteDialog open onOpenChange={(v) => !v && setDlg(null)} client={client} />
      )}
    </>
  );
}
