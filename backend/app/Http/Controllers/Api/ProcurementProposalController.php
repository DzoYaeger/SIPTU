<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PdttItem;
use App\Models\PdttItemPrice;
use App\Models\ProcurementProposal;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProcurementProposalController extends Controller
{
    private const LOCK_TIMEOUT_SECONDS = 120;

    public function index(Request $request)
    {
        $this->clearStaleLocks();

        $rows = ProcurementProposal::query()
            ->with(['creator:id,name', 'editor:id,name', 'convertedPdttItem:id,item_name'])
            ->orderByDesc('updated_at')
            ->get()
            ->map(fn(ProcurementProposal $item) => $this->transform($item))
            ->values();

        return response()->json(['data' => $rows]);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $payload = $request->validate([
            'item_name' => ['required', 'string', 'max:255'],
            'brand' => ['nullable', 'string', 'max:255'],
            'satuan' => ['nullable', 'in:Ml,Liter,Buah,Papan,Botol,Gram,Kapsul'],
            'jumlah' => ['nullable', 'numeric', 'min:1'],
        ]);

        $item = ProcurementProposal::create([
            'item_name' => $payload['item_name'],
            'brand' => $payload['brand'] ?? null,
            'satuan' => $payload['satuan'] ?? null,
            'jumlah' => $payload['jumlah'] ?? null,
            'status' => 'pending',
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        return response()->json([
            'message' => 'Usulan pengadaan berhasil ditambahkan.',
            'data' => $this->transform($item->fresh(['creator:id,name', 'editor:id,name', 'convertedPdttItem:id,item_name'])),
        ], 201);
    }

    public function update(Request $request, string $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $item = ProcurementProposal::findOrFail($id);
        if (!$this->canEdit($item, (int) $user->id)) {
            return response()->json(['message' => 'Data sedang diedit oleh pengguna lain.'], 409);
        }

        $payload = $request->validate([
            'item_name' => ['required', 'string', 'max:255'],
            'brand' => ['nullable', 'string', 'max:255'],
            'satuan' => ['nullable', 'in:Ml,Liter,Buah,Papan,Botol,Gram,Kapsul'],
            'jumlah' => ['nullable', 'numeric', 'min:1'],
        ]);

        $item->update([
            'item_name' => $payload['item_name'],
            'brand' => $payload['brand'] ?? null,
            'satuan' => $payload['satuan'] ?? null,
            'jumlah' => $payload['jumlah'] ?? null,
            'updated_by' => $user->id,
            'editing_by' => null,
            'editing_heartbeat_at' => null,
        ]);

        return response()->json([
            'message' => 'Usulan pengadaan berhasil diperbarui.',
            'data' => $this->transform($item->fresh(['creator:id,name', 'editor:id,name', 'convertedPdttItem:id,item_name'])),
        ]);
    }

    public function destroy(Request $request, string $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $item = ProcurementProposal::findOrFail($id);
        if (!$this->canEdit($item, (int) $user->id)) {
            return response()->json(['message' => 'Data sedang diedit oleh pengguna lain sehingga tidak dapat dihapus.'], 409);
        }

        $item->delete();

        return response()->json([
            'message' => 'Usulan pengadaan berhasil dihapus.',
        ]);
    }

    public function lock(Request $request, string $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $item = ProcurementProposal::findOrFail($id);
        $this->releaseIfStale($item);

        if ($item->editing_by && (int) $item->editing_by !== (int) $user->id) {
            return response()->json([
                'message' => 'Data sedang diedit oleh pengguna lain.',
                'data' => $this->transform($item->fresh(['creator:id,name', 'editor:id,name', 'convertedPdttItem:id,item_name'])),
            ], 409);
        }

        $item->update([
            'editing_by' => $user->id,
            'editing_heartbeat_at' => now(),
        ]);

        return response()->json([
            'message' => 'Lock edit aktif.',
            'data' => $this->transform($item->fresh(['creator:id,name', 'editor:id,name', 'convertedPdttItem:id,item_name'])),
        ]);
    }

    public function unlock(Request $request, string $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $item = ProcurementProposal::findOrFail($id);
        if ((int) $item->editing_by === (int) $user->id) {
            $item->update([
                'editing_by' => null,
                'editing_heartbeat_at' => null,
            ]);
        }

        return response()->json([
            'message' => 'Lock edit dilepas.',
            'data' => $this->transform($item->fresh(['creator:id,name', 'editor:id,name', 'convertedPdttItem:id,item_name'])),
        ]);
    }

    public function submitPrice(Request $request, string $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $proposal = ProcurementProposal::findOrFail($id);
        $payload = $request->validate([
            'price' => ['required', 'numeric', 'min:0'],
            'period' => ['required', 'date_format:Y-m'],
        ]);
        $period = Carbon::createFromFormat('Y-m', $payload['period'])->startOfMonth();

        DB::transaction(function () use ($proposal, $payload, $period, $user) {
            $pdttItem = null;
            if ($proposal->converted_pdtt_item_id) {
                $pdttItem = PdttItem::find($proposal->converted_pdtt_item_id);
            }

            if (!$pdttItem) {
                $pdttItem = PdttItem::create([
                    'item_name' => $proposal->item_name,
                    'brand' => $proposal->brand,
                    'satuan' => $proposal->satuan,
                    'jumlah' => $proposal->jumlah,
                    'created_by' => $user->id,
                ]);
            } else {
                $pdttItem->update([
                    'item_name' => $proposal->item_name,
                    'brand' => $proposal->brand,
                    'satuan' => $proposal->satuan,
                    'jumlah' => $proposal->jumlah,
                ]);
            }

            PdttItemPrice::updateOrCreate(
                [
                    'pdtt_item_id' => $pdttItem->id,
                    'period_start' => $period->toDateString(),
                ],
                [
                    'price' => $payload['price'],
                    'updated_by' => $user->id,
                ]
            );

            $proposal->update([
                'status' => 'processed',
                'converted_pdtt_item_id' => $pdttItem->id,
                'converted_at' => now(),
                'updated_by' => $user->id,
                'editing_by' => null,
                'editing_heartbeat_at' => null,
            ]);
        });

        return response()->json([
            'message' => 'Usulan berhasil dimasukkan ke data PDTT beserta harga periodenya.',
            'data' => $this->transform($proposal->fresh(['creator:id,name', 'editor:id,name', 'convertedPdttItem:id,item_name'])),
        ]);
    }

    private function canEdit(ProcurementProposal $item, int $userId): bool
    {
        $this->releaseIfStale($item);
        return !$item->editing_by || (int) $item->editing_by === $userId;
    }

    private function releaseIfStale(ProcurementProposal $item): void
    {
        if (!$item->editing_by || !$item->editing_heartbeat_at) {
            return;
        }

        $diff = Carbon::parse($item->editing_heartbeat_at)->diffInSeconds(now());
        if ($diff > self::LOCK_TIMEOUT_SECONDS) {
            $item->editing_by = null;
            $item->editing_heartbeat_at = null;
            $item->save();
        }
    }

    private function clearStaleLocks(): void
    {
        ProcurementProposal::query()
            ->whereNotNull('editing_by')
            ->whereNotNull('editing_heartbeat_at')
            ->where('editing_heartbeat_at', '<', now()->subSeconds(self::LOCK_TIMEOUT_SECONDS))
            ->update([
                'editing_by' => null,
                'editing_heartbeat_at' => null,
            ]);
    }

    private function transform(ProcurementProposal $item): array
    {
        $lockedByOther = (bool) $item->editing_by;
        return [
            'id' => $item->id,
            'item_name' => $item->item_name,
            'brand' => $item->brand,
            'satuan' => $item->satuan,
            'jumlah' => $item->jumlah,
            'created_by' => $item->created_by,
            'created_by_name' => $item->creator?->name,
            'updated_at' => $item->updated_at,
            'editing_by' => $item->editing_by,
            'editing_by_name' => $item->editor?->name,
            'editing_heartbeat_at' => $item->editing_heartbeat_at,
            'is_locked' => $lockedByOther,
            'status' => $item->status,
            'converted_pdtt_item_id' => $item->converted_pdtt_item_id,
            'converted_pdtt_item_name' => $item->convertedPdttItem?->item_name,
            'converted_at' => $item->converted_at,
        ];
    }
}
