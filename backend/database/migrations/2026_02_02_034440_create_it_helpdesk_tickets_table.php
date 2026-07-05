<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('it_helpdesk_tickets', function (Blueprint $table) {
            $table->id();
            $table->string('ticket_number')->unique(); // Unique ticket identifier
            $table->foreignId('employee_id')->constrained('employees')->onDelete('cascade');
            $table->string('employee_name'); // Store employee name separately for historical reference
            $table->string('function_area')->nullable(); // Function/area of the employee
            $table->enum('report_type', ['hardware', 'software', 'network', 'other'])->default('other');
            $table->text('problem_details');
            $table->date('report_date');
            $table->json('reporter_signature')->nullable(); // Digital signature of reporter
            $table->enum('status', ['open', 'in_progress', 'completed'])->default('open');
            $table->text('followup_details')->nullable(); // Details of follow-up action
            $table->date('completion_date')->nullable();
            $table->json('it_staff_signature')->nullable(); // Digital signature of IT staff
            $table->foreignId('it_staff_id')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('it_helpdesk_tickets');
    }
};
