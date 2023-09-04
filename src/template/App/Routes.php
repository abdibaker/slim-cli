// --------------- {{pluralName}} Routes ---------------- //
${{pluralNameLowFirst}} = 'App\Controller\{{pluralName}}Controller:';

$app->get('/{{pluralNameLowFirst}}', "{${{pluralNameLowFirst}}}getAll");
$app->post('/{{pluralNameLowFirst}}', "{${{pluralNameLowFirst}}}create");
$app->get('/{{pluralNameLowFirst}}/{{{primaryKeyColumnName}}}', "{${{pluralNameLowFirst}}}getOne");
$app->put('/{{pluralNameLowFirst}}/{{{primaryKeyColumnName}}}', "{${{pluralNameLowFirst}}}update");
$app->delete('/{{pluralNameLowFirst}}/{{{primaryKeyColumnName}}}', "{${{pluralNameLowFirst}}}delete");