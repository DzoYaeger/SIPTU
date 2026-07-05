<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

use Illuminate\Support\Facades\Schedule;
use App\Console\Commands\CheckOverdueBmnLoans;
use App\Console\Commands\CheckDueTodayBmnLoans;
use App\Console\Commands\AutoResolveItHelpdeskTickets;
use App\Console\Commands\SendDailyExitPermitSummary;
use App\Console\Commands\ResetQueueDaily;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command(CheckOverdueBmnLoans::class)
    ->dailyAt('08:00')
    ->timezone('Asia/Makassar')
    ->withoutOverlapping();

Schedule::command(CheckDueTodayBmnLoans::class)
    ->dailyAt('16:00')
    ->timezone('Asia/Makassar')
    ->withoutOverlapping();

Schedule::command(AutoResolveItHelpdeskTickets::class)
    ->hourly()
    ->timezone('Asia/Makassar')
    ->withoutOverlapping();

Schedule::command(SendDailyExitPermitSummary::class)
    ->dailyAt('16:00')
    ->timezone('Asia/Makassar')
    ->withoutOverlapping();

Schedule::command(ResetQueueDaily::class)
    ->dailyAt('00:00')
    ->timezone('Asia/Makassar')
    ->withoutOverlapping();
