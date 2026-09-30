<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('aircraft', function (Blueprint $table): void {
            $table->foreignId('airline_company_id')->nullable()->constrained('airline_companies')->nullOnDelete();
        });

        $partnerCompanyId = DB::table('airline_companies')->where('code', 'PARTNER-AIR')->value('id');
        if ($partnerCompanyId) {
            DB::table('aircraft')->whereNull('airline_company_id')->update([
                'airline_company_id' => $partnerCompanyId,
            ]);
        }

        Schema::table('aircraft', function (Blueprint $table): void {
            $table->unique(['airline_company_id', 'model']);
        });
    }

    public function down(): void
    {
        Schema::table('aircraft', function (Blueprint $table): void {
            $table->dropUnique(['airline_company_id', 'model']);
            $table->dropConstrainedForeignId('airline_company_id');
        });
    }
};
