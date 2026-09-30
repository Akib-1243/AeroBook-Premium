<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $airlines = [
            'Air Astra Bangladesh' => 'AIR-ASTRA',
            'Novoair' => 'NOVAIR',
            'US-Bangla Airlines' => 'US-BANGLA',
        ];

        foreach ($airlines as $name => $code) {
            DB::table('airline_companies')->updateOrInsert(
                ['code' => $code],
                ['name' => $name, 'created_at' => now(), 'updated_at' => now()]
            );
        }

        $companyIds = DB::table('airline_companies')
            ->whereIn('code', array_values($airlines))
            ->pluck('id', 'code');

        foreach ($airlines as $name => $code) {
            DB::table('flights')->where('airline', $name)->update([
                'airline_company_id' => $companyIds[$code],
            ]);
        }
    }

    public function down(): void
    {
        $partnerCompanyId = DB::table('airline_companies')->where('code', 'PARTNER-AIR')->value('id');
        $demoCompanyIds = DB::table('airline_companies')
            ->whereIn('code', ['AIR-ASTRA', 'NOVAIR', 'US-BANGLA'])
            ->pluck('id');

        if ($partnerCompanyId && $demoCompanyIds->isNotEmpty()) {
            DB::table('flights')->whereIn('airline_company_id', $demoCompanyIds)->update([
                'airline_company_id' => $partnerCompanyId,
            ]);
        }
    }
};