<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\IOFactory;

class EmployeeController extends Controller
{
    private const DEFAULT_PASSWORD = '1@Palopo@1';
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = Employee::with(['kgbRecords' => function($query) {
            $query->orderBy('tmt_sk', 'desc');
        }]);

        // Search functionality
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'LIKE', "%{$search}%")
                  ->orWhere('nip', 'LIKE', "%{$search}%")
                  ->orWhere('position', 'LIKE', "%{$search}%")
                  ->orWhere('department', 'LIKE', "%{$search}%");
            });
        }

        // Filtering by department
        if ($request->has('department') && $request->department) {
            $query->where('department', $request->department);
        }

        // Filtering by function area
        if ($request->has('function_area') && $request->function_area) {
            $query->where('function_area', $request->function_area);
        }

        // Filtering by status
        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        // Pagination
        $page = $request->get('page', 1);
        $pageSize = $request->get('pageSize', 10);

        $employees = $query->paginate($pageSize, ['*'], 'page', $page);

        return response()->json([
            'data' => $employees->items(),
            'meta' => [
                'total' => $employees->total(),
                'page' => $employees->currentPage(),
                'last_page' => $employees->lastPage(),
            ]
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'nip' => 'required|string|unique:employees,nip|unique:users,nip',
            'name' => 'required|string|max:255',
            'pangkat' => 'nullable|string|max:100',
            'position' => 'nullable|string|max:100',
            'department' => 'nullable|string|max:100',
            'function_area' => 'nullable|in:Tata Usaha,Pemeriksaan dan Sertifikasi,Infokom,Penindakan,Pengujian',
            'phone_number' => 'nullable|string|max:15',
            'hire_date' => 'nullable|date',
            'status' => 'nullable|in:active,inactive',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $employee = Employee::create($validator->validated());

        // Create a user account for the employee with NIP as username and default password
        $user = User::create([
            'nip' => $employee->nip,
            'name' => $employee->name,
            'email' => null, // Initially no email
            'password' => Hash::make(self::DEFAULT_PASSWORD), // Default password
            'phone_number' => $employee->phone_number,
            'base_role' => 'operator', // Default role
            'available_roles' => ['operator'],
            'role_modules' => [],
            'modules' => [],
            'module_permissions' => [],
        ]);

        // Link the employee to the user
        $employee->update(['user_id' => $user->id]);

        \App\Services\ActivityLogger::log('create', 'kepegawaian', "Menambahkan pegawai {$employee->name} ({$employee->nip})", null, $employee);

        return response()->json($employee, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $employee = Employee::with(['user', 'kgbRecords' => function($query) {
            $query->orderBy('tmt_sk', 'desc');
        }])->findOrFail($id);
        return response()->json($employee);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $employee = Employee::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'nip' => 'required|string|unique:employees,nip,' . $id . '|unique:users,nip,' . $employee->user_id . ',id',
            'name' => 'required|string|max:255',
            'pangkat' => 'nullable|string|max:100',
            'position' => 'nullable|string|max:100',
            'department' => 'nullable|string|max:100',
            'function_area' => 'nullable|in:Tata Usaha,Pemeriksaan dan Sertifikasi,Infokom,Penindakan,Pengujian',
            'phone_number' => 'nullable|string|max:15',
            'hire_date' => 'nullable|date',
            'status' => 'nullable|in:active,inactive',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $employee->update($validator->validated());

        // Update the associated user if exists
        if ($employee->user) {
            $employee->user->update([
                'nip' => $employee->nip,
                'name' => $employee->name,
                'phone_number' => $employee->phone_number,
            ]);
        }

        \App\Services\ActivityLogger::log('update', 'kepegawaian', "Mengubah data pegawai {$employee->name} ({$employee->nip})", null, $employee);

        return response()->json($employee);
    }

    /**
     * Update phone number only.
     */
    public function updatePhone(Request $request, string $id)
    {
        $employee = Employee::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'phone_number' => 'nullable|string|max:20',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $normalized = $this->normalizePhone($validator->validated()['phone_number'] ?? null);

        $employee->update([
            'phone_number' => $normalized,
        ]);

        if ($employee->user) {
            $employee->user->update([
                'phone_number' => $normalized,
            ]);
        }

        return response()->json($employee);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $employee = Employee::findOrFail($id);

        $name = $employee->name;
        $nip = $employee->nip;

        // Delete the associated user if exists
        if ($employee->user) {
            $employee->user->delete();
        }

        $employee->delete();
        
        \App\Services\ActivityLogger::log('delete', 'kepegawaian', "Menghapus data pegawai {$name} ({$nip})");

        return response()->json(['message' => 'Employee deleted successfully']);
    }

    private function normalizePhone(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }
        $clean = preg_replace('/[^0-9+]/', '', $value);
        if ($clean === '' || $clean === null) {
            return null;
        }
        if (str_starts_with($clean, '0')) {
            $clean = '+62' . substr($clean, 1);
        } elseif (str_starts_with($clean, '62')) {
            $clean = '+' . $clean;
        }
        if (!str_starts_with($clean, '+')) {
            $clean = '+' . $clean;
        }
        return $clean;
    }

    /**
     * Search employees (public endpoint for Exit Permit tagging).
     */
    public function publicSearch(Request $request)
    {
        $query = Employee::select('id', 'nip', 'name', 'function_area')
            ->where('status', 'active');
        
        if ($request->has('q') && $request->q) {
            $search = $request->q;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'LIKE', "%{$search}%")
                  ->orWhere('nip', 'LIKE', "%{$search}%");
            });
        }
        
        // Limit to 20 results to avoid massive payload
        $employees = $query->limit(20)->get();
        
        return response()->json($employees);
    }

    /**
     * Download an Excel template for Employee Import
     */
    public function template()
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        
        // Define Header
        $sheet->setCellValue('A1', 'NIP');
        $sheet->setCellValue('B1', 'Name');
        
        // Setup stylistic options (optional)
        $headerStyle = [
            'font' => ['bold' => true],
            'fill' => ['fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID, 'color' => ['argb' => 'FFEFEFEF']]
        ];
        $sheet->getStyle('A1:B1')->applyFromArray($headerStyle);
        $sheet->getColumnDimension('A')->setWidth(25);
        $sheet->getColumnDimension('B')->setWidth(35);

        // Dummy data for example
        $sheet->setCellValue('A2', '199001012020121001');
        $sheet->setCellValue('B2', 'John Doe');

        $writer = new Xlsx($spreadsheet);
        $fileName = 'Template_Pegawai_Import.xlsx';
        $tempFile = tempnam(sys_get_temp_dir(), $fileName);
        $writer->save($tempFile);

        return response()->download($tempFile, $fileName)->deleteFileAfterSend(true);
    }

    /**
     * Import multiple Employees from an Excel file
     */
    public function import(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'file' => 'required|file|mimes:xlsx,xls'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $file = $request->file('file');
            $spreadsheet = IOFactory::load($file->getRealPath());
            $sheet = $spreadsheet->getActiveSheet();
            $rows = $sheet->toArray();
            
            // Remove header row
            array_shift($rows);

            DB::beginTransaction();

            $importedCount = 0;
            $updatedCount = 0;
            
            foreach ($rows as $row) {
                $nip = trim($row[0] ?? '');
                $name = trim($row[1] ?? '');

                if (empty($nip) || empty($name)) {
                    continue; // Skip invalid rows
                }

                // Try to find the existing employee by NIP
                $employee = Employee::where('nip', $nip)->first();

                if ($employee) {
                    $employee->update([
                        'name' => $name,
                    ]);
                    
                    if ($employee->user) {
                        $employee->user->update([
                            'name' => $name,
                        ]);
                    }
                    
                    $updatedCount++;
                } else {
                    $employee = Employee::create([
                        'nip' => $nip,
                        'name' => $name,
                        'status' => 'active',
                    ]);

                    // Check if User already exists (just in case)
                    $user = User::where('nip', $nip)->first();
                    if (!$user) {
                        $user = User::create([
                            'nip' => $nip,
                            'name' => $name,
                            'password' => Hash::make(self::DEFAULT_PASSWORD),
                            'base_role' => 'operator',
                            'available_roles' => ['operator'],
                            'role_modules' => [],
                            'modules' => [],
                            'module_permissions' => [],
                        ]);
                    }

                    $employee->update(['user_id' => $user->id]);
                    $importedCount++;
                }
            }

            DB::commit();

            \App\Services\ActivityLogger::log('import', 'kepegawaian', "Mengimpor masal data pegawai. Berhasil tambah: $importedCount, Ubah: $updatedCount");

            return response()->json([
                'message' => 'Import successful.',
                'imported' => $importedCount,
                'updated' => $updatedCount
            ]);
            
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to import data.', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Upload photo for a specific employee (Validator/Admin only).
     */
    public function uploadPhoto(Request $request, $id)
    {
        $user = $request->user();

        // Check if user is admin or validator
        if (!$user || !in_array($user->base_role, ['admin', 'validator'])) {
            return response()->json([
                'message' => 'Akses ditolak. Hanya Administrator atau Validator yang dapat mengupload foto pegawai.',
            ], 403);
        }

        $request->validate([
            'photo' => 'required|file|max:2048',
        ]);

        $employee = Employee::findOrFail($id);
        $file = $request->file('photo');
        
        $allowedMimes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
        if (!in_array($file->getMimeType(), $allowedMimes)) {
            return response()->json([
                'message' => 'Format file tidak didukung. Gunakan: PNG, JPG, JPEG, WEBP, GIF',
            ], 422);
        }

        $extension = strtolower($file->getClientOriginalExtension() ?: 'png');
        if ($extension === 'jpeg') $extension = 'jpg';
        $filename = 'avatar-' . $employee->nip . '-' . Str::random(6) . '.' . $extension;

        $publicDir = public_path('storage/photos');
        if (!File::exists($publicDir)) {
            File::makeDirectory($publicDir, 0755, true);
        }

        // Delete old photo if exists
        if ($employee->photo) {
            $oldPath = public_path($employee->photo);
            if (File::exists($oldPath)) {
                File::delete($oldPath);
            }
            // Delete from root public_html if exists
            try {
                $oldRootPath = dirname(base_path()) . '/public_html/' . $employee->photo;
                if (File::exists($oldRootPath)) {
                    File::delete($oldRootPath);
                }
            } catch (\Exception $e) {}
        }

        $file->move($publicDir, $filename);
        $path = 'storage/photos/' . $filename;

        // Copy to root storage for hosting compatibility
        try {
            $rootStorageDir = dirname(base_path()) . '/public_html/storage/photos';
            if (!File::exists($rootStorageDir)) {
                File::makeDirectory($rootStorageDir, 0755, true);
            }
            File::copy($publicDir . '/' . $filename, $rootStorageDir . '/' . $filename);
        } catch (\Exception $e) {}

        // Update employee photo
        $employee->photo = $path;
        $employee->save();

        // If employee has associated queue displays, update their employee_photo too
        try {
            \App\Models\QueueDisplay::where('employee_id', $employee->id)->update(['employee_photo' => $path]);
        } catch (\Exception $e) {}

        \App\Services\ActivityLogger::log('update_employee_photo', 'kepegawaian', "Mengubah foto pegawai: {$employee->name} (NIP: {$employee->nip})");

        return response()->json([
            'message' => 'Foto pegawai berhasil diperbarui.',
            'employee' => $employee,
            'avatar_url' => url('storage/photos/' . $filename),
        ]);
    }
}
