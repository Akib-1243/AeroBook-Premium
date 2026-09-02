<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return redirect()->away('http://127.0.0.1:5173/login');
});
