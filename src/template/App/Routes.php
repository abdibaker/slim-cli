// --------------- {{pluralName}} Routes ---------------- //
$app->group('/{{routeName}}', function ($app) {
  ${{routeName}} = 'App\Controller\{{pluralName}}Controller:';

  $app->get('', "{${{routeName}}}getAll");
  $app->post('', "{${{routeName}}}create");
  $app->get('/{{{primaryKeyColumnName}}}', "{${{routeName}}}getOne");
  $app->put('/{{{primaryKeyColumnName}}}', "{${{routeName}}}update");
  $app->delete('/{{{primaryKeyColumnName}}}', "{${{routeName}}}delete");
})->add($authMiddleware);