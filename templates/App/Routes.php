  // --------------- {{className}} Routes ---------------- //
  $app->group('/{{routeName}}', function ($app) {
    ${{classNameLowFirst}} = 'App\Controller\{{className}}Controller:';

    $app->get('', "{${{classNameLowFirst}}}getAll");
    $app->post('', "{${{classNameLowFirst}}}create");
    $app->get('/{{{primaryKey}}}', "{${{classNameLowFirst}}}getOne");
    $app->put('/{{{primaryKey}}}', "{${{classNameLowFirst}}}update");
    $app->delete('/{{{primaryKey}}}', "{${{classNameLowFirst}}}delete");
  });