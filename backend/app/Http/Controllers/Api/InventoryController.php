<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Inventory;
use Illuminate\Support\Facades\Validator;

class InventoryController extends Controller
{
    /**
     * Public listing — limited fields only (id, name, unit, quantity).
     */
    public function publicIndex(Request $request)
    {
        $query = Inventory::select('id', 'name', 'unit', 'quantity')
            ->where('quantity', '>', 0);

        if ($request->has('search') && $request->search) {
            $query->where('name', 'LIKE', "%{$request->search}%");
        }

        return response()->json([
            'data' => $query->orderBy('name')->get(),
        ]);
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = Inventory::query();

        // Search functionality
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'LIKE', "%{$search}%")
                  ->orWhere('category', 'LIKE', "%{$search}%")
                  ->orWhere('location', 'LIKE', "%{$search}%");
            });
        }

        // Filtering by category
        if ($request->has('category') && $request->category) {
            $query->where('category', $request->category);
        }

        // Filtering by status
        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        // Pagination
        $page = $request->get('page', 1);
        $pageSize = $request->get('pageSize', 10);

        $inventories = $query->paginate($pageSize, ['*'], 'page', $page);

        return response()->json([
            'data' => $inventories->items(),
            'meta' => [
                'total' => $inventories->total(),
                'page' => $inventories->currentPage(),
                'last_page' => $inventories->lastPage(),
            ]
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'code' => 'nullable|string|max:50|unique:inventories,code',
            'name' => 'required|string|max:255',
            'category' => 'required|string|max:100',
            'quantity' => 'required|integer|min:0',
            'unit' => 'required|string|max:50',
            'location' => 'nullable|string|max:255',
            'price_per_unit' => 'nullable|numeric|min:0',
            'description' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $inventory = Inventory::create(array_merge(
            $validator->validated(),
            [
                'updated_by' => auth()->id(),
                'last_updated' => now()
            ]
        ));

        return response()->json($inventory, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $inventory = Inventory::findOrFail($id);
        return response()->json($inventory);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $inventory = Inventory::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'code' => 'nullable|string|max:50|unique:inventories,code,' . $inventory->id,
            'name' => 'required|string|max:255',
            'category' => 'required|string|max:100',
            'quantity' => 'required|integer|min:0',
            'unit' => 'required|string|max:50',
            'location' => 'nullable|string|max:255',
            'price_per_unit' => 'nullable|numeric|min:0',
            'description' => 'nullable|string',
            'status' => 'nullable|in:tersedia,habis',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $inventory->update(array_merge(
            $validator->validated(),
            [
                'updated_by' => auth()->id(),
                'last_updated' => now()
            ]
        ));

        return response()->json($inventory);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $inventory = Inventory::findOrFail($id);
        $inventory->delete();

        return response()->json(['message' => 'Inventory item deleted successfully']);
    }
}
