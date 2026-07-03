import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

import { corsHeaders, handleCors } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { companyId } = await req.json();

    if (!companyId) {
      return new Response(
        JSON.stringify({ error: "companyId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log("Cleaning up duplicates for company:", companyId);

    // Find journal entries without journal_entry_lines
    const { data: entriesWithoutLines, error: selectError } = await supabase
      .from("journal_entries")
      .select(`
        id,
        description,
        document_id,
        status
      `)
      .eq("company_id", companyId);

    if (selectError) throw selectError;

    const entriesToDelete = [];
    for (const entry of entriesWithoutLines || []) {
      // Check if entry has any lines
      const { data: lines } = await supabase
        .from("journal_entry_lines")
        .select("id")
        .eq("journal_entry_id", entry.id)
        .limit(1);

      if (!lines || lines.length === 0) {
        entriesToDelete.push(entry.id);
        console.log(`Marking entry ${entry.id} for deletion (no lines)`);
      }
    }

    // Delete entries without lines
    if (entriesToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from("journal_entries")
        .delete()
        .in("id", entriesToDelete);

      if (deleteError) throw deleteError;
    }

    // Find and remove duplicate entries based on content similarity
    const { data: allEntries } = await supabase
      .from("journal_entries")
      .select(`
        id, 
        entry_date, 
        description,
        created_at
      `)
      .eq("company_id", companyId)
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    // Group entries by date + description to find duplicates
    const entryGroups = new Map<string, any[]>();
    for (const entry of allEntries || []) {
      const key = `${entry.entry_date}_${entry.description}`;
      if (!entryGroups.has(key)) {
        entryGroups.set(key, []);
      }
      entryGroups.get(key)!.push(entry);
    }

    const duplicatesToDelete = [];
    for (const [key, entries] of entryGroups) {
      if (entries.length > 1) {
        // Keep the newest, delete the rest
        for (let i = 1; i < entries.length; i++) {
          duplicatesToDelete.push(entries[i].id);
          console.log(`Marking entry ${entries[i].id} as duplicate (${key})`);
        }
      }
    }

    if (duplicatesToDelete.length > 0) {
      // Delete journal_entry_lines first
      await supabase
        .from("journal_entry_lines")
        .delete()
        .in("journal_entry_id", duplicatesToDelete);

      // Then delete journal_entries
      const { error: deleteDuplicatesError } = await supabase
        .from("journal_entries")
        .delete()
        .in("id", duplicatesToDelete);

      if (deleteDuplicatesError) throw deleteDuplicatesError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        deletedEntriesWithoutLines: entriesToDelete.length,
        deletedDuplicates: duplicatesToDelete.length,
        message: `Cleaned up ${entriesToDelete.length} entries without lines and ${duplicatesToDelete.length} duplicates`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in cleanup-duplicates:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
