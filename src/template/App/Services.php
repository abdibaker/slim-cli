$container['{{pluralNameLowFirst}}Service'] = static function (Pimple\Container $container): App\Service\{{pluralName}}Service {
    return new App\Service\{{pluralName}}Service($container['db']);
};
