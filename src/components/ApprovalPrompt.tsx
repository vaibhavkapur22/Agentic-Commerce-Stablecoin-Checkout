"use client";

import { PurchaseRequest } from "@/lib/types";

interface Props {
  purchase: PurchaseRequest;
  onRespond: (response: "approve" | "deny") => void;
  loading: boolean;
}

export default function ApprovalPrompt({ purchase, onRespond, loading }: Props) {
  return (
    <div className="flex justify-start mb-3">
      <div className="max-w-[85%] rounded-xl bg-zinc-800 border border-orange-500/30 p-4">
        <div className="flex gap-3">
          <button
            onClick={() => onRespond("approve")}
            disabled={loading}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors"
          >
            {loading ? "Processing..." : "Approve Payment"}
          </button>
          <button
            onClick={() => onRespond("deny")}
            disabled={loading}
            className="flex-1 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-zinc-200 font-medium py-2.5 px-4 rounded-lg text-sm transition-colors"
          >
            Deny
          </button>
        </div>
        <p className="text-[10px] text-zinc-500 mt-2 text-center">
          Purchase ID: {purchase.purchase_id}
        </p>
      </div>
    </div>
  );
}
