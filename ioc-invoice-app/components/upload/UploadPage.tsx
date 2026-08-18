"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { PageTitle } from "@/components/layout/PageTitle";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InvoiceUploadSection } from "./InvoiceUploadSection";
import { PeriodSelector } from "./PeriodSelector";
import { getMonthDateRange, type DatePeriod } from "@/lib/invoices/period-utils";

interface ExtractionConfig {
  claudeConfigured: boolean;
  defaultMode: "claude";
  providerLabel: string;
  serviceRoleConfigured: boolean;
}

export function UploadPage() {
  const now = new Date();
  const [period, setPeriod] = useState<DatePeriod>(() =>
    getMonthDateRange(now.getFullYear(), now.getMonth() + 1)
  );

  const { data: extractionConfig } = useQuery<ExtractionConfig>({
    queryKey: ["extraction-config"],
    queryFn: () => fetch("/api/settings/extraction").then((r) => r.json()),
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <PageTitle>Upload IOC Invoice PDFs</PageTitle>
        <p className="mt-2 text-sm text-ioc-muted">
          Drag and drop or browse to upload invoice PDFs for a selected period.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Extraction
          </CardTitle>
          <CardDescription>
            Automatically extract invoice data from PDFs using Claude API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            {extractionConfig?.claudeConfigured ? (
              <Badge variant="success">Claude API connected</Badge>
            ) : (
              <Badge variant="warning">Claude API key not configured</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            PDFs are extracted with Claude API. Already-extracted PDFs skip the API.
          </p>
        </CardContent>
      </Card>

      <InvoiceUploadSection
        title="Bulk Upload"
        description="Upload many invoice PDFs for a past or current month, year, or date range. Invoice dates must fall within the selected period."
        period={period}
        extractionConfig={extractionConfig}
        periodSelector={<PeriodSelector onChange={setPeriod} />}
      />
    </div>
  );
}
