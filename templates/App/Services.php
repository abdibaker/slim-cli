$container['{{classNameLowFirst}}Service'] = static function (Pimple\Container $container): App\Service\{{className}}Service {
    return new App\Service\{{className}}Service($container['db']);
};
