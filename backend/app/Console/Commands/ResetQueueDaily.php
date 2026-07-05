<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\QueueDisplay;

class ResetQueueDaily extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'queue:reset-daily';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Reset TV queue numbers to 0 automatically every day';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        QueueDisplay::query()->update(['current_number' => 0]);
        $this->info('All queue counters have been reset to 0.');
    }
}
