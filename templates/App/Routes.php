  // --------------- {{className}} Routes ---------------- //
  $app->group('/{{routeName}}', function ($app) {
    ${{classNameLowFirst}} = 'App\Controller\{{className}}Controller:';

    $app->get('', "{${{classNameLowFirst}}}getAll");
    $app->post('', "{${{classNameLowFirst}}}create");
    $app->get('/{{{primaryKeyColumnName}}}', "{${{classNameLowFirst}}}getOne");
    $app->put('/{{{primaryKeyColumnName}}}', "{${{classNameLowFirst}}}update");
    $app->delete('/{{{primaryKeyColumnName}}}', "{${{classNameLowFirst}}}delete");
  })->add($authMiddleware);