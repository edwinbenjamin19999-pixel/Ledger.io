import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AutomationCommandCenter } from "./AutomationCommandCenter";

interface AutomationDashboardProps { companyId: string;
}

export const AutomationDashboard = ({ companyId }: AutomationDashboardProps) => { return <AutomationCommandCenter companyId={companyId} />;
};
