<?php

declare(strict_types=1);

// --------------- Home Routes ---------------- //
$homeController = 'App\Controller\Home:';

$app->get('/', "{$homeController}api");
$app->get('/swagger', "{$homeController}swagger");
$app->get('/api', "{$homeController}getHelp");
$app->get('/status', "{$homeController}getStatus");