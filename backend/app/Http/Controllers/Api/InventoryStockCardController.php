<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InventoryStockCard;
use App\Models\Inventory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class InventoryStockCardController extends Controller
{
    public function index(Request $request)
    {
        $query = InventoryStockCard::with(['inventory', 'creator']);

        if ($request->has('inventory_id')) {
            $query->where('inventory_id', $request->inventory_id);
        }

        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        if ($request->has('source')) {
            $query->where('source', $request->source);
        }

        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->whereHas('inventory', function ($q) use ($search) {
                $q->where('name', 'LIKE', "%{$search}%")
                  ->orWhere('code', 'LIKE', "%{$search}%");
            })->orWhere('reference_number', 'LIKE', "%{$search}%")
              ->orWhere('notes', 'LIKE', "%{$search}%");
        }

        $query->orderBy('transaction_date', 'desc')->orderBy('id', 'desc');

        $page = $request->get('page', 1);
        $pageSize = $request->get('pageSize', 10);

        $cards = $query->paginate($pageSize, ['*'], 'page', $page);

        // Map data safely and directly include nested attributes
        $mappedData = collect($cards->items())->map(function ($card) {
            return array_merge($card->toArray(), [
                'inventory_name' => $card->inventory ? $card->inventory->name : '-',
                'inventory_code' => $card->inventory ? $card->inventory->code : '-',
            ]);
        });

        return response()->json([
            'data' => $mappedData,
            'meta' => [
                'total' => $cards->total(),
                'page' => $cards->currentPage(),
                'last_page' => $cards->lastPage(),
            ]
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'inventory_id' => 'required|exists:inventories,id',
            'type' => 'required|in:masuk,keluar',
            'source' => 'required|string|max:50',
            'quantity' => 'required|integer|min:1',
            'transaction_date' => 'required|date',
            'reference_number' => 'nullable|string|max:100',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $inventory = Inventory::findOrFail($request->inventory_id);
        $stockBefore = $inventory->quantity;
        
        $quantity = $request->quantity;
        $stockAfter = $request->type === 'masuk' 
            ? $stockBefore + $quantity 
            : $stockBefore - $quantity;

        if ($stockAfter < 0) {
            return response()->json(['message' => 'Stok tidak mencukupi.'], 400);
        }

        // Update inventory
        $inventory->update([
            'quantity' => $stockAfter,
            'status' => $stockAfter <= 0 ? 'habis' : 'tersedia',
        ]);

        $createdByName = 'Admin';
        if (auth()->check() && auth()->user()) {
            $createdByName = auth()->user()->name;
        }

        // Create stock card
        $stockCard = InventoryStockCard::create(array_merge(
            $validator->validated(),
            [
                'stock_before' => $stockBefore,
                'stock_after' => $stockAfter,
                'created_by' => auth()->id(),
                'created_by_name' => $createdByName,
            ]
        ));

        // Format for response
        $responseCard = array_merge($stockCard->toArray(), [
            'inventory_name' => $inventory->name,
            'inventory_code' => $inventory->code,
        ]);

        return response()->json($responseCard, 201);
    }
}
