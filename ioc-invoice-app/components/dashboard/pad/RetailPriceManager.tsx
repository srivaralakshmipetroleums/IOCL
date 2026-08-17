"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import { fetchDashboardJson } from "@/lib/dashboard/fetch";
import { Button } from "@/components/ui/button";

interface RetailPrice {
  id: string;
  product: "MS" | "HSD";
  effective_from: string;
  price_per_litre: number;
  notes: string | null;
}

export function RetailPriceManager() {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [product, setProduct] = useState<"MS" | "HSD">("MS");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [price, setPrice] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const { data: prices = [], isLoading } = useQuery<RetailPrice[]>({
    queryKey: ["retail-prices"],
    queryFn: () => fetchDashboardJson("/api/retail-prices"),
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/retail-prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product,
          effective_from: effectiveFrom,
          price_per_litre: Number(price),
        }),
      });
      if (!res.ok) throw new Error("Failed to save price");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["retail-prices"] });
      queryClient.invalidateQueries({ queryKey: ["pad-summary"] });
      queryClient.invalidateQueries({ queryKey: ["pad-fuel-profit"] });
      setEffectiveFrom("");
      setPrice("");
      setMessage("Price saved.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/retail-prices?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["retail-prices"] });
      queryClient.invalidateQueries({ queryKey: ["pad-summary"] });
      queryClient.invalidateQueries({ queryKey: ["pad-fuel-profit"] });
    },
  });

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/retail-prices/import", { method: "POST", body: form });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Import failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["retail-prices"] });
      queryClient.invalidateQueries({ queryKey: ["pad-summary"] });
      queryClient.invalidateQueries({ queryKey: ["pad-fuel-profit"] });
      setMessage(`Imported ${data.imported} price rows.`);
    },
    onError: (err: Error) => setMessage(err.message),
  });

  return (
    <div className="ioc-card p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-ioc-navy">Retail Selling Prices</h3>
          <p className="text-xs text-ioc-muted">
            Price-change dates for MS and HSD (₹/litre). Used for gross pump profit.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) importMutation.mutate(file);
              e.target.value = "";
            }}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
            disabled={importMutation.isPending}
          >
            <Upload className="h-4 w-4" />
            Import CSV
          </Button>
        </div>
      </div>

      {message && <p className="mb-3 text-sm text-ioc-blue">{message}</p>}

      <div className="mb-4 flex flex-wrap gap-2">
        <select
          value={product}
          onChange={(e) => setProduct(e.target.value as "MS" | "HSD")}
          className="h-10 rounded-[10px] border border-ioc-border px-3 text-sm"
        >
          <option value="MS">MS</option>
          <option value="HSD">HSD</option>
        </select>
        <input
          type="date"
          value={effectiveFrom}
          onChange={(e) => setEffectiveFrom(e.target.value)}
          className="h-10 rounded-[10px] border border-ioc-border px-3 text-sm"
        />
        <input
          type="number"
          step="0.01"
          placeholder="₹/L"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="h-10 w-28 rounded-[10px] border border-ioc-border px-3 text-sm"
        />
        <Button
          size="sm"
          onClick={() => addMutation.mutate()}
          disabled={!effectiveFrom || !price || addMutation.isPending}
        >
          Add / Update
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ioc-border text-left text-ioc-muted">
              <th className="py-2 pr-4">Product</th>
              <th className="py-2 pr-4">Effective From</th>
              <th className="py-2 pr-4">Price (₹/L)</th>
              <th className="py-2 pr-4">Notes</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="py-4 text-ioc-muted">
                  Loading...
                </td>
              </tr>
            ) : prices.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-4 text-ioc-muted">
                  No retail prices yet. Import CSV or add manually.
                </td>
              </tr>
            ) : (
              prices.map((row) => (
                <tr key={row.id} className="border-b border-ioc-border/60">
                  <td className="py-2 pr-4 font-medium">{row.product}</td>
                  <td className="py-2 pr-4">{row.effective_from}</td>
                  <td className="py-2 pr-4">₹{row.price_per_litre.toFixed(2)}</td>
                  <td className="py-2 pr-4 text-ioc-muted">{row.notes ?? "—"}</td>
                  <td className="py-2 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-ioc-error"
                      onClick={() => deleteMutation.mutate(row.id)}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
